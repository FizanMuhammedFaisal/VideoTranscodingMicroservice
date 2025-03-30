import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import fs from 'fs'
import amqplib from 'amqplib'
import Redis from 'ioredis'
import ffmpeg from 'fluent-ffmpeg'

const PROTO_PATH = '../../packages/proto/upload.proto'
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})
const uploadProto = grpc.loadPackageDefinition(packageDefinition).upload

// RabbitMQ & Redis Config
const REDIS_HOST = 'redis'
const RABBITMQ_URL = 'amqp://rabbitmq'
const EXCHANGE_NAME = 'transcode-exchange'
const QUEUE_NAME = 'transcode-queue'
const redisClient = new Redis({
  host: REDIS_HOST,
  port: 6379
})

// RabbitMQ Publisher
async function publishToQueue(videoMetadata) {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()

    const qualities = ['360p', '480p', '720p', '1080p']

    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true })
    await channel.assertQueue(QUEUE_NAME, { durable: true })

    for (const quality of qualities) {
      const task = { ...videoMetadata, quality }
      channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)), {
        persistent: true
      })
      console.log(
        `📢 [RabbitMQ] Task enqueued: ${JSON.stringify(task)} → ${quality}`
      )
    }

    await channel.close()
    await connection.close()
  } catch (err) {
    console.error('❌ [RabbitMQ] Error:', err)
  }
}

// Extract Video Metadata using ffmpeg
function extractMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)

      const { format, streams } = metadata
      const videoStream = streams.find(s => s.codec_type === 'video') || {}
      resolve({
        filePath,
        size: format.size,
        duration: format.duration,
        format: format.format_name,
        resolution: `${videoStream.width}x${videoStream.height}`,
        status: 'uploaded'
      })
    })
  })
}

// Define the Upload Service
const uploadService = {
  UploadVideo: (call, callback) => {
    const filePath = `../../uploads/video_${Date.now()}.mp4`
    const writeStream = fs.createWriteStream(filePath)

    call.on('data', chunk => {
      writeStream.write(chunk.chunk)
    })

    call.on('end', async () => {
      writeStream.end()
      console.log(`✅ Video saved: ${filePath}`)

      // Extract metadata
      try {
        const metadata = await extractMetadata(filePath)

        // Store in Redis
        await redisClient.set(metadata.filePath, JSON.stringify(metadata))
        console.log('✅ [Redis] Metadata stored:', metadata)

        // Publish event to RabbitMQ
        await publishToQueue(metadata)

        callback(null, { message: 'Upload successful!' })
      } catch (error) {
        console.error('❌ [Metadata Extraction] Error:', error)
        callback(error)
      }
    })

    call.on('error', err => {
      console.error('❌ Stream error:', err)
      callback(err)
    })
  }
}

// Start gRPC Server
const server = new grpc.Server()

server.addService(uploadProto.UploadService.service, uploadService)
server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('📡 Upload Service running on port 50051')
  }
)

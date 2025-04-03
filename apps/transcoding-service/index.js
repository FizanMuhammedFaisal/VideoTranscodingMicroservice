import amqp from 'amqplib'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const RABBITMQ_URL = 'amqp://rabbitmq'
const QUEUE_NAME = 'transcode-queue'

// Load gRPC Proto file
const PROTO_PATH = '../../packages/proto/streaming.proto'
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})
const VideoProto =
  grpc.loadPackageDefinition(packageDefinition).StreamingService

// gRPC Client to communicate with Streaming Service
const grpcClient = new VideoProto(
  'streaming-service:50051',
  grpc.credentials.createInsecure()
)

async function startConsumer() {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()
    await channel.assertQueue(QUEUE_NAME, { durable: true })

    console.log('🎥 Transcoder is waiting for tasks...')

    channel.consume(
      QUEUE_NAME,
      async msg => {
        if (msg !== null) {
          const task = JSON.parse(msg.content.toString())
          console.log(`📩 Received task:`, task)

          await transcodeVideo(task)

          // Acknowledge the message after processing
          channel.ack(msg)
          console.log('✅ Task completed & acknowledged.')

          // Notify Streaming Service via gRPC
          notifyStreamingService(
            task.videoId,
            task.quality,
            'ready',
            getOutputPath(task.videoId, task.quality)
          )
        }
      },
      { noAck: false }
    )
  } catch (error) {
    console.error('❌ Error in transcoder:', error)
  }
}

// Function to generate folder paths
const getOutputPath = (videoId, quality) =>
  path.join('../../uploads/hls', videoId, quality, 'index.m3u8')

async function transcodeVideo(task) {
  return new Promise((resolve, reject) => {
    const { videoId, quality, filePath } = task

    // Create directories for storing HLS files
    const outputDir = path.join('../../uploads/hls', videoId, quality)
    fs.mkdirSync(outputDir, { recursive: true }) // Ensure directory exists

    const outputPath = path.join(outputDir, 'index.m3u8')

    console.log(`🔄 Transcoding ${filePath} to HLS format for ${quality}...`)

    const getResolution = quality => {
      const resolutions = {
        '1080p': '1920x1080',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360'
      }
      return resolutions[quality] || '640x360'
    }

    // FFmpeg command for HLS conversion
    // FFmpeg command for HLS conversion
    ffmpeg(filePath)
      .output(outputPath)
      .videoCodec('libx264')
      .size(getResolution(quality))
      .addOption('-preset', 'fast')
      .addOption('-crf', '23')
      .addOption('-sc_threshold', '0')
      .addOption('-g', '48') // Keyframe interval
      .addOption('-keyint_min', '48') // Ensures keyframe interval
      .addOption('-hls_time', '4') // Shorter segment duration (4 seconds)
      .addOption('-hls_list_size', '0') // Keep all segments
      .addOption('-hls_flags', 'independent_segments') // Ensures segment independence
      .addOption('-hls_playlist_type', 'vod') // Treats it as Video-on-Demand
      .addOption('-force_key_frames', 'expr:gte(t,n_forced*4)') // Forces keyframes every 4 sec
      .addOption(
        '-hls_segment_filename',
        path.join(outputDir, 'segment_%03d.ts')
      ) // Naming segments
      .on('end', () => {
        console.log(`🎬 Transcoding complete: ${outputPath}`)
        resolve()
      })
      .on('error', err => {
        console.error('❌ FFmpeg error:', err)
        reject(err)
      })
      .run()
  })
}
// Notify Streaming Service via gRPC
function notifyStreamingService(videoId, quality, status, filePath) {
  const request = { videoId, quality, status, filePath }

  grpcClient.UpdateVideoMetadata(request, (error, response) => {
    if (error) {
      console.error('❌ gRPC Error:', error)
    } else {
      console.log(`📡 gRPC Response: ${response.message}`)
    }
  })
}
startConsumer()

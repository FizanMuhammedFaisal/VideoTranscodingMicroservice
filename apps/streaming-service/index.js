import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import Redis from 'ioredis'

const PROTO_PATH = '../../packages/proto/streaming.proto'
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true })
const streamingProto =
  grpc.loadPackageDefinition(packageDefinition).StreamingService

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379
})
console.log('streamingProto:', streamingProto)

// ✅ gRPC Handler: Updates Redis with video metadata
const UpdateVideoMetadata = async (call, callback) => {
  const { videoId, quality, status, filePath } = call.request
  console.log(status)
  try {
    // Store metadata in a structured Redis Hash
    const metadata = { quality, status, filePath }
    await redis.hset(`video:${videoId}`, quality, JSON.stringify(metadata))

    console.log(`✅ Redis Updated: video:${videoId} -> ${quality} is ${status}`)

    callback(null, { message: `Updated ${videoId} - ${quality} to ${status}` })
  } catch (err) {
    console.error('❌ Redis Update Error:', err)
    callback(err, null)
  }
}

// ✅ gRPC Handler: Check if video is ready
const isVideoReady = async (call, callback) => {
  const { videoId } = call.request

  try {
    // Fetch all video metadata
    const metadata = await redis.hgetall(`video:${videoId}`)

    // If metadata exists and any quality is "ready", return true
    const isReady = Object.values(metadata).some(entry => {
      const data = JSON.parse(entry)
      return data.status === 'ready'
    })

    callback(null, { isReady })
  } catch (error) {
    console.error('❌ Redis Fetch Error:', error)
    callback(error, null)
  }
}

// ✅ Start gRPC Server
const server = new grpc.Server()
server.addService(streamingProto.service, {
  UpdateVideoMetadata: UpdateVideoMetadata,
  IsVideoReady: isVideoReady
})

server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('🎥 Streaming Service running on port 50051')
  }
)

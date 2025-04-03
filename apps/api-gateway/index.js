import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(
  cors({
    origin: ' http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
const PROTO_PATH = '../../packages/proto/upload.proto'
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})
const uploadProto = grpc.loadPackageDefinition(packageDefinition).upload
const UPLOAD_SERVICE_URL = process.env.UPLOAD_SERVICE_URL
const uploadService = new uploadProto.UploadService(
  UPLOAD_SERVICE_URL,
  grpc.credentials.createInsecure()
)
//streaming

const PROTO_PATH_STREAMING = '../../packages/proto/streaming.proto'
const packageDefinition_streaming = protoLoader.loadSync(PROTO_PATH_STREAMING)
const streamingProto = grpc.loadPackageDefinition(
  packageDefinition_streaming
).StreamingService

const client = new streamingProto(
  'streaming-service:50051',
  grpc.credentials.createInsecure()
)

const upload = multer({ storage: multer.memoryStorage() })
const videoPath = path.join(__dirname, '../../uploads')
console.log('Serving videos from:', videoPath)
app.use('/videos', express.static(videoPath))

app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded')

  const call = uploadService.UploadVideo((err, response) => {
    if (err) {
      console.error('gRPC stream error:', err)
      return res.status(500).send(err.message)
    }
    console.log(response)
    res.json({
      videoId: response.videoId,
      message: response.message
    })
  })
  const CHUNK_SIZE = 64 * 1024 // 64KB per chunk
  let offset = 0

  while (offset < req.file.buffer.length) {
    const chunk = req.file.buffer.slice(offset, offset + CHUNK_SIZE)
    call.write({ chunk })
    offset += CHUNK_SIZE
  }
  call.end()
  req.file.buffer = null
})

app.get('/events/:videoId', async (req, res) => {
  const { videoId } = req.params
  console.log(videoId)
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendUpdate = () => {
    client.IsVideoReady({ videoId }, (error, response) => {
      if (!error && response.isReady) {
        res.write(`data: Video Ready\n\n`)
        res.end()
        clearInterval(interval)
      }
    })
  }
  const interval = setInterval(sendUpdate, 3000)

  req.on('close', () => {
    clearInterval(interval)
  })
})

app.get('/hi', (req, res) => {
  res.json({ hey: 'hey' })
})

app.listen(4000, () => console.log('API Gateway running on port 4000'))

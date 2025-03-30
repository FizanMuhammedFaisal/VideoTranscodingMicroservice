import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import express from 'express'
import multer from 'multer'

import cors from 'cors'

const app = express()
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
console.log(UPLOAD_SERVICE_URL)
const uploadService = new uploadProto.UploadService(
  UPLOAD_SERVICE_URL,
  grpc.credentials.createInsecure()
)

const upload = multer({ storage: multer.memoryStorage() })

app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded')

  const call = uploadService.UploadVideo((err, response) => {
    console.error('gRPC stream error:', err)
    if (err) return res.status(500).send(err.message)
    res.send(response.message)
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
  res.status(200)
})
app.get('/hi', (req, res) => {
  res.json({ hey: 'hey' })
})

app.listen(4000, () => console.log('API Gateway running on port 4000'))

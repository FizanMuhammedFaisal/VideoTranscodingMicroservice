# Minimal Video Streaming System

This project is a lightweight video streaming system built with modern technologies. It allows users to upload videos via a React frontend, processes them into multiple resolutions using a microservices architecture, and streams them on demand with HLS (HTTP Live Streaming). The system uses RabbitMQ for task queuing and Redis for metadata caching, all orchestrated with Docker Compose.

## Features

- **React Frontend**: Simple UI for uploading and streaming videos using Video.js.
- **Microservices**: Upload, Transcoding, and Streaming services communicating via gRPC.
- **RabbitMQ**: Task queue for distributing transcoding jobs.
- **Redis**: Caches video metadata.
- **Local Storage**: Stores uploaded and transcoded videos.
- **Docker Compose**: Easy setup for all services.

## Architecture

![System Architecture](./ProjectArchitecture.png)

### Workflow

1. **Upload**:
   - User uploads a video via UI → API Gateway (HTTP POST) → Upload Service (gRPC).
   - Upload Service saves the video to ./uploads/, stores metadata in Redis, and pushes tasks (e.g., 480p, 720p) to RabbitMQ.
2. **Scaling**:
   - Monitor script checks RabbitMQ transcode-queue every 10 seconds.
   - If tasks > 5, adds workers (up to 8); if < 2, reduces to 1 (min).
3. **Transcoding**:
   - Transcoding Service workers (PM2 instances) consume tasks from RabbitMQ, run FFmpeg, save outputs to ./uploads/, and update Streaming Service via gRPC.
4. **Streaming**:
   - User requests video via UI → API Gateway (HTTP GET) → Streaming Service (gRPC) → Fetches metadata from Redis, returns file paths → UI displays video options.

---

### Mermaid Diagram

Here’s the complete system in Mermaid syntax (paste into [mermaid.live](https://mermaid.live/) to visualize):

mermaid

CollapseWrapCopy

`graph TD
    A[User UI<br>HTML + JS] -->|HTTP POST /upload| B(API Gateway<br>Express + Multer)
    B -->|gRPC UploadVideo| C(Upload Service)
    C -->|Store File| G[Local Storage<br>./uploads/]
    C -->|Store Metadata| D[Redis<br>Metadata Cache]
    C -->|Publish Tasks| E[RabbitMQ<br>transcode-exchange<br>transcode-queue]
    H[Monitor Script<br>PM2 Controller] -->|Check Queue Size| E
    H -->|Scale Instances| F[Transcoding Service<br>PM2 Instances<br>FFmpeg]
    E -->|Distribute Tasks| F
    F -->|Save Files| G
    F -->|gRPC UpdateMetadata| I(Streaming Service)
    I -->|Update Metadata| D
    A -->|HTTP GET /stream| B
    B -->|gRPC StreamVideo| I
    I -->|Fetch Metadata| D
    I -->|Return File Paths| B
    B -->|Serve Video Links| A`

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [FFmpeg](https://ffmpeg.org/) (for transcoding, installed in the Transcoding Service Docker image)

---

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/FizanMuhammedFaisal/VideoTranscodingMicroservice.git
cd VideoTranscodingMicroservice

```

### 2. Install Dependencies

Using pnpm in a Turborepo setup:

```bash
pnpm install
```

This installs dependencies for all apps and packages defined in pnpm-workspace.yaml.

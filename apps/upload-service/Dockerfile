# Stage 1: Base setup
FROM node:18-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: Dependencies
FROM base AS deps

# 1. Copy root config files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json .npmrc ./

# 2. Copy shared packages
COPY packages/ ./packages/

# 3. Copy ONLY THIS MICROSERVICE's files
COPY apps/upload-service/ ./apps/upload-service/

# Install THIS MICROSERVICE's deps
RUN pnpm install --filter upload-service --prod --frozen-lockfile

# Stage 3: Runtime
FROM base AS runtime
WORKDIR /app

# 1. Copy shared directories
COPY --from=deps /app/packages /app/packages
COPY --from=deps /app/node_modules /app/node_modules

# # 2. Copy the microservice with its node_modules
# COPY --from=deps /app/apps/upload-service /app/apps/upload-service

COPY --from=deps /app/apps/upload-service/node_modules /app/apps/upload-service/node_modules
RUN apk add --no-cache ffmpeg

EXPOSE 50051
WORKDIR /app/apps/upload-service
CMD ["pnpm", "start"]
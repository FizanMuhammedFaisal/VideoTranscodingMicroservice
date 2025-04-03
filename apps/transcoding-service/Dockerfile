# Stage 1: Base image
FROM node:18-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate


# Stage 2: Dependencies
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json .npmrc ./

# 2. Copy api-gateway's package.json separately
COPY apps/transcoding-service/package.json ./apps/transcoding-service/


# 3. Install dependencies (this layer caches independently)
RUN pnpm install --filter transcoding-service --prod --frozen-lockfile


# 4. Copy remaining files
COPY packages/ ./packages/
COPY apps/transcoding-service/ ./apps/transcoding-service/


# Stage 3: Runtime
FROM base AS runtime
WORKDIR /app
# 1. Copy shared directories
RUN apk add --no-cache ffmpeg


COPY --from=deps /app/packages /app/packages
COPY --from=deps /app/node_modules /app/node_modules


# COPY --from=deps  /app/apps/transcoding-service /app/apps/transcoding-service


COPY --from=deps /app/apps/transcoding-service/node_modules /app/apps/transcoding-service/node_modules


WORKDIR /app/apps/transcoding-service
CMD ["pnpm", "start"]
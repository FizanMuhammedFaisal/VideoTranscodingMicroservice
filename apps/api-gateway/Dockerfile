# Stage 1: Base image
FROM node:18-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: Dependencies
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json .npmrc ./


# 2. Copy api-gateway's package.json separately
COPY apps/api-gateway/package.json ./apps/api-gateway/

# 3. Install dependencies (this layer caches independently)
RUN pnpm install --filter api-gateway --prod --frozen-lockfile

# 4. Copy remaining files 
COPY packages/ ./packages/
COPY apps/api-gateway/ ./apps/api-gateway/

# Stage 3: Runtime
FROM base AS runtime
WORKDIR /app
# 1. Copy shared directories
COPY --from=deps /app/packages /app/packages
COPY --from=deps /app/node_modules /app/node_modules


# COPY --from=deps  /app/apps/api-gateway /app/apps/api-gateway

COPY --from=deps /app/apps/api-gateway/node_modules /app/apps/api-gateway/node_modules

EXPOSE 4000
WORKDIR /app/apps/api-gateway
CMD ["pnpm", "start"]
# ── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy dependency manifests first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/src packages/shared/src
COPY apps/api/src apps/api/src

# Copy Prisma schema for client generation
COPY apps/api/prisma apps/api/prisma

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API (shared uses src directly — no build needed)
RUN pnpm --filter @flowboard/api build

# ── Stage 2: Production ──────────────────────────────────────
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy dependency manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/src packages/shared/src
COPY --from=builder /app/apps/api/dist apps/api/dist

# Copy Prisma schema + migrations for migrate deploy
COPY --from=builder /app/apps/api/prisma apps/api/prisma

# Copy generated Prisma client
COPY --from=builder /app/apps/api/src/generated apps/api/src/generated

# Ensure node user owns app files for prisma migrate and npx cache
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && cd ../.. && node apps/api/dist/main.js"]

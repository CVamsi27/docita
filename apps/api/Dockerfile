# ─────────────────────────────────────────────────────────────
# STAGE 1: DEPENDENCIES - Optimized for cache reuse with BuildKit
# This stage invalidates ONLY when package manifests change (~5% of commits)
# OPTIMIZATION: BuildKit cache mounts reduce install time from 60s to 5s
# ─────────────────────────────────────────────────────────────
FROM node:22.12-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.30.3

# Copy ONLY package manifests (not source code)
# This layer is cached unless these files change
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

# Copy Prisma schema (needed for client generation)
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

# Install full dependencies with frozen lockfile so the workspace can build
# OPTIMIZATION: BuildKit cache mount for pnpm store - reuses downloaded packages across builds
# This expensive operation is cached across source code changes
# Skip tesseract.js (moved to optional dependencies) to keep image size ~240MB instead of ~360MB
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma client (required for runtime)
# Prisma config requires a DATABASE_URL value during generation, but the client
# does not need a live database connection at build time.
RUN DATABASE_URL="postgresql://docita:docita@127.0.0.1:5432/docita?schema=public&sslmode=disable" \
    pnpm --filter @workspace/db run db:generate

# Copy source and build the workspace artifacts inside the image so Render
# does not need pre-built dist folders in the repository checkout.
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api

RUN pnpm --filter @workspace/types run build && \
    pnpm --filter @workspace/utils run build && \
    pnpm --filter @workspace/db run build && \
    pnpm --filter @docita/api run build

# ─────────────────────────────────────────────────────────────
# STAGE 2: RUNTIME - Minimal production image
# This stage invalidates when source code changes (~95% of commits)
# but reuses the cached deps layer from Stage 1
# ─────────────────────────────────────────────────────────────
FROM node:22.12-alpine AS runtime
WORKDIR /app

# Install ONLY runtime essentials
# curl is needed for health check in deployment workflow
RUN apk add --no-cache dumb-init curl && \
    npm install -g pnpm@10.30.3

# Copy node_modules from deps stage (cached unless manifests change)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy package manifests for workspace resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

# Copy built artifacts produced inside the image
COPY --from=deps --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=deps --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist

# Setup @workspace/db package link for runtime module resolution
RUN mkdir -p /app/node_modules/@workspace && \
    rm -rf /app/node_modules/@workspace/db && \
    cp -R /app/packages/db/dist /app/node_modules/@workspace/db && \
    ln -s /app/apps/api/dist /app/dist

# Create uploads directory and temp subdirectory for Multer
RUN mkdir -p /app/uploads/temp

# Download Tesseract OCR training data for English
# This data is required for the OCR module to function properly
# Downloaded from Tesseract GitHub releases
RUN mkdir -p /app/.tesseract && \
    curl -fsSL "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/eng.traineddata" \
    -o /app/.tesseract/eng.traineddata && \
    echo "Tesseract training data downloaded"

# Set environment variable for Tesseract data path
ENV TESSDATA_PREFIX=/app/.tesseract

# Aggressive cleanup to minimize image size
# Removes source files, config files, and caches
RUN rm -rf \
    /app/packages/*/src \
    /app/packages/*/tsconfig.json \
    /app/packages/*/.eslintrc.* \
    /app/packages/*/jest.config.* \
    /app/apps/api/src \
    /app/apps/api/*.json \
    /app/apps/api/test \
    ~/.npm ~/.pnpm-store /tmp/* \
    /usr/local/share/.cache

# Create non-root user for security
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check (uses fast liveness probe)
# Note: /api prefix is required because of app.setGlobalPrefix('api') in main.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:3001/api/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--max-old-space-size=1024", "dist/main"]

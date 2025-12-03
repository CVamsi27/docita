# ─────────────────────────────────────────────────────────────
# BUILD STAGE - Copy pre-built artifacts from host
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy only root manifests for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy required workspaces
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

# Copy API source
COPY apps/api ./apps/api

# Install all dependencies (production and dev for later use)
RUN pnpm install --frozen-lockfile

# Copy pre-built artifacts from the host build
# These were compiled on the host with `pnpm build` and include:
# - @workspace/db/dist (compiled TypeScript + generated Prisma client)
# - @workspace/types/dist (compiled TypeScript)
# - apps/api/dist (compiled NestJS app)
# Copy packages and source
COPY packages/db/dist ./packages/db/dist
COPY packages/types/dist ./packages/types/dist
COPY apps/api/dist ./apps/api/dist

# Don't use pnpm deploy - instead, copy node_modules directly which includes
# all generated Prisma client files. We'll strip out dev dependencies manually.
# This ensures .prisma/client files are available at runtime.


# ─────────────────────────────────────────────────────────────
# RUNTIME STAGE
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install dumb-init for graceful shutdown
RUN apk add --no-cache dumb-init

# Install pnpm for install command
RUN npm install -g pnpm

# Copy manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace source (needed for @workspace package resolution)
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Copy ALL pre-built artifacts and node_modules from builder
# This is the complete built state - no reinstall needed
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules

# Rebuild symlinks - pnpm install will recreate links but keep existing .pnpm cache
# This is needed because COPY doesn't always preserve relative symlinks correctly
RUN pnpm install --frozen-lockfile && \
  rm -rf /app/node_modules/@workspace/db && \
  mkdir -p /app/node_modules/@workspace && \
  cp -R /app/packages/db/dist /app/node_modules/@workspace/db

# Copy Prisma schema
COPY packages/db/prisma/schema.prisma ./prisma/schema.prisma

# Create non-root user FIRST
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Create symlink to make dist accessible for app startup
RUN ln -s /app/apps/api/dist /app/dist

# Create uploads directory and set permissions for nodejs user
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]

# ─────────────────────────────────────────────────────────────
# BUILD STAGE
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy only root manifests for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy only required workspaces
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config

# Copy API app
COPY apps/api ./apps/api

# Install dependencies (dev included for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/packages/db
RUN pnpm db:generate

# Build types package
WORKDIR /app/packages/types
RUN pnpm build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Production deployment using pnpm deploy
WORKDIR /app
RUN pnpm deploy --filter=api --prod /app/deployed


# ─────────────────────────────────────────────────────────────
# RUNTIME STAGE
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install dumb-init for graceful shutdown
RUN apk add --no-cache dumb-init

# Copy production output
COPY --from=builder /app/deployed/node_modules ./node_modules
COPY --from=builder /app/deployed/dist ./dist
COPY --from=builder /app/deployed/package.json ./

# Copy Prisma schema only
COPY --from=builder /app/packages/db/prisma ./prisma

# Non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]

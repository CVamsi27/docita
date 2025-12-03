# ─────────────────────────────────────────────────────────────
# BUILD STAGE
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

# Install all dependencies (dev included for build)
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
RUN pnpm deploy --filter=api --prod /app/deployed --legacy


# ─────────────────────────────────────────────────────────────
# RUNTIME STAGE
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install dumb-init for graceful shutdown
RUN apk add --no-cache dumb-init

# Copy built deployment contents
COPY --from=builder /app/deployed/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/deployed/package.json ./

# Copy ONLY Prisma schema (migrations run in CI/CD, not in container)
COPY --from=builder /app/packages/db/prisma/schema.prisma ./prisma/schema.prisma

# Create non-root user
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
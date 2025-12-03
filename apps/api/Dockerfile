# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy packages
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config

# Copy api app
COPY apps/api ./apps/api

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/packages/db
RUN pnpm db:generate

# Build types package (required by API)
WORKDIR /app/packages/types
RUN pnpm build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Use pnpm deploy for production dependencies (works with monorepos)
# This creates a standalone deployment with only production deps
WORKDIR /app
RUN pnpm deploy --filter=api --prod /app/deployed

# Production stage - Minimal base
FROM node:18-alpine

WORKDIR /app

# Install only dumb-init for graceful signal handling
RUN apk add --no-cache dumb-init

# Copy the deployed production-ready app from pnpm deploy
COPY --from=builder /app/deployed/node_modules ./node_modules
COPY --from=builder /app/deployed/dist ./dist
COPY --from=builder /app/deployed/package.json ./

# Copy Prisma schema for runtime (migrations, introspection)
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set proper ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main"]

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

# Remove dev dependencies only - keep production deps
# Combine all cleanup into single layer to reduce image size
WORKDIR /app
RUN pnpm prune --prod && \
    rm -rf /app/packages/eslint-config /app/packages/typescript-config /app/packages/ui 2>/dev/null || true && \
    rm -rf /app/apps/app /app/apps/admin /app/apps/landing /app/scripts /app/docs 2>/dev/null || true && \
    find /app/node_modules -type f \( \
      -name "*.md" -o \
      -name "LICENSE*" -o \
      -name "CHANGELOG*" -o \
      -name "*.example" -o \
      -name ".npmignore" -o \
      -name "Makefile" -o \
      -name "*.gyp" -o \
      -name "*.gypi" \
    \) -delete 2>/dev/null || true && \
    find /app/node_modules -type d \( \
      -name "test" -o \
      -name "tests" -o \
      -name "__tests__" -o \
      -name "__mocks__" -o \
      -name "example" -o \
      -name "examples" -o \
      -name "docs" -o \
      -name ".git" -o \
      -name ".github" -o \
      -name "coverage" -o \
      -name "benchmark" -o \
      -name "benchmarks" \
    \) -exec rm -rf {} + 2>/dev/null || true

# Production stage - Minimal base
FROM node:18-alpine

WORKDIR /app

# Install only dumb-init for graceful signal handling
RUN apk add --no-cache dumb-init

# Copy pruned node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema and package.json for runtime
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/package.json ./packages/db/

# Copy ONLY built API (not source code)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy workspace root package.json
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set proper ownership (must be done before USER change)
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

# Use dumb-init to properly handle signals (SIGTERM, SIGKILL)
ENTRYPOINT ["dumb-init", "--"]

# Start application with absolute path
CMD ["node", "/app/apps/api/dist/main"]

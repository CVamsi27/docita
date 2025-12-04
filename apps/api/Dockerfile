# ─────────────────────────────────────────────────────────────
# STAGE 1: DEPENDENCIES - Optimized for cache reuse
# This stage invalidates ONLY when package manifests change (~5% of commits)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy ONLY package manifests (not source code)
# This layer is cached unless these files change
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Copy Prisma schema (needed for client generation)
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

# Install production dependencies with frozen lockfile
# This expensive operation is cached across source code changes
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Generate Prisma client (required for runtime)
# Using npx with explicit version since prisma CLI is a dev dependency
RUN cd packages/db && npx prisma@6.0.0 generate

# ─────────────────────────────────────────────────────────────
# STAGE 2: RUNTIME - Minimal production image
# This stage invalidates when source code changes (~95% of commits)
# but reuses the cached deps layer from Stage 1
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install ONLY runtime essentials
# curl is needed for health check in deployment workflow
RUN apk add --no-cache dumb-init curl && \
    npm install -g pnpm@10.4.1

# Copy node_modules from deps stage (cached unless manifests change)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy package manifests for workspace resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Copy pre-built artifacts (built on host by GitHub Actions)
COPY --chown=nodejs:nodejs packages/db/dist ./packages/db/dist
COPY --chown=nodejs:nodejs packages/types/dist ./packages/types/dist
COPY --chown=nodejs:nodejs apps/api/dist ./apps/api/dist

# Setup @workspace/db package link for runtime module resolution
RUN mkdir -p /app/node_modules/@workspace && \
    rm -rf /app/node_modules/@workspace/db && \
    cp -R /app/packages/db/dist /app/node_modules/@workspace/db && \
    ln -s /app/apps/api/dist /app/dist

# Create uploads directory and temp subdirectory for Multer
RUN mkdir -p /app/uploads/temp

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
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health/live', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode); }).on('error', () => { process.exit(1); })"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]

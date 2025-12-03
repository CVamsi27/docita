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

# Build DB package (compile TS -> dist)
# Run the package-local build so `packages/db/dist` is produced for the API build.
# Do not swallow failures — if the DB package doesn't build, fail the image build early.
RUN pnpm build

# Make the built DB package available as a node module during the builder stage
# so the API TypeScript build can resolve `@workspace/db` from node_modules.
RUN mkdir -p /app/node_modules/@workspace && \
  cp -R /app/packages/db/dist /app/node_modules/@workspace/db && \
  cp /app/packages/db/package.json /app/node_modules/@workspace/db/package.json || true

# Make the built DB package available under node_modules for the builder
# so TypeScript and the API build resolve `@workspace/db` to the compiled output.
WORKDIR /app
# (removed) avoid copying source `packages/db` into node_modules which would
# cause the API build to resolve the package to source files (leading to
# compiled JS requiring `../../../../packages/db/src`). We keep the copied
# `dist` layout placed earlier so the compiled output is resolved.

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
# Copy node_modules from deployed output and copy the API's built JS files.
# The monorepo/Nx build emits nested artifacts under `apps/api/dist/apps/api/src`.
# Copy that inner `src` into `/app/dist` so `node dist/main` resolves correctly.
COPY --from=builder /app/deployed/node_modules ./node_modules
# Ensure @workspace/db is available at runtime as a node module.
# Some compiled outputs can contain imports to the workspace package name
# so we copy the built db package into node_modules for resolution.
COPY --from=builder /app/packages/db/dist /app/node_modules/@workspace/db

# Copy the API built JS files into /app/dist
COPY --from=builder /app/apps/api/dist/apps/api/src ./dist
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
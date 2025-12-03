# ─────────────────────────────────────────────────────────────
# SINGLE STAGE - Minimal production image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init && npm install -g pnpm@10.4.1

# Copy manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace source (needed for @workspace module resolution)
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Install ONLY production dependencies
# pnpm will fetch from cache if available, or download from registry
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy pre-built dist from host build (these come from `pnpm build` on host)
COPY --chown=nodejs:nodejs packages/db/dist ./packages/db/dist
COPY --chown=nodejs:nodejs packages/types/dist ./packages/types/dist
COPY --chown=nodejs:nodejs apps/api/dist ./apps/api/dist

# Setup @workspace/db package link
RUN mkdir -p /app/node_modules/@workspace && \
  rm -rf /app/node_modules/@workspace/db && \
  cp -R /app/packages/db/dist /app/node_modules/@workspace/db

# Copy Prisma schema needed for runtime
COPY packages/db/prisma/schema.prisma ./prisma/schema.prisma

# Cleanup unnecessary files to reduce layer size
RUN rm -rf \
  /app/packages/*/src \
  /app/packages/*/tsconfig.json \
  /app/packages/*/.eslintrc.* \
  /app/packages/*/jest.config.* \
  /app/apps/api/src \
  /app/apps/api/*.json \
  /app/apps/api/test \
  ~/.npm ~/.pnpm-store /tmp/* \
  && mkdir -p /app/uploads

# Create symlink for easier reference
RUN ln -s /app/apps/api/dist /app/dist

# Create non-root user for security
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && \
  chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]

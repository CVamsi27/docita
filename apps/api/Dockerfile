FROM node:22.22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/authorization/package.json ./packages/authorization/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

RUN DATABASE_URL="postgresql://docita:docita@127.0.0.1:5432/docita?schema=public&sslmode=disable" \
    pnpm --filter @workspace/db run db:generate

COPY packages/auth ./packages/auth
COPY packages/authorization ./packages/authorization
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api

# Nest's TypeScript graph exceeds Node's adaptive heap on small builders.
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN pnpm --filter @workspace/types run build && \
    pnpm --filter @workspace/authorization run build && \
    pnpm --filter @workspace/auth run build && \
    pnpm --filter @workspace/utils run build && \
    pnpm --filter @workspace/db run build && \
    pnpm --filter @docita/api run build

FROM node:22.22-alpine AS runtime
WORKDIR /app

RUN apk upgrade --no-cache libcrypto3 libssl3 && \
    apk add --no-cache dumb-init curl

# Runtime starts compiled Node artifacts; deployment tooling lives in CI.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/pnpm \
    /usr/local/lib/node_modules/corepack /opt/yarn-v* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm /usr/local/bin/pnpx \
    /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /app/packages/authorization/node_modules ./packages/authorization/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/authorization/package.json ./packages/authorization/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

COPY --from=deps --chown=nodejs:nodejs /app/packages/auth/dist ./packages/auth/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/authorization/dist ./packages/authorization/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=deps --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist

RUN mkdir -p /app/node_modules/@workspace && \
    rm -rf /app/node_modules/@workspace/auth /app/node_modules/@workspace/authorization /app/node_modules/@workspace/db && \
    ln -s /app/packages/auth /app/node_modules/@workspace/auth && \
    ln -s /app/packages/authorization /app/node_modules/@workspace/authorization && \
    ln -s /app/packages/db /app/node_modules/@workspace/db && \
    ln -s /app/apps/api/dist /app/dist

RUN mkdir -p /app/uploads/temp

RUN mkdir -p /app/.tesseract && \
    curl -fsSL "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/eng.traineddata" \
    -o /app/.tesseract/eng.traineddata && \
    echo "Tesseract training data downloaded"

ENV TESSDATA_PREFIX=/app/.tesseract

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

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:3001/api/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "exec node --max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE_MB:-768} dist/${WORKER_ENTRYPOINT:-main}"]

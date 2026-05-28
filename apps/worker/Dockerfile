FROM node:22.12-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10.30.3

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

RUN DATABASE_URL="postgresql://docita:docita@127.0.0.1:5432/docita?schema=public&sslmode=disable" \
    pnpm --filter @workspace/db run db:generate

COPY packages/auth ./packages/auth
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

RUN pnpm --filter @workspace/types run build && \
    pnpm --filter @workspace/auth run build && \
    pnpm --filter @workspace/utils run build && \
    pnpm --filter @workspace/db run build && \
    pnpm --filter @docita/worker run build

FROM node:22.12-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache dumb-init curl && \
    npm install -g pnpm@10.30.3

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/

COPY --from=deps --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=deps --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist

RUN mkdir -p /app/node_modules/@workspace && \
    rm -rf /app/node_modules/@workspace/db && \
    cp -R /app/packages/db/dist /app/node_modules/@workspace/db && \
    ln -s /app/apps/worker/dist /app/dist

RUN mkdir -p /app/uploads/temp

RUN mkdir -p /app/.tesseract && \
    curl -fsSL "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/eng.traineddata" \
    -o /app/.tesseract/eng.traineddata && \
    echo "Tesseract training data downloaded"

ENV TESSDATA_PREFIX=/app/.tesseract

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "exec node --max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE_MB:-384} dist/worker/src/main.js"]

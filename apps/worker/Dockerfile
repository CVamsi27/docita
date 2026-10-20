FROM node:22.22-alpine AS base
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
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

FROM base AS deps

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
COPY apps/worker ./apps/worker

# Nest's TypeScript graph exceeds Node's adaptive heap on small builders.
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN pnpm --filter @workspace/types run build && \
    pnpm --filter @workspace/authorization run build && \
    pnpm --filter @workspace/auth run build && \
    pnpm --filter @workspace/utils run build && \
    pnpm --filter @workspace/db run build && \
    pnpm --filter @docita/worker run build

# Prisma generation is a compiler step; pnpm may replace its package directory.
RUN node -e "const fs=require('node:fs'); const path=require('node:path'); const {createRequire}=require('node:module'); const db=createRequire('/app/packages/db/package.json'); const client=createRequire(db.resolve('@prisma/client')); fs.cpSync(path.dirname(client.resolve('.prisma/client/default')), '/generated-prisma-client', {recursive:true});"

FROM base AS production-deps

# Keep production native distributions; omit development glob/test/compiler tools.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=deps /generated-prisma-client /generated-prisma-client

RUN node -e "const fs=require('node:fs'); const path=require('node:path'); const {createRequire}=require('node:module'); const db=createRequire('/app/packages/db/package.json'); const target=path.resolve(path.dirname(db.resolve('@prisma/client/package.json')), '../../.prisma/client'); fs.mkdirSync(target, {recursive:true}); fs.cpSync('/generated-prisma-client', target, {recursive:true});"

FROM node:22.22-alpine AS runtime
WORKDIR /app

RUN apk upgrade --no-cache libcrypto3 libssl3 && \
    apk add --no-cache dumb-init curl

# Runtime starts compiled Node artifacts; deployment tooling lives in CI.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/pnpm \
    /usr/local/lib/node_modules/corepack /opt/yarn-v* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm /usr/local/bin/pnpx \
    /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/packages/authorization/node_modules ./packages/authorization/node_modules
COPY --from=production-deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=production-deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=production-deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=production-deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=production-deps /app/apps/api/node_modules ./apps/api/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/authorization/package.json ./packages/authorization/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/

COPY --from=deps --chown=nodejs:nodejs /app/packages/auth/dist ./packages/auth/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/authorization/dist ./packages/authorization/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=deps --chown=nodejs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=deps --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist

RUN mkdir -p /app/node_modules/@workspace && \
    rm -rf /app/node_modules/@workspace/auth /app/node_modules/@workspace/authorization /app/node_modules/@workspace/db && \
    ln -s /app/packages/auth /app/node_modules/@workspace/auth && \
    ln -s /app/packages/authorization /app/node_modules/@workspace/authorization && \
    ln -s /app/packages/db /app/node_modules/@workspace/db && \
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
ENV NODE_PATH=/app/apps/worker/node_modules:/app/apps/api/node_modules:/app/node_modules

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "exec node --max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE_MB:-384} dist/worker/src/main.js"]

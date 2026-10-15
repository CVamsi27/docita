FROM node:22.22-alpine3.23

RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates postgresql17-client age aws-cli dumb-init && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/pnpm \
      /usr/local/lib/node_modules/corepack /opt/yarn-v* \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm \
      /usr/local/bin/pnpx /usr/local/bin/corepack /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg

WORKDIR /opt/docita-backup
COPY --chown=node:node backup-database.mjs ./backup-database.mjs

ENV NODE_ENV=production
USER node
ENTRYPOINT ["dumb-init", "--", "node", "/opt/docita-backup/backup-database.mjs"]

FROM node:18-alpine

WORKDIR /app

# Install pnpm
npm install -g pnpm

# Copy workspace config
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy packages
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config

# Copy api app
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/packages/db
RUN npx prisma generate

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main"]

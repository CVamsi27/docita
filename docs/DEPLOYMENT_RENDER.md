# Render Deployment Guide

This guide is the current Render-specific deployment path for the NestJS API and PostgreSQL database.

## What Gets Deployed

- `apps/api` as a Render Web Service
- `docita-db` as Render PostgreSQL

The current codebase keeps scheduled jobs inside the API process, so a separate worker is not required yet.

## Prerequisites

- Render account connected to the GitHub repo
- Render PostgreSQL in Singapore
- Environment variables ready from [`apps/api/.env.example`](../apps/api/.env.example)

## Render Blueprint

The repo includes [`render.yaml`](../render.yaml), which creates the API service and database together.

Important fields:

- `rootDir: apps/api`
- `healthCheckPath: /api/health/live`
- `DATABASE_URL` comes from the database resource
- `NODE_ENV=production`

## First Deploy

1. Create the Render Blueprint from the repository.
2. Confirm the PostgreSQL service is created in Singapore.
3. Confirm the web service is linked to `docita-db`.
4. Add the remaining environment variables from `apps/api/.env.example`.
5. Deploy the web service.

## Run Migrations

After the first deploy, open the API service shell and run:

```bash
cd ../..
pnpm db:deploy
```

If you prefer the lower-level Prisma command, use:

```bash
cd ../..
pnpm --filter @workspace/db run db:migrate:deploy
```

## Notes

- Use Render's Internal Database URL for `DATABASE_URL`.
- The startup validator accepts Render-managed Postgres URLs without explicit `sslmode=require`.
- Sentry is already integrated in the API; set `SENTRY_DSN` if you want production error reporting.
- The API health endpoint is `GET /api/health/live`.
- Add a custom domain like `api.docita.work` in Render once the service is healthy.

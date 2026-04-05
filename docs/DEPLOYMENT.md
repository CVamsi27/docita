# Deployment Strategy

## Current Production Baseline

- Frontend
  - `apps/app`: Cloudflare (OpenNext)
  - `apps/admin`: Cloudflare Workers (OpenNext)
  - `apps/landing-astro`: Cloudflare Workers (Astro)
  - `apps/landing`: Cloudflare Workers (OpenNext, legacy fallback only)
- Backend
  - `apps/api`: Render Web Service
- Database
  - Render PostgreSQL

This is the active production strategy.

## Operational Rules

- Run Prisma migrations before each API deploy.
- Use Render database `DATABASE_URL` for API runtime.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend API URLs pointed to the deployed Render API URL.
- Keep each Worker entry bundle under Cloudflare's 3 MB limit. Use
  `node scripts/check-worker-size.mjs` after OpenNext builds.
- Deploy order: API first, then `apps/app`, `apps/admin`, and `apps/landing-astro`.
- Keep `open-next.config.ts` and `wrangler.toml` in sync for Next.js frontend apps.
- Keep `astro.config.mjs` and `wrangler.toml` in sync for `apps/landing-astro`.

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `pnpm build:app:cloudflare && pnpm build:admin:cloudflare && pnpm build:landing:cloudflare`

Legacy rollback gate (optional):

- `pnpm build:landing:next:cloudflare`

## Migration Target (Planned)

- Frontend
  - Cloudflare Workers (frontend)
- Backend
  - AWS App Runner (intermediate)
  - AWS ECS in Hyderabad (target steady state)
- Database
  - AWS RDS PostgreSQL in Hyderabad
- Object Storage
  - AWS S3

## Migration Readiness Checklist

1. Keep deployment configs environment-driven and platform-agnostic.
2. Keep API container image build reproducible and registry-compatible.
3. Keep migration steps idempotent (`prisma migrate deploy`).
4. Keep health/readiness probes stable across platforms.
5. Keep infrastructure docs split by current and future states.

## Frontend Quick Guide

- Build `apps/app` with `pnpm build:app:cloudflare`.
- Build `apps/admin` with `pnpm build:admin:cloudflare`.
- Build `apps/landing-astro` with `pnpm build:landing:cloudflare`.
- Build legacy `apps/landing` with `pnpm build:landing:next:cloudflare` only for rollback validation.
- Preview each Worker locally with the matching `preview:*:cloudflare` script.
- Deploy each Worker with the matching `deploy:*:cloudflare` script.

## Render Quick Guide

- Deploy `apps/api` as Render Web Service.
- Use Render PostgreSQL for `DATABASE_URL`.
- Run migrations via `pnpm db:deploy` before or during release.
- Health endpoint: `GET /api/health/live`.

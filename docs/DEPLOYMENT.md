# Deployment Strategy

## Current Production Stack

- Frontend
  - `apps/app`: Cloudflare Workers (OpenNext)
  - `apps/admin`: Cloudflare Workers (OpenNext)
  - `apps/landing`: Cloudflare Workers (Astro)
- Backend
  - `apps/api`: Fly.io (Mumbai — `bom` region), 1 GB RAM, shared CPU
- Database
  - AWS RDS PostgreSQL — `ap-south-1` (Mumbai), `db.t4g.micro`
- Cache / Queues
  - Upstash Redis — `ap-south-1` (Mumbai)
- Object Storage
  - Cloudflare R2 (`STORAGE_PROVIDER=r2`)

All backend infrastructure is co-located in Mumbai for Indian data residency (DPDP compliance).

## Operational Rules

- Run Prisma migrations before each API deploy (CI does this automatically on push to `main`).
- Use `DATABASE_URL` from AWS RDS for API runtime (set via `fly secrets set DATABASE_URL=...`).
- Use `REDIS_URL` from Upstash for queues and cache in production.
- In production set `QUEUE_PROVIDER=bull` and `CACHE_PROVIDER=redis`.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend `NEXT_PUBLIC_API_URL` pointed to the Fly.io app URL.
- Keep each Worker entry bundle under Cloudflare's 3 MB limit. Use
  `node scripts/check-worker-size.mjs` after OpenNext builds.
- Deploy order: run DB migrations first, then deploy API, then deploy frontends.
- Keep `open-next.config.ts` and `wrangler.toml` in sync for Next.js frontend apps.
- Keep `astro.config.mjs` and `wrangler.toml` in sync for `apps/landing`.

## Fly.io Quick Guide

```bash
# Install flyctl
brew install flyctl

# Authenticate
fly auth login

# First deploy (from repo root)
fly launch --no-deploy  # imports fly.toml
fly secrets set DATABASE_URL="postgresql://..." REDIS_URL="rediss://..." JWT_SECRET="..." ENCRYPTION_KEY="..." ...
fly deploy

# Subsequent deploys
fly deploy

# View logs
fly logs

# SSH into machine
fly ssh console
```

Secrets required (set via `fly secrets set KEY=value`):
- `DATABASE_URL` — AWS RDS connection string
- `REDIS_URL` — Upstash Redis URL (`rediss://` for TLS)
- `JWT_SECRET` — minimum 32 characters
- `ENCRYPTION_KEY` — 64-character hex key
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `QUEUE_PROVIDER=bull`
- `CACHE_PROVIDER=redis`

## AWS RDS Quick Guide

- Region: `ap-south-1` (Mumbai)
- Engine: PostgreSQL 16
- Instance: `db.t4g.micro` (2 GB RAM) — upgrade to `db.t3.small` at 20+ clinics
- Enable automated backups (7-day retention)
- Security group: allow port 5432 from Fly.io Mumbai egress IPs only
- Use SSL (`?sslmode=require` in `DATABASE_URL`)

Database migration is applied automatically by the `db-migrations.yml` GitHub Actions workflow on every push to `main` that touches `packages/db/`.

Manual migration:
```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run db:migrate:safe
```

## Upstash Redis Quick Guide

- Region: `ap-south-1` (Mumbai)
- Use the `rediss://` (TLS) connection URL from the Upstash console
- Free tier supports up to 10,000 commands/day; upgrade to Pay-as-you-go if needed
- Set `QUEUE_PROVIDER=bull` and `CACHE_PROVIDER=redis` in Fly secrets

## Frontend Quick Guide

- Build `apps/app` with `pnpm build:app:cloudflare`.
- Build `apps/admin` with `pnpm build:admin:cloudflare`.
- Build `apps/landing` with `pnpm build:landing:cloudflare`.
- Preview each Worker locally with the matching `preview:*:cloudflare` script.
- Deploy each Worker with the matching `deploy:*:cloudflare` script.

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `pnpm build:app:cloudflare && pnpm build:admin:cloudflare && pnpm build:landing:cloudflare`

## Scaling Path

| Stage | API | Database | Cache |
|-------|-----|----------|-------|
| 0–20 clinics | Fly.io 1 GB shared | RDS `db.t4g.micro` | Upstash free |
| 20–50 clinics | Fly.io 2 GB shared | RDS `db.t3.small` | Upstash Pay-as-you-go |
| 50–100 clinics | Fly.io 4 GB dedicated | RDS `db.t3.medium` + read replica | Upstash Pay-as-you-go |
| 100+ clinics | Fly.io multi-machine or ECS | RDS `db.r6g.large` + PgBouncer | ElastiCache |

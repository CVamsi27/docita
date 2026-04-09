# Deployment Strategy

## Current Production Stack

- Frontend
  - `apps/app`: Cloudflare Workers (OpenNext)
  - `apps/internal`: Cloudflare Workers (OpenNext)
  - `apps/landing`: Cloudflare Workers (Astro)
- Backend
  - `apps/api`: Fly.io (Mumbai — `bom` region), 1 GB RAM, shared CPU
- Database
  - AWS RDS PostgreSQL — `ap-south-1` (Mumbai), `db.t4g.micro`
- Cache / Background Work
  - In-process memory cache + in-process background tasks inside the API process
- Object Storage
  - Cloudflare R2 (`STORAGE_PROVIDER=r2`)

All backend infrastructure is co-located in Mumbai for Indian data residency (DPDP compliance).

## Operational Rules

- Run Prisma migrations before each API deploy (CI does this automatically on push to `main`).
- Production app deployments from GitHub Actions must be selective: on push to `main`, deploy only the apps whose related paths changed instead of deploying every app.
- Use `DATABASE_URL` from AWS RDS for API runtime (set via `fly secrets set DATABASE_URL=...`).
- Runtime baseline is Node `22.12.x` for local, CI, and Docker builds.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend `NEXT_PUBLIC_API_URL` pointed to the Fly.io app URL.
- Keep each Worker entry bundle under Cloudflare's 3 MB limit. Use
  `node scripts/check-worker-size.mjs` after OpenNext builds.
- Deploy order: run DB migrations first, then deploy API, then deploy frontends.
- Keep `open-next.config.ts` and `wrangler.toml` in sync for Next.js frontend apps.
- Keep `astro.config.mjs` and `wrangler.toml` in sync for `apps/landing`.
- Keep at least one API machine running; do not scale the API to zero while background work is in-process.
- Treat bulk import and non-immediate audit logging as best-effort background work tied to the running API instance.
- Do not rely on multi-machine queue semantics until background work is moved to a durable Postgres-backed worker.

## Background Task Caveat

- Redis/Bull is no longer part of the deployment topology.
- Search and application cache are memory-backed within each API instance.
- Bulk import processing is scheduled in-process by the API and does not survive process restarts.
- Non-immediate audit logging is fire-and-forget in-process and does not provide cross-instance delivery guarantees.
- If durable jobs, retries across restarts, or multi-machine worker coordination become required, migrate background work to a PostgreSQL-backed worker before scaling out.

## Fly.io Quick Guide

```bash
# Install flyctl
brew install flyctl

# Authenticate
fly auth login

# First deploy (from repo root)
fly launch --no-deploy  # imports fly.toml
fly secrets set DATABASE_URL="postgresql://..." JWT_SECRET="..." ENCRYPTION_KEY="..." ...
fly deploy

# Subsequent deploys
fly deploy

# View logs
fly logs

# SSH into machine
fly ssh console
```

Fly-specific notes:
- The Fly API deployment uses [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml) and [`apps/api/Dockerfile`](/Users/vamsikrishnachandaluri/repos/docita/apps/api/Dockerfile).
- GitHub Actions API deploys must resolve the Fly app name from [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml) and deploy with that config, rather than relying on a separate hardcoded app value in workflow logic.
- For GitHub Actions API deploys, add `FLY_ACCESS_TOKEN` as a repository secret. For Cloudflare deploys, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Keep `min_machines_running = 1` while background work remains in-process.
- Verify the API image locally before infra changes with:

```bash
docker build -f apps/api/Dockerfile -t docita-api-verify .
```

Secrets required (set via `fly secrets set KEY=value`):
- `DATABASE_URL` — AWS RDS connection string
- `JWT_SECRET` — minimum 32 characters
- `ENCRYPTION_KEY` — 64-character hex key
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SENTRY_DSN`

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

## Frontend Quick Guide

- Build `apps/app` with `pnpm build:app:cloudflare`.
- Build `apps/internal` with `pnpm build:internal:cloudflare`.
- Build `apps/landing` with `pnpm build:landing:cloudflare`.
- Preview each Worker locally with the matching `preview:*:cloudflare` script.
- Deploy each Worker with the matching `deploy:*:cloudflare` script.
- GitHub Actions production deploys use [deploy.yml](/Users/vamsikrishnachandaluri/repos/docita/.github/workflows/deploy.yml) and only run the app jobs whose related source or shared package paths changed on `main`.

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `pnpm build:app:cloudflare && pnpm build:internal:cloudflare && pnpm build:landing:cloudflare`
- `docker build -f apps/api/Dockerfile -t docita-api-verify .`

## Scaling Path

| Stage | API | Database | Cache / Background Work |
|-------|-----|----------|--------------------------|
| 0–20 clinics | Fly.io 1 GB shared, single machine | RDS `db.t4g.micro` | In-process memory cache + in-process background work |
| 20–50 clinics | Fly.io 2 GB shared, single machine | RDS `db.t3.small` | In-process memory cache + re-evaluate durable jobs |
| 50–100 clinics | Fly.io 4 GB dedicated | RDS `db.t3.medium` + read replica | Move background work to PostgreSQL-backed workers before scaling API horizontally |
| 100+ clinics | Fly.io multi-machine or ECS | RDS `db.r6g.large` + PgBouncer | Durable worker system required; re-evaluate dedicated cache only if needed |

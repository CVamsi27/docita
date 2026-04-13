# Deployment Strategy

## Current Production Stack

- Frontend
  - `apps/app`: Cloudflare Workers (OpenNext)
  - `apps/internal`: Cloudflare Workers (OpenNext)
  - `apps/landing`: Cloudflare Workers (Astro)
- Backend
  - `apps/api`: Fly.io (Mumbai — `bom` region), 2 GB RAM, shared CPU
  - `docita-worker` (Fly app): `apps/worker` Nest entry (imports `apps/api` worker modules), background jobs and crons
- Database
  - AWS RDS PostgreSQL — `ap-south-1` (Mumbai), `db.t4g.micro`
- Cache / Background Work
  - In-process memory cache in the API + PostgreSQL-backed worker jobs in Fly worker
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
- Keep `ENABLE_SCHEDULERS=false` on the API and `ENABLE_SCHEDULERS=true` on the worker once the split is live.
- Keep each Worker entry bundle under Cloudflare's 3 MB limit. Use
  `node scripts/check-worker-size.mjs` after OpenNext builds.
- Deploy order: run DB migrations first, then deploy API and worker, then deploy frontends.
- Keep `open-next.config.ts` and `wrangler.toml` in sync for Next.js frontend apps.
- Keep `astro.config.mjs` and `wrangler.toml` in sync for `apps/landing`.
- Keep at least one API machine running while request traffic is live.
- Keep the API at 2 GB until the worker has been healthy in parallel and we have live RSS measurements that support a safe reduction to 1.5 GB.
- Treat bulk import and non-immediate audit logging as best-effort background work on the worker, not the API.
- Use the PostgreSQL-backed worker for PDF generation, retries, and other background execution that must survive API restarts.

## Background Task Caveat

- Redis/Bull is no longer part of the deployment topology.
- Search and application cache are memory-backed within each API instance.
- Bulk import processing and PDF generation run on the separate worker and survive API restarts.
- Non-immediate audit logging remains best-effort but no longer blocks request-serving API restarts.
- If durable jobs, retries across restarts, or multi-machine worker coordination become required, keep the PostgreSQL-backed worker as the execution path and scale it separately from the API.

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
- The Fly worker deployment uses [`apps/worker/fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/fly.toml) and [`apps/worker/Dockerfile`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/Dockerfile) (no HTTP service; runs `dist/worker/src/main.js` in the image). For local runs, keep worker-only env in `apps/worker/.env.production.worker` (gitignored), not under `apps/api/`.
- GitHub Actions API deploys must resolve the Fly app name from [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml) and deploy with that config, rather than relying on a separate hardcoded app value in workflow logic.
- For GitHub Actions API deploys, add `FLY_API_TOKEN` as a repository secret.
- The worker app uses [`apps/worker/fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/fly.toml), builds from `apps/worker/Dockerfile`, and should use `--ha=false` so Fly does not create a standby machine for the no-service worker process.
- Keep `min_machines_running = 1` for the API while request traffic is live.
- Verify the API image locally before infra changes with:

```bash
docker build -f apps/api/Dockerfile -t docita-api-verify .
```

- Verify the worker image locally before worker deploy changes with:

```bash
docker build -f apps/worker/Dockerfile -t docita-worker-verify .
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
- Frontend production deploys are expected to be managed by Cloudflare Git integration or dashboard settings, not GitHub Actions in this repository.

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `docker build -f apps/api/Dockerfile -t docita-api-verify .`
- `docker build -f apps/worker/Dockerfile -t docita-worker-verify .`

## Scaling Path

| Stage | API | Database | Cache / Background Work |
|-------|-----|----------|--------------------------|
| 0–20 clinics | Fly.io 1 GB shared, single machine | RDS `db.t4g.micro` | In-process memory cache + worker-backed background work |
| 20–50 clinics | Fly.io 2 GB shared, single machine | RDS `db.t3.small` | In-process memory cache + worker-backed background work |
| 50–100 clinics | Fly.io 4 GB dedicated | RDS `db.t3.medium` + read replica | PostgreSQL-backed worker handles background work before scaling API horizontally |
| 100+ clinics | Fly.io multi-machine or ECS | RDS `db.r6g.large` + PgBouncer | Durable worker system required; re-evaluate dedicated cache only if needed |

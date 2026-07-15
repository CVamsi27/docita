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

- Run Prisma migrations before each API or worker deploy. The production deploy workflow applies migrations whenever `apps/api`, `apps/worker`, or shared API packages change, then blocks Fly deploy until `scripts/deploy/verify-db-schema-sync.sh` passes (no pending migrations, no schema drift). A separate `Database Migrations` workflow also runs on pushes that touch `packages/db/**`.
- Production app deployments from GitHub Actions must be selective: on push to `main`, deploy only the apps whose related paths changed instead of deploying every app.
- Use `DATABASE_URL` from AWS RDS for API runtime (set via `fly secrets set DATABASE_URL=...`).
- Runtime baseline is Node `22.12.x` for local, CI, and Docker builds.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend `NEXT_PUBLIC_API_URL` pointed to the Fly.io app URL.
- Keep `ENABLE_SCHEDULERS=false` on the API and `ENABLE_SCHEDULERS=true` on the worker once the split is live.
- Keep each Worker entry bundle within the deployed Cloudflare plan limit: 3 MB gzip on Workers Free and 10 MB gzip on Workers Paid. `apps/app` production and staging builds keep the default 3 MB gzip guard so they remain deployable without relying on the paid-size allowance. Use `node scripts/checks/check-worker-size.mjs` after OpenNext builds.
- Deploy order: run DB migrations first, then deploy API and worker, then deploy frontends.
- Keep `open-next.config.ts` and `wrangler.toml` in sync for Next.js frontend apps.
- Keep `astro.config.mjs` and `wrangler.toml` in sync for `apps/landing`.
- Keep API autostop enabled for the initial low-traffic phase so Fly can scale request-serving machines to zero when idle.
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
- The Fly worker deployment uses [`apps/worker/fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/fly.toml) and [`apps/worker/Dockerfile`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/Dockerfile) (no HTTP service; runs `dist/worker/src/main.js` in the image). For local runs against production-like settings, use `apps/worker/.env.production` (gitignored), not `apps/api/.env.production`.
- GitHub Actions API deploys must resolve the Fly app name from [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml) and deploy with that config, rather than relying on a separate hardcoded app value in workflow logic.
- For GitHub Actions API deploys, add `FLY_API_TOKEN` as a repository secret.
- The worker app uses [`apps/worker/fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/fly.toml), builds from `apps/worker/Dockerfile`, and should use `--ha=false` so Fly does not create a standby machine for the no-service worker process.
- Keep `auto_stop_machines = "suspend"` and `min_machines_running = 1` for the production API. The always-available floor avoids clinician-facing wake timeouts while additional capacity can still suspend when idle.
- Do not scale the no-service worker to zero unless scheduler and queue wake-up behavior has a separate trigger; it does not receive HTTP traffic that Fly can use for autostart.
- Verify the API image locally before infra changes with:

```bash
docker build -f apps/api/Dockerfile -t docita-api-verify .
```

- Verify the worker image locally before worker deploy changes with:

```bash
docker build -f apps/worker/Dockerfile -t docita-worker-verify .
```

Secrets required (set via `fly secrets set KEY=value`):
- `DATABASE_URL` — AWS RDS connection string as **`docita_app`** (non-owner) when `RLS_ENABLED=true`
- `JWT_SECRET` — minimum 32 characters
- `ENCRYPTION_KEY` — 64-character hex key
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `ZEPTOMAIL_SENDMAIL_TOKEN`
- `ZEPTOMAIL_API_URL` — use `https://api.zeptomail.in/v1.1/email` for India agents, or `https://api.zeptomail.com/v1.1/email` for global agents (must match your ZeptoMail account region)
- `EMAIL_FROM` — verified sender in your ZeptoMail agent (default `Docita <notifications@docita.work>`)
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

## Data Migrations (Backfill-Only)

Schema migrations (DDL) are applied automatically. **Data migrations** that rewrite existing rows are a separate concern — they ship as the same `prisma migrate deploy` artifact but are *safe to defer* and *idempotent on re-run*.

### `20260715100000_normalize_patient_phone_to_e164` — Patient phone to E.164

Backfill that rewrites legacy bare-10-digit Indian mobile numbers on `Patient.phoneNumber` to E.164 (`+91XXXXXXXXXX`). Shipped with the read-side tolerant-lookup fix in [`prisma-patient.repository.ts`](../../apps/api/src/domains/patients/infrastructure/persistence/prisma-patient.repository.ts) and the write-side normalization in [`patient.mapper.ts`](../../apps/api/src/domains/patients/infrastructure/mappers/patient.mapper.ts) so new and old data resolve identically.

**Properties:**
- Idempotent: the `WHERE "phoneNumber" ~ '^\d{10}$'` predicate matches only bare-10-digit rows, so re-running is a no-op once normalized.
- Scope: only live rows (`"deletedAt" IS NULL`) — soft-deleted rows stay on the retention/anonymization path untouched.
- Concurrency: bumps `"version"` and `"updatedAt"` on every rewritten row, so any in-flight optimistic-concurrency update built from the pre-migration row will be rejected with a version mismatch. This is the desired behavior — the next write from the client re-reads and re-normalizes.
- India-only: the regex `^\d{10}$` only matches Indian mobile numbers. International numbers (US `+1…`, etc.) are not affected.

**Run order:** the read-side tolerant lookup (`{ in: phoneMatchCandidates(phone) }`) makes the API code-level fix land without the data migration. Deploy the code first, then run the data migration whenever convenient — there is no tight coupling.

**Dry-run first (recommended):**
```sql
SELECT COUNT(*) FROM "Patient"
  WHERE "phoneNumber" ~ '^\d{10}$' AND "deletedAt" IS NULL;
```

If the count is unexpectedly large (e.g. > 100k), pause and confirm scope before running.

**Post-migration verify:**
```sql
-- Should be 0 once the migration lands
SELECT COUNT(*) FROM "Patient"
  WHERE "phoneNumber" ~ '^\d{10}$' AND "deletedAt" IS NULL;

-- Spot-check: 1-2% of clinics with patients should show a mix of
-- +91…, 91…, and bare 10-digit; after the migration all should be +91…
SELECT "clinicId", "phoneNumber"
  FROM "Patient"
  WHERE "deletedAt" IS NULL
  ORDER BY "updatedAt" DESC
  LIMIT 20;
```

## Frontend Quick Guide

- Build `apps/app` with `pnpm build:app:cloudflare`.
- Build `apps/internal` with `pnpm build:internal:cloudflare`.
- Build `apps/landing` with `pnpm build:landing:cloudflare`.
- Preview each Worker locally with the matching `preview:*:cloudflare` script.
- Deploy each Worker with the matching `deploy:*:cloudflare` script.
- Frontend production deploys run through the path-scoped Cloudflare jobs in [`deploy.yml`](../../.github/workflows/deploy.yml) when repository credentials verify. Cloudflare Git integration or dashboard deploys remain the fallback.

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `docker build -f apps/api/Dockerfile -t docita-api-verify .`
- `docker build -f apps/worker/Dockerfile -t docita-worker-verify .`

## Post-merge production checklist (API + worker)

After merging to `main` and before or right after Fly deploys:

1. **`docita-api`**: set `ENABLE_SCHEDULERS=false` (Fly `[env]` or `fly secrets` as you prefer). Confirms HTTP API does not run `@Cron` handlers.
2. **`docita-worker`**: set `ENABLE_SCHEDULERS=true` and `QUEUE_BACKEND=postgres` (already in [`apps/worker/fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/apps/worker/fly.toml)); align secrets with `apps/worker/.env.production` locally for smoke tests only—**never commit** that file.
3. **Observe**: queue depth (`QueueJob` counts by status/name), `PdfJob` completion rate, worker logs for cron start lines, API RSS after the API scheduler flag is off.

## Optional next: scheduler-only modules (does this affect the main API?)

**Yes, in a good way**—if you complete this refactor, **`AppModule` (main API) imports less**: only HTTP/controllers and their dependencies, while cron-only providers live in modules imported by `WorkerModule` only.

**Today:** Many domain modules combine HTTP (`controllers`) and background (`@Cron`) providers. With `ENABLE_SCHEDULERS=false` on the API, Nest `ScheduleModule` is not loaded and `@Cron` handlers are disabled, but the API process may still construct scheduler **classes** and their dependency trees unless you split them out.

**Target:** For each mixed module (e.g. clinical, reminders, compliance), introduce a thin pair:

- `*Module` — controllers + sync services used by HTTP (imported by `AppModule`).
- `*SchedulerModule` or `*.worker.module.ts` — only `@Injectable` classes with `@Cron` plus minimal deps (imported by `WorkerModule` only).

**Suggested order (incremental, low risk):**

1. Inventory: list every `@Cron` and its host class (already grep-friendly under `apps/api/src`).
2. Extract one domain at a time: move the cron provider + required deps into a new module; re-export HTTP surface from the original module unchanged.
3. **API:** remove the cron-only module import from `app.module.ts` once HTTP tests pass without it.
4. **Worker:** add the new scheduler module to `worker.module.ts` if not already covered by a worker-specific module.
5. Measure RSS on API and worker after each slice.

This is a larger change than env/Fly wiring; ship it in small PRs behind the same `ENABLE_SCHEDULERS` split so rollback is flipping env on Fly.

## Deployment strategy (API)

Production API deploys from GitHub Actions use **Fly.io blue-green** (`flyctl deploy --strategy bluegreen`):

1. Fly starts new machines with the updated image.
2. Health checks on `GET /api/health/live` must pass.
3. Traffic shifts to the new machines; old machines are drained and removed.

This gives near-instant rollback via `fly releases rollback` without a separate green environment. The worker has no HTTP service and continues to use a rolling deploy (`--ha=false`).

After each API deploy, **synthetic uptime probes** run automatically (`pnpm monitor:synthetic`). Failures block the deploy job and emit a Sentry event when `SENTRY_DSN` is configured. Scheduled probes run 3x/day during IST business hours via [`.github/workflows/synthetic-monitoring.yml`](../../.github/workflows/synthetic-monitoring.yml) — see [`SYNTHETIC_MONITORING.md`](./SYNTHETIC_MONITORING.md) for the full alerting matrix including Fly auto-recovery.

## Row-level security (production)

`RLS_ENABLED=true` is set in [`fly.toml`](../../fly.toml) and [`apps/worker/fly.toml`](../../apps/worker/fly.toml). Local development keeps `RLS_ENABLED=false` in `.env.example`.

**Required before enforcement binds:** `DATABASE_URL` in Fly secrets must connect as the non-owner `docita_app` role (not the RDS owner). Owner connections bypass RLS even when the app flag is on. Provision with [`packages/db/scripts/provision-docita-app-role.sql`](../../packages/db/scripts/provision-docita-app-role.sql) — see [`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md).

## Roll back a bad release

The migration policy is **additive-only** (see `MIGRATION_NOTES.md`), so a release rollback is always a code/image rollback — never a schema rollback. Redeploying the previous image against the current schema is safe.

### API or worker (Fly.io)

```bash
# List recent releases for the affected app
fly releases --app docita-api          # or docita-worker

# Roll back to the previous release (image + config)
fly releases rollback <VERSION> --app docita-api

# Confirm health
curl -fsS https://api.docita.work/api/health/live
fly logs --app docita-api | head -50
```

Notes:
- `fly releases rollback` redeploys the prior image; it does not touch the database. Any migration applied by the bad release stays applied — that is intentional and safe under the additive-only policy.
- If the bad release introduced a `fly secrets set` change that is part of the regression, revert the secret separately with `fly secrets set KEY=<previous-value>`; `releases rollback` will not revert secrets.
- For the worker, also confirm cron heartbeat lines in `fly logs --app docita-worker` and that `QueueJob` depth is draining.

### Frontend (Cloudflare Workers)

Production frontend deploys can run from GitHub Actions via the Cloudflare jobs in
[`deploy.yml`](../../.github/workflows/deploy.yml)
when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are
set and pass [`scripts/deploy/verify-cloudflare-deploy-credentials.mjs`](../../scripts/deploy/verify-cloudflare-deploy-credentials.mjs)
(token verify, account scope, and `Zone > Workers Routes` read access on
`docita.work`). Use the **Edit Cloudflare Workers** API token template scoped to
the production account; if deploy fails with `Authentication error [code: 10000]`
on `/zones/.../workers/routes`, rotate the token with Workers Routes permission
for that zone. Until credentials verify, the workflow skips deploy (warning) and
Cloudflare Git integration / dashboard deploys remain the fallback. To roll back:

1. Open the Cloudflare dashboard → Workers & Pages → the affected app (`docita-app`, `docita-internal`, or `docita-landing`).
2. Under **Deployments**, locate the last known-good deployment and choose **Rollback to this deployment**.
3. Verify the rollback by hitting the public URL and checking the browser console for chunk-load errors.

### Decision guide

| Symptom | Action |
|---|---|
| API 5xx spike or crash loop after deploy | `fly releases rollback` on `docita-api` |
| Background jobs failing or cron not firing | `fly releases rollback` on `docita-worker` |
| Frontend white screen / chunk errors after deploy | Cloudflare dashboard rollback on the affected app |
| DB schema drift detected by `verify-db-schema-sync.sh` | Do **not** roll back the migration — fix forward with a new additive migration |
| Secret-driven regression (auth, payments, R2) | Revert the secret via `fly secrets set`, then redeploy if needed |

### After rollback

- Page the on-call channel with the affected app, the rolled-to version, and the failing version.
- Open a Sentry filter for the failing release tag to scope the post-mortem.
- Confirm the synthetic monitor (`/api/v1/health` + `/api/v1/auth/me` smoke — see [`SYNTHETIC_MONITORING.md`](./SYNTHETIC_MONITORING.md)) returns green for one full interval before closing the incident.

## Scaling Path

| Stage | API | Database | Cache / Background Work |
|-------|-----|----------|--------------------------|
| 0–20 clinics | Fly.io 1 GB shared, single machine | RDS `db.t4g.micro` | In-process memory cache + worker-backed background work |
| 20–50 clinics | Fly.io 2 GB shared, single machine | RDS `db.t3.small` | In-process memory cache + worker-backed background work |
| 50–100 clinics | Fly.io 4 GB dedicated | RDS `db.t3.medium` + read replica | PostgreSQL-backed worker handles background work before scaling API horizontally |
| 100+ clinics | Fly.io multi-machine or ECS | RDS `db.r6g.large` + PgBouncer | Durable worker system required; re-evaluate dedicated cache only if needed |

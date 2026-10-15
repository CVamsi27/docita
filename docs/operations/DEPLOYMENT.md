# Deployment Strategy

The stability candidate minimizes API/worker runtime images to compiled Node
artifacts and required native libraries. Run pnpm migration/repair tools from
the trusted checkout or CI. Do not depend on npm/pnpm inside Fly runtime images;
current Fly configs have no release command and CI runs migrations separately.

> **Vite SPA apps (`apps/app`, `apps/internal`)**: see
> [`CLOUDFLARE_VITE_DEPLOYMENT.md`](./CLOUDFLARE_VITE_DEPLOYMENT.md) for the
> focused Cloudflare strategy (topology, caching, proxy contract, CI flow,
> rollback, failure modes).

## Current runtime verification, 13 October 2026

The actual API connection points to Neon PostgreSQL in Singapore and uses the
owner role; see [RLS rollout](../compliance/RLS_ROLLOUT.md) and [recovery
verification](DR_RUNBOOK.md#current-provider-verification-13-october-2026).
The legacy RDS snapshot job is not a verified backup path for this database.
Deployment triggers remain paused. Restore verification, current staging,
non-owner rollout and release evidence must precede reactivation or a production
code release. The operator chose to retain API idle shutdown during the freeze;
a cold start was observed at approximately 28 seconds.

## Recorded production topology

- Frontend
  - `apps/app`: Cloudflare Workers with Static Assets (Vite SPA + Hono proxy Worker)
  - `apps/internal`: Cloudflare Workers with Static Assets (Vite SPA + Hono proxy Worker)
  - `apps/landing`: Cloudflare Workers (Astro)
- Backend
  - `apps/api`: Fly.io (Singapore — `sin` region since 2026-07-29; was `bom` Mumbai), 2 GB RAM, shared CPU
  - `docita-worker` (Fly app): `apps/worker` Nest entry (imports `apps/api` worker modules), background jobs and crons (same `sin` region)
- Database
  - AWS RDS PostgreSQL — `ap-south-1` (Mumbai), `db.t4g.micro`
- Cache / Background Work
  - In-process memory cache in the API + PostgreSQL-backed worker jobs in Fly worker
- Object Storage
  - Cloudflare R2 (`STORAGE_PROVIDER=r2`)

Backend infrastructure is co-located in Singapore (`sin` region) for low-latency API responses; the database remains in Mumbai (`ap-south-1`) for DPDP compliance.

## Operational Rules

- Run Prisma migrations before each API or worker deploy. The production deploy workflow applies migrations whenever `apps/api`, `apps/worker`, or shared API packages change, then blocks Fly deploy until `scripts/deploy/verify-db-schema-sync.sh` passes (no pending migrations, no schema drift). A separate `Database Migrations` workflow also runs on pushes that touch `packages/db/**`.
- Production app deployments from GitHub Actions must be selective: on push to `main`, deploy only the apps whose related paths changed instead of deploying every app.
- Use `DATABASE_URL` from AWS RDS for API runtime (set via `fly secrets set DATABASE_URL=...`).
- Runtime baseline is Node `22.22.x` for local, CI, and Docker builds.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend `VITE_API_URL` pointed to the Fly.io app URL. In production the proxy Worker uses `API_PROXY_TARGET` to forward `/api/*` and `/socket.io/*` to the backend. The API process reads its own public URLs from `FRONTEND_URL` / `API_PUBLIC_URL` (legacy `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` aliases still accepted during the compatibility rollout).
- Keep `ENABLE_SCHEDULERS=false` on the API and `ENABLE_SCHEDULERS=true` on the worker once the split is live.
- Keep each Worker entry bundle within the deployed Cloudflare plan limit: 3 MB gzip on Workers Free and 10 MB gzip on Workers Paid. The Vite SPA apps serve static assets from Cloudflare edge and only ship the tiny Hono proxy Worker (`apps/app/api/index.ts`, `apps/internal/api/index.ts`) — no OpenNext runtime. Use `node scripts/checks/check-worker-size.mjs` after builds.
- Deploy order: run DB migrations first, then deploy API and worker, then deploy frontends.
- Keep `wrangler.toml` (static assets dir, `main = "api/index.ts"`) and `vite.config.ts` in sync for the Vite frontend apps.
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

- The Fly API deployment uses [`fly.toml`](../../fly.toml) and [`apps/api/Dockerfile`](../../apps/api/Dockerfile).
- The Fly worker deployment uses [`apps/worker/fly.toml`](../../apps/worker/fly.toml) and [`apps/worker/Dockerfile`](../../apps/worker/Dockerfile) (no HTTP service; runs `dist/worker/src/main.js` in the image). For local runs against production-like settings, use `apps/worker/.env.production` (gitignored), not `apps/api/.env.production`.
- GitHub Actions API deploys must resolve the Fly app name from [`fly.toml`](../../fly.toml) and deploy with that config, rather than relying on a separate hardcoded app value in workflow logic.
- For GitHub Actions API deploys, add `FLY_API_TOKEN` as a repository secret.
- The worker app uses [`apps/worker/fly.toml`](../../apps/worker/fly.toml), builds from `apps/worker/Dockerfile`, and should use `--ha=false` so Fly does not create a standby machine for the no-service worker process.
- Keep `auto_stop_machines = "suspend"` and `min_machines_running = 0` for the production API. Scale-to-zero saves cost during off-hours; cold starts are bounded by synthetic probes which wake the app.
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

Schema migrations (DDL) are applied automatically. **Data migrations** that rewrite existing rows are a separate concern — they ship as the same `prisma migrate deploy` artifact but are _safe to defer_ and _idempotent on re-run_.

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
- The Vite SPA build outputs static assets to `dist/` plus `_headers`/`_redirects`; `wrangler deploy` ships both the assets and the proxy Worker (`main = "api/index.ts"`) in one command.
- The root `pnpm build` is a compile gate. Deploy through the `deploy:*:cloudflare` scripts, which run `build:*:cloudflare` (for landing this also applies the Astro manifest-injection patch that Cloudflare deploys require — a plain-build `dist/` is not deployable).

## Release Gates

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @docita/api run test:e2e`
- `docker build -f apps/api/Dockerfile -t docita-api-verify .`
- `docker build -f apps/worker/Dockerfile -t docita-worker-verify .`

For each release, record the evidence (commit, CI run, test counts, E2E/a11y/perf
artifacts, deploy IDs, migration, smoke results, rollback rehearsal, post-release
health) in [`RELEASE_EVIDENCE_CHECKLIST.md`](RELEASE_EVIDENCE_CHECKLIST.md).

## Post-merge production checklist (API + worker)

After merging to `main` and before or right after Fly deploys:

1. **`docita-api`**: set `ENABLE_SCHEDULERS=false` (Fly `[env]` or `fly secrets` as you prefer). Confirms HTTP API does not run `@Cron` handlers.
2. **`docita-worker`**: set `ENABLE_SCHEDULERS=true` and `QUEUE_BACKEND=postgres` (already in [`apps/worker/fly.toml`](../../apps/worker/fly.toml)); align secrets with `apps/worker/.env.production` locally for smoke tests only—**never commit** that file.
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

For recovery, redeploy an operator-selected known-good image through
`pnpm rollback:fly` as described below. The worker has no HTTP service and
uses a rolling deploy with `--ha=false`.

The deployment workflow defines **synthetic uptime probes**
(`pnpm monitor:synthetic`) and Sentry failure reporting when `SENTRY_DSN` is
configured. Verify the deploy and scheduled workflows are enabled and alerts
are delivered before relying on those gates. See
[`synthetic-monitoring.yml`](../../.github/workflows/synthetic-monitoring.yml)
and [`SYNTHETIC_MONITORING.md`](./SYNTHETIC_MONITORING.md).

## Row-level security (production)

`RLS_ENABLED=true` is set in [`fly.toml`](../../fly.toml) and [`apps/worker/fly.toml`](../../apps/worker/fly.toml). Local development keeps `RLS_ENABLED=false` in `.env.example`.

**Required before enforcement binds:** `DATABASE_URL` in Fly secrets must connect as the non-owner `docita_app` role (not the RDS owner). Owner connections bypass RLS even when the app flag is on. Provision with [`packages/db/scripts/provision-docita-app-role.sql`](../../packages/db/scripts/provision-docita-app-role.sql) — see [`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md).

## Roll back a bad release

Use a code/image rollback only after checking the selected image against the
current schema and configuration. The **additive-only** migration policy
([`MIGRATION_NOTES.md`](MIGRATION_NOTES.md)) reduces risk; it does not prove that
an older image is compatible. Schema corrections use reviewed additive forward
migrations, not automatic execution of historical `down.sql` files.

### API or worker (Fly.io)

```bash
# List recorded image references for the affected app
flyctl releases --app docita-api --image
# Worker: flyctl releases --app docita-worker --image

# Set RECORDED_API_IMAGE to the selected compatible image from release evidence.
pnpm rollback:fly --config fly.toml --image "$RECORDED_API_IMAGE"
# Worker: select its own RECORDED_WORKER_IMAGE, then run:
# pnpm rollback:fly --config apps/worker/fly.toml --image "$RECORDED_WORKER_IMAGE"

# Confirm liveness and dependency readiness
curl -fsS https://api.docita.work/api/health/live
curl -fsS https://api.docita.work/api/health/ready
flyctl status --app docita-api
```

The [rollback helper](../../scripts/deploy/rollback-fly-image.mjs) validates the
configured app/region and image ownership. It preserves API blue-green versus
worker rolling deployment, and passes `--skip-release-command` so recovery does
not run a release-hook migration. Current config and secrets remain in effect;
Fly image recovery does not restore their previous values or reverse database
changes. See the [Fly rollback guide](https://docs.fly.io/blueprints/rollback-guide/).

Keep secret values out of release evidence, shell command arguments and logs.
Record variable names and protected version references only; use
[`SECRET_ROTATION_CHECKLIST.md`](SECRET_ROTATION_CHECKLIST.md) for credential
restoration. For a worker recovery, verify scheduler heartbeat and queue depth
trend; API health alone does not establish worker recovery.

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

For a CLI recovery, select the known-good **Worker version ID** from the
affected Worker's deployment evidence. Run from the repository root:

```bash
pnpm --filter @docita/app exec wrangler rollback "$KNOWN_GOOD_APP_VERSION_ID" --config wrangler.toml --env production
pnpm --filter @docita/internal exec wrangler rollback "$KNOWN_GOOD_INTERNAL_VERSION_ID" --config wrangler.toml --env production
pnpm --filter @docita/landing exec wrangler rollback "$KNOWN_GOOD_LANDING_VERSION_ID" --config wrangler.toml
```

Run only the affected workspace command. App/internal use their configured
production environment; landing uses its top-level production config. An
omitted version ID would select a predecessor automatically, so always supply
the reviewed ID. Verify the matching assets, routes, bindings and secret
compatibility before recovery. [Wrangler rollback reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/#rollback).

### Decision guide

| Symptom                                                  | Action                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API 5xx spike or crash loop after deploy                 | Redeploy its selected compatible image with `pnpm rollback:fly --config fly.toml --image "$RECORDED_API_IMAGE"`                |
| Background jobs failing or cron not firing               | Redeploy its selected compatible image with `pnpm rollback:fly --config apps/worker/fly.toml --image "$RECORDED_WORKER_IMAGE"` |
| Frontend white screen / chunk errors after deploy        | Cloudflare dashboard rollback on the affected app                                                                              |
| Public API returns 525 while the Fly hostname is healthy | Check custom-domain certificate and DNS ownership first; see [upstream playbook](playbooks/cloudflare-upstream-timeout.md)     |
| DB schema drift detected by `verify-db-schema-sync.sh`   | Do **not** roll back the migration — fix forward with a new additive migration                                                 |
| Secret-driven regression (auth, payments, R2)            | Follow protected credential restoration in `SECRET_ROTATION_CHECKLIST.md`; record names/version references only                |

### After rollback

- Page the on-call channel with the affected app, the rolled-to version, and the failing version.
- Open a Sentry filter for the failing release tag to scope the post-mortem.
- Confirm direct/public/proxied `/api/health/live` and `/api/health/ready`, then
  authenticated `/api/v1/auth/me` smoke. Verify that the synthetic monitor is
  enabled and delivers alerts before relying on its recovery window; see
  [`SYNTHETIC_MONITORING.md`](./SYNTHETIC_MONITORING.md).

## Scaling Path

| Stage          | API                                | Database                          | Cache / Background Work                                                          |
| -------------- | ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| 0–20 clinics   | Fly.io 1 GB shared, single machine | RDS `db.t4g.micro`                | In-process memory cache + worker-backed background work                          |
| 20–50 clinics  | Fly.io 2 GB shared, single machine | RDS `db.t3.small`                 | In-process memory cache + worker-backed background work                          |
| 50–100 clinics | Fly.io 4 GB dedicated              | RDS `db.t3.medium` + read replica | PostgreSQL-backed worker handles background work before scaling API horizontally |
| 100+ clinics   | Fly.io multi-machine or ECS        | RDS `db.r6g.large` + PgBouncer    | Durable worker system required; re-evaluate dedicated cache only if needed       |

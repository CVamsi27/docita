# Cost Analysis — Infra, CI Minutes, Debt

Point-in-time: **2026-08-01**. Sources: `fly.toml`, `apps/worker/fly.toml`, `.github/workflows/*`, `DEPLOYMENT.md`, `pnpm-lock.yaml`, `node_modules` size.

## 1. Runtime (current, small-clinic scale)

| Component | Provider | Config | Est. monthly |
|---|---|---|---|
| API | Fly.io | 1 × 2 GB machine, **scale-to-zero off-hours** (`min_machines_running=0`, `scale-api-hours` 03:00/15:00 UTC) | ~$0–15 |
| Worker | Fly.io | 1 × 512 MB machine | ~$5–10 |
| DB | AWS RDS | `db.t4g.micro` (Mumbai ap-south-1) | ~$10–15 |
| Cloudflare | Workers + static assets (app, internal, landing) | free tier | $0 |
| Sentry | SaaS | dev-tier | $0 |
| Render | staging API auto-deploys from `staging` branch | — | $0–7 |
| **Total** | | | **~$20–50** |

Staging is a separate RDS instance + Render service — the second-largest line item after prod.

## 2. Growth ladder (DEPLOYMENT.md §7)

DB: `t4g.micro` → `t3.small` (20–50 clinics) → `t3.medium` + read replica (50–100) → `r6g.large` + PgBouncer (100+). API/worker scale linearly behind it; scale-to-zero is the current elasticity lever.

## 3. CI minutes (the silent line item)

- **8 workflows**; heavy jobs (verify:standard ~80+ checks, full build, api-e2e, bundle analysis) run on push-to-main or path-scoped; PR jobs are per-app scoped (§11.2).
- Scheduled: `frontend-critical-e2e` weekly, `container-scan` weekly, `synthetic-monitoring` 3×/business day (probes wake the app — cheap, but counts against Fly machine-seconds).
- **Cost-leak found 2026-07-31**: `ci.yml` still ran `app`/`internal` quality jobs (dead Next apps) and `deploy.yml` had dead `deploy-app`/`deploy-internal` jobs — all removed, redeploying minutes/hours to real work.
- Knip runs only when `knipChange` scope triggers (workflow-only edits skip) — deliberate minute conservation.

## 4. Repo-weight debt (local/dev cost)

| Metric | Value |
|---|---|
| node_modules | 2.6 GB |
| pnpm-lock.yaml packages | 2,761 (2,266 .pnpm dirs) |
| .git | 141 MB (repo root 4.0 GB on disk) |
| install time | minutes (frozen-lockfile CI path) |

**Dependency counts per workspace package**:

| Package | Deps | Breakdown |
|---|---|---|
| apps/api | 85 | NestJS (core+common+platform-express), Prisma, class-validator, rxjs, Sentry, OpenAI, otplib, he, ioredis |
| apps/worker | 66 | Shares API infra + bullmq, node-cron |
| packages/ui | 54 | 20× Radix UI, Tailwind, lucide-react, react-hook-form, zod, cmdk, react-day-picker |
| packages/hooks | 12 | Framework-agnostic React hooks |
| packages/utils | 11 | date-fns, libphonenumber-js, zod |
| packages/data-access | 10 | axios, @tanstack/react-query |
| packages/types | 7 | zod, date-fns-tz |
| packages/auth | 6 | jose, argon2, otplib |

Kitchen-sink candidates (see trash inventory): the `*-helpers` passthroughs in `@workspace/utils`, and the redundant audit/archival+`AUDIT_EXPORT` design-only docs.

## 5. Levers (recommendation order)

1. **Already done**: dead CI jobs removed 2026-08-01 → minutes return.
2. Post-cutover: `git gc --aggressive` + `git count-objects` check (141 MB .git holds the full Next history — expected until port history is pruned post-cutover).
3. Audit `@workspace/utils`/`ui` exports after port (knip) — every unused export is install/build tax across 4 apps.
4. Revisit scale-to-zero: if synthetic probes wake the app often (they do), the 1↔0 flip trades minutes for cold starts; at 20+ clinics, keep 1 machine 24/7 and drop the cron.
5. Bundle: 755 KB gzip total is fine for v1; route budgets + lazy-loading cap growth without new spend.

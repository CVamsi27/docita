# Phase 1 Go-Live Command Sheet (Vercel + Railway + Neon)

## Scope

Command-only quick sheet for production go-live with:

- Frontend: Vercel (`apps/landing`, `apps/app`, `apps/admin`)
- API: Railway (`apps/api`)
- Database: Neon PostgreSQL

Use with:

- `PHASE1_RAILWAY_NEON_RUNBOOK.md`
- `NEON_PRODUCTION_CHECKLIST.md`

## 0) Operator Inputs (set before start)

```bash
export DOMAIN="<your-domain.com>"
export API_BASE="https://api.${DOMAIN}/api/v1"
export RAILWAY_ENV="production"
```

## 1) Preflight

```bash
pnpm -v
node -v
railway --version
vercel --version
```

```bash
# Confirm repo root
pwd
```

```bash
# Install deps exactly from lockfile
pnpm install --frozen-lockfile
```

```bash
# Build critical packages/apps
pnpm --filter @workspace/db build
pnpm --filter @workspace/types build
pnpm --filter @docita/api build
```

## 2) Railway Deploy (API)

```bash
railway login
railway link
railway environment $RAILWAY_ENV
railway up
```

```bash
# Apply DB migrations against production DATABASE_URL in Railway env
railway run pnpm db:migrate:deploy
```

```bash
# Quick runtime logs
railway logs
```

## 3) Vercel Deploy (Frontends)

Run from each app directory if not using connected Git auto-deploy:

```bash
# Landing
cd apps/landing && vercel --prod && cd -

# App
cd apps/app && vercel --prod && cd -

# Admin
cd apps/admin && vercel --prod && cd -
```

## 4) DNS + Health Validation

```bash
curl -sS "${API_BASE}/health/live"
curl -sS "${API_BASE}/health/ready"
curl -sS "${API_BASE}/health/db"
```

```bash
# Optional: inspect headers/status quickly
curl -i "${API_BASE}/health/live"
```

## 5) Functional Smoke (manual)

- Login from app and admin succeeds.
- Patient search/list works.
- Appointment creation works.
- Billing flow loads without API errors.

## 6) Rollback Commands (if go-live fails)

```bash
# API rollback: redeploy prior Railway release from dashboard/CLI history.
# Frontend rollback: promote previous Vercel deployment from dashboard.
# DB rollback: restore Neon PITR snapshot and re-point DATABASE_URL if required.
```

## 7) Exit Criteria

- Health endpoints stable for at least 30 minutes.
- No migration errors from `db:migrate:deploy`.
- No elevated 5xx in Railway logs.
- Core smoke flows pass.

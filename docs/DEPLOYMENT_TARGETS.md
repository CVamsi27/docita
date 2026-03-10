# Deployment Targets

This repository is configured for:

- Cloudflare Pages + Workers (`apps/app`)
- Vercel (`apps/admin`, `apps/landing`)
- Railway (API service)
- Neon (PostgreSQL)
- GitHub Actions for DB migrations

## Required GitHub Secrets

### Cloudflare (App)
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

### Vercel (Admin + Landing)
- VERCEL_APP_DEPLOY_HOOK
- VERCEL_ADMIN_DEPLOY_HOOK
- VERCEL_LANDING_DEPLOY_HOOK

### Railway
- RAILWAY_TOKEN
- RAILWAY_SERVICE_NAME (optional, defaults to `api`)

### Neon
- NEON_DATABASE_URL

## Workflows

- `.github/workflows/deploy-platforms.yml`
  - Triggers Vercel deploy hooks
  - Deploys API to Railway

- `.github/workflows/db-neon-migrations.yml`
  - Applies Prisma migrations to Neon on schema/migration changes
  - Can also be run manually via workflow_dispatch

## Notes

- Keep `.env.example` aligned with runtime minimums.
- Ensure Railway service has all required env vars before deploy.
- Neon migration workflow uses `prisma migrate deploy` (safe for CI/CD).
- App-only Cloudflare cutover guide: `docs/deployment/APP_VERCEL_TO_CLOUDFLARE_MIGRATION.md`.
- App Cloudflare deploy workflow: `.github/workflows/deploy-app-cloudflare.yml`.

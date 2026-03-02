# Deployment Targets

This repository is configured for:

- Vercel (frontend apps)
- Railway (API service)
- Neon (PostgreSQL)
- GitHub Actions for DB migrations

## Required GitHub Secrets

### Vercel
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

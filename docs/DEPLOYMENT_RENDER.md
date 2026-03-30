# Render Deployment Guide

Render remains the active backend deployment target.

For canonical strategy and future AWS migration direction, use:

- [`docs/deployment/DEPLOYMENT.md`](./deployment/DEPLOYMENT.md)

## Active Path

- Deploy `apps/api` as Render Web Service.
- Use Render PostgreSQL for `DATABASE_URL`.
- Run migrations via `pnpm db:deploy` before or during release.
- Health endpoint: `GET /api/health/live`.

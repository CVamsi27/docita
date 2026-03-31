# Deployment Strategy

## Current Production Baseline

- Frontend
  - `apps/app`: Cloudflare (OpenNext)
  - `apps/admin`: Vercel
  - `apps/landing`: Vercel
- Backend
  - `apps/api`: Render Web Service
- Database
  - Render PostgreSQL

This is the active production strategy.

## Operational Rules

- Run Prisma migrations before each API deploy.
- Use Render database `DATABASE_URL` for API runtime.
- Keep API health checks on `GET /api/health/live`.
- Keep frontend API URLs pointed to the deployed Render API URL.

## Migration Target (Planned)

- Frontend
  - Vercel + Cloudflare (as needed per app/runtime)
- Backend
  - AWS App Runner (intermediate)
  - AWS ECS in Hyderabad (target steady state)
- Database
  - AWS RDS PostgreSQL in Hyderabad
- Object Storage
  - AWS S3

## Migration Readiness Checklist

1. Keep deployment configs environment-driven and platform-agnostic.
2. Keep API container image build reproducible and registry-compatible.
3. Keep migration steps idempotent (`prisma migrate deploy`).
4. Keep health/readiness probes stable across platforms.
5. Keep infrastructure docs split by current and future states.

## Render Quick Guide

- Deploy `apps/api` as Render Web Service.
- Use Render PostgreSQL for `DATABASE_URL`.
- Run migrations via `pnpm db:deploy` before or during release.
- Health endpoint: `GET /api/health/live`.

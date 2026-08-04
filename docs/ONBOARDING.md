# Onboarding Quick Start

For the full 30-minute local setup guide, use
[`product/ONBOARDING.md`](product/ONBOARDING.md). This page keeps the shortest
supported command path for experienced contributors.

This is the shortest supported path from a clean clone to local development.

## Prerequisites

- Node.js `>=22.12.0`
- `pnpm@10.30.3`
- Local Postgres and Redis, or the team-approved dev containers
- Environment files copied from each `.env.example`

## Setup

```bash
pnpm install
pnpm db:generate
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm dev
```

## Required Environment

Start with root `.env.example`, then app-specific examples:

- `apps/api/.env.example`
- `apps/app-vite/.env.example`
- `apps/internal-vite/.env.example`
- `apps/landing/.env.example`

Critical variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `VITE_API_URL` (frontend apps; build-time inlined from each app's `.env.example`)
- `NEXT_PUBLIC_API_URL` (API process only — a historical key name on the backend, unrelated to the frontend `VITE_*` rename; the frontend no longer reads it)

## Verification

```bash
pnpm lint
pnpm verify:standard
pnpm knip
pnpm test
pnpm build
```

Architecture and pattern references live in [`AGENTS.md`](../AGENTS.md).

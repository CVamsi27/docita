# Quickstart

This guide gets a developer running Docita locally in ~10 minutes.

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker Desktop (recommended for local infra)

## 1) Clone and Install

```bash
git clone <repo-url>
cd docita
pnpm install
```

## 2) Environment Setup

Create env files from examples and populate required values.

Minimum required for API startup typically includes:
- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

If using Redis/features requiring external services, set those too.

## 3) Start Local Infrastructure

If using Docker Compose:

```bash
docker compose up -d
```

## 4) Generate Prisma Client + Apply Schema

```bash
pnpm db:generate
pnpm db:push
```

## 5) Start the Monorepo

```bash
pnpm dev
```

Typical local URLs:
- App: http://localhost:3000
- API: http://localhost:3001
- Admin/Landing: check app-specific scripts/ports

## 6) Validate Setup

```bash
pnpm lint
pnpm test
```

If tests are heavy, run targeted suites first (API/app-specific).

## 7) Common First Tasks

- Read `README.md` and `docs/ONBOARDING_ARCHITECTURE.md`
- Read `.github/copilot-instructions.md`
- Pick one feature folder and follow existing structure

## Troubleshooting

- DB connection errors: verify `DATABASE_URL` and DB container state.
- Auth/session issues: verify cookie/domain env settings.
- Build/type issues: run clean install (`pnpm install`) and regenerate Prisma client.
- Port conflicts: stop existing local processes and restart `pnpm dev`.

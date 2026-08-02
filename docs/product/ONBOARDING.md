# Onboarding — 30-Minute Setup Guide

Clone-to-running in under 30 minutes.

---

## 1. Prerequisites

| Tool | Required version | Install |
|------|-----------------|---------|
| Node.js | `>=22.12.0` | [nvm](https://github.com/nvm-sh/nvm) or direct |
| pnpm | `10.30.3` (exact) | `corepack enable && corepack prepare pnpm@10.30.3 --activate` |
| PostgreSQL | 15+ | `docker compose up -d db` (see §3) |

> Redis is **not** required for local dev. The queue backend defaults to `memory`
> (in-process, no separate process needed). Production uses the `QueueJob` table
> in PostgreSQL with `QUEUE_BACKEND=postgres`.

---

## 2. Clone and Install

```bash
git clone git@github.com:docita/docita.git
cd docita
pnpm install          # also runs postinstall → db:generate (Prisma client)
```

---

## 3. Start the Database

Spin up the local PostgreSQL container (port 5434):

```bash
docker compose up -d db
```

Credentials: `postgresql://docita:docita@localhost:5434/docita`
These match the default `DATABASE_URL` in `apps/api/.env.example`.

---

## 4. Environment Setup

Copy each `.env.example` to `.env.local` (Vite apps) or `.env` (API):

```bash
cp apps/api/.env.example        apps/api/.env
cp apps/app-vite/.env.example   apps/app-vite/.env.local
cp apps/internal-vite/.env.example apps/internal-vite/.env.local
cp apps/landing/.env.example    apps/landing/.env
# worker shares the API's compiled source — no separate .env needed locally
```

### Minimum required vars to fill in

**`apps/api/.env`**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Pre-filled: `postgresql://docita:docita@localhost:5434/docita` |
| `JWT_SECRET` | Random string ≥32 chars — `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Exactly 64 hex chars — `openssl rand -hex 32` |
| `APP_URL` | `http://localhost:3000` (pre-filled) |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (same-origin proxy — do **not** point the browser at `:3001` directly) |

Everything else has safe defaults for local dev. Payments, WhatsApp, R2,
Sentry, AI, and SMS keys can be left blank — features degrade gracefully.

**`apps/app-vite/.env.local` and `apps/internal-vite/.env.local`** — all values are
pre-filled with localhost URLs; no changes needed for local dev. Legacy `NEXT_PUBLIC_*` names are accepted as aliases for the `VITE_*` vars.

---

## 5. Database Setup

```bash
# Apply all pending Prisma migrations
pnpm --filter @workspace/db db:migrate

# Seed with local dev data (clinic, doctors, patients, schedules)
pnpm db:seed:local
```

---

## 6. Start Dev

```bash
pnpm dev
```

This runs `turbo dev` across `api`, `app`, `internal`, and `landing` with hot
reload. It also runs `scripts/db/db-check.mjs` to confirm PostgreSQL is reachable
before starting.

| App | URL |
|-----|-----|
| Clinic app (Vite SPA) | http://localhost:5173 |
| NestJS API | http://localhost:3001 |
| Internal admin (Vite SPA) | http://localhost:5174 |
| Landing (Astro) | http://localhost:3003 |

---

## 7. Local Dev Login Credentials

All seeded accounts share the password **`password123`**.

| Role | Email |
|------|-------|
| Internal super-admin | `admin@docita.work` |
| Clinic admin | `clinic.admin@docita.work` |
| Admin doctor | `admin.doctor@docita.work` |
| Doctor | `doctor@docita.work` |
| Receptionist | `reception@docita.work` |
| Nurse | `nurse@docita.work` |

Clinic: **Docita Health Clinic** (id: `default-clinic-id`, tier: `PROFESSIONAL`)

---

## 8. Verify Your Setup

```bash
pnpm lint               # ESLint across all packages
pnpm verify:standard    # Contract + structure checks
pnpm test               # Unit tests (turbo)
```

## 9. Further Reading

- Pattern Catalogue: `AGENTS.md` §15
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Deployment: `docs/operations/DEPLOYMENT.md`
- Testing: `docs/testing/TESTING.md`

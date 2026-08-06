# Docita - Modern Clinic Management OS

**The Bridge from Paper to Cloud.**
Modern clinic management that rescues your messy records. Start with Excel, scale to AI-powered healthcare.

## Live Demo

- **Landing**: [https://docita.work](https://docita.work), [https://www.docita.work](https://www.docita.work), [https://landing.docita.work](https://landing.docita.work)
- **App**: [https://app.docita.work](https://app.docita.work)
- **Internal**: [https://internal.docita.work](https://internal.docita.work)
- **API**: [https://api.docita.work](https://api.docita.work)
- **Repository**: [https://github.com/CVamsi27/docita](https://github.com/CVamsi27/docita)

## Features

- **Smart Scheduling**: Drag-and-drop calendar with automated reminders.
- **Patient Records**: Comprehensive EMR with history, vitals, and digital prescriptions.
- **Digital Billing**: Generate professional invoices and track payments.
- **WhatsApp Integration**: Automated patient communication for prescriptions and follow-ups.
- **Easy Migration**: Seamless import from Excel or paper records.
- **Secure & Private**: Enterprise-grade security and role-based access control.
- **Multi-Clinic Support**: Manage multiple clinics and doctors from a single account.

## Architecture

**Production deployment** (see [Deployment Strategy](docs/operations/DEPLOYMENT.md)):

```
Frontend (Cloudflare)                     Backend (Fly.io, Mumbai)
---------------------------------        ---------------------------
app, internal, landing  -->  apps/api (HTTP API)
                                         -->  apps/worker (jobs, crons)
Database: AWS RDS PostgreSQL (ap-south-1)
Object storage: Cloudflare R2
```

| Layer | Apps / services | Hosting |
| --- | --- | --- |
| Clinician app | `apps/app` | Cloudflare (Vite SPA + Static Assets) |
| Admin portal | `apps/internal` | Cloudflare (Vite SPA + Static Assets) |
| Marketing | `apps/landing` | Cloudflare Workers (Astro) |
| API | `apps/api` | Fly.io |
| Background worker | `apps/worker` | Fly.io |
| Database | Prisma via `packages/db` | AWS RDS PostgreSQL |

Shared logic lives in workspace packages (`packages/types`, `packages/data-access`, `packages/ui`, and others). Authoritative layout and rules: [AGENTS.md](AGENTS.md).

## Tech Stack

### Frontend

- **Frameworks**: Vite 6 + React 19 + React Router v7 (SPA) for `apps/app` and `apps/internal`, Astro 5 for `apps/landing`
- **UI**: React 19, Tailwind CSS 4, shared primitives in `packages/ui`
- **Icons**: Lucide Icons
- **Data fetching**: TanStack React Query via `packages/data-access`
- **Hosting**: Cloudflare Workers with Static Assets (tiny Hono proxy Worker for `/api/*`)

### Backend

- **Framework**: NestJS (`apps/api`, `apps/worker`)
- **ORM**: Prisma (`packages/db`)
- **Database**: PostgreSQL (AWS RDS in production)
- **Hosting**: Fly.io (API + worker)

### Infrastructure

- **Monorepo**: Turborepo
- **Package manager**: pnpm (`10.30.3`)
- **Container**: Docker (API/worker images)

## Repository Layout

```
docita/
├── apps/
│   ├── api/              NestJS API (domain-driven layout)
│   ├── worker/           NestJS background jobs and schedulers
│   ├── app/         Vite + React Router clinician app
│   ├── internal/    Vite + React Router admin portal
│   └── landing/          Astro marketing site
├── packages/         Shared types, data-access, ui, db, auth, hooks, utils
├── scripts/          CI checks, deploy helpers, perf and UI tooling
└── docs/             Architecture, operations, UI standards, testing
```

## Getting Started

### Prerequisites

- Node.js `>=22.22.0` (see root `package.json` `engines`)
- pnpm `10.30.3` (see root `package.json` `packageManager`)
- PostgreSQL (local or Docker)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/CVamsi27/docita.git
   cd docita
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment setup**

   Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, auth secrets, and other required variables. Frontend apps may need their own `.env` files for local API URLs.

4. **Database setup**

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

5. **Run development servers**

   ```bash
   pnpm dev
   ```

   - App: http://localhost:3000
   - API: http://localhost:3001

   Run a subset of apps:

   ```bash
   pnpm dev:app        # app + API
   pnpm dev:internal   # internal + API
   pnpm dev:landing    # landing only
   ```

## Contributing

- **`main`** is the canonical branch; open pull requests into `main` (never commit directly on `main` or `staging`).
- **`staging`** mirrors `main` for environment validation after merges.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before larger changes.

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/your-change
```

## Quick Local Checks

```bash
pnpm lint
pnpm test:unit:local   # fast loop for touched packages
pnpm test              # full monorepo test pipeline
pnpm verify:standard     # architecture and hygiene guardrails
```

## Documentation

- [AGENTS.md](AGENTS.md) — Mandatory rules for contributors and coding agents
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution workflow and review expectations
- [Deployment Strategy](docs/operations/DEPLOYMENT.md) — Production topology and runbooks
- [API Documentation](docs/architecture/API_DOCUMENTATION.md) — API reference
- [Testing Guide](docs/testing/TESTING.md) — Testing strategies and best practices
- [Zod Architecture](docs/architecture/zod-first-architecture.md) — Type system guide
- [Turborepo Structure](docs/architecture/TURBOREPO_STANDARD_STRUCTURE.md) — Monorepo standards
- [UI/UX Standard 2026](docs/ui/UI_UX_STANDARD_2026.md) — Authoritative UI contract for web apps

## Deployment

Production deploys are path-scoped: API and worker on Fly.io, frontends on Cloudflare, migrations before API/worker releases. See [Deployment Strategy](docs/operations/DEPLOYMENT.md) and [Staging Setup](docs/operations/STAGING.md).

## Staging

- **`staging` mirrors `main`**: it should match production-bound code; feature work merges via PR into `main`, then automation fast-forwards `staging`.
- Use staging deploy targets to validate the same tree as `main`.

## License

MIT

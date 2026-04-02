# Docita - Modern Clinic Management OS

**The Bridge from Paper to Cloud.**
Modern clinic management that rescues your messy records. Start with Excel, scale to AI-powered healthcare.

## Live Demo

- **Landing**: [https://landing.docita.work](https://landing.docita.work)
- **App**: [https://app.docita.work](https://app.docita.work)
- **Admin**: [https://admin.docita.work](https://admin.docita.work)
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

**Production Deployment**

```
Frontend                    Backend
---------                   -------
Cloudflare Workers (app/admin/landing) --> Render (NestJS API)
```

- **Database**: Render PostgreSQL
- **Backend**: Render Web Service (NestJS)
- **Frontend**: Cloudflare Workers (`apps/app`, `apps/landing`, `apps/admin`)

## Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Shadcn UI
- **Icons**: Lucide Icons
- **Data Fetching**: TanStack React Query
- **Hosting**: Cloudflare Workers (`apps/app`, `apps/landing`, `apps/admin`)

### Backend

- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: Render PostgreSQL
- **Hosting**: Render Web Service

### Infrastructure

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Container**: Docker

## Getting Started

### Prerequisites

- Node.js v20+
- pnpm v10+
- PostgreSQL

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

3. **Setup Environment**
   Copy `apps/api/.env.example` to `apps/api/.env` and configure your database URL.

4. **Database Setup**

   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. **Run Development Server**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Documentation

- [Deployment Strategy](docs/DEPLOYMENT.md) - Current production path, Render runbook, and future AWS migration target
- [API Documentation](docs/API_DOCUMENTATION.md) - API reference
- [Testing Guide](docs/TESTING.md) - Testing strategies and best practices
- [Zod Architecture](docs/zod-first-architecture.md) - Type system guide
- [Turborepo Structure](docs/TURBOREPO_STANDARD_STRUCTURE.md) - Monorepo standards
- [UI/UX Contract](docs/UI_UX_CONTRACT.md) - Shared page/state/motion standards for doctor app and portal

## Deployment

1. **Database**: Create Render PostgreSQL in Singapore
2. **Backend**: Deploy `apps/api` as a Render Web Service
3. **Frontend**: Deploy `apps/app`, `apps/landing`, and `apps/admin` to Cloudflare Workers with OpenNext

See [Deployment Strategy](docs/DEPLOYMENT.md) for current and future deployment direction.

## License

MIT

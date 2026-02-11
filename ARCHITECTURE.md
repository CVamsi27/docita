# Docita Architecture Overview

## 🏗️ System Overview

Docita is a modern Healthcare Practice Management System built as a monorepo. It manages patients, appointments, prescriptions, billing, and more for clinics and hospitals.

## 📦 Monorepo Structure

The project uses `pnpm` workspaces and `Turborepo` for build orchestration.

- **apps/**
  - **api**: NestJS backend service (REST API).
  - **app**: Next.js frontend (App Router).
- **packages/**
  - **db**: Prisma ORM, database schema, and migrations.
  - **types**: Shared TypeScript types and interfaces (DTOs, Enums).
  - **utils**: Shared utility functions.
  - **eslint-config**: Shared ESLint configurations.
  - **ui**: Shared UI component library (Shadcn/UI based).

## 🛠️ Technology Stack

- **Backend**: NestJS, Prisma, PostgreSQL (Neon), Redis.
- **Frontend**: Next.js, React, Tailwind CSS, Shadcn/UI.
- **Infrastructure**: Docker, GitHub Actions (CI/CD).
- **Testing**: Vitest (Unit), Playwright (E2E).
- **Monitoring**: Sentry, custom performance logging.

## 🔄 Data Flow

1. **Client** (Next.js) makes HTTP requests to **API** (NestJS).
2. **API** validates requests using `Zod` DTOs and authenticates via JWT.
3. **Services** execute business logic, interacting with the database via `Prisma` (in `packages/db`).
4. **Caching**: Redis is used for caching frequently accessed static data (Configuration, Metadata).
5. **Background Jobs (Future)**: Queues for email/WhatsApp notifications.

## 🔐 Security & Compliance

- **Authentication**: JWT-based auth with Role-Based Access Control (RBAC).
- **Tenancy**: Strict data isolation using `clinicId` filters (enforced via middleware/interceptors).
- **DPDP Compliance**: Encryption of sensitive fields, audit logging of all access.
- **Security Headers**: Helmet, CORS, Rate Limiting (Throttler).

## 🧩 Key Modules

- **Auth**: User authentication, role management, tier enforcement.
- **Patients**: Patient demographics, history, and relations.
- **Appointments**: Scheduling, calendar management, reminders.
- **Prescriptions**: Digital prescriptions, medication management.
- **Billing**: Invoices, payments (Razorpay), subscriptions.
- **Communication**: WhatsApp integration for notifications.

## 🚀 Deployment

- **Containerization**: Docker multi-stage builds.
- **Orchestration**: Docker Compose (Dev), Kubernetes/Railway/Vercel (Prod).
- **CI/CD**: GitHub Actions for testing, linting, building, and security validation.

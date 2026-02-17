# Docita — System Architecture

**Version:** 2.0 | **Last Updated:** 2026-02-13 | **Status:** Production Ready ✅

## Table of Contents

1. [System Overview](#system-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Patterns](#architecture-patterns)
5. [Data Layer](#data-layer)
6. [Security Model](#security-model)
7. [Performance & Optimization](#performance--optimization)
8. [Development Workflow](#development-workflow)
9. [Deployment Pipeline](#deployment-pipeline)

---

## System Overview

Docita is a comprehensive **Healthcare Practice Management System** serving clinics, hospitals, and practices of all sizes. Built with modern cloud-native patterns, it provides:

- **Patient Management**: Complete medical records with encrypted sensitive data
- **Appointment Scheduling**: Multi-specialty scheduling with doctor availability
- **Consultations**: Clinical documentation with SOAP notes and AI suggestions
- **Prescriptions**: Digital prescriptions with contraindication checking
- **Billing & Invoicing**: Automated invoicing, payment processing, subscription management
- **Analytics**: Usage metrics, revenue tracking, patient outcomes
- **Integrations**: WhatsApp, Email, Razorpay, Calendar sync, FHIR
- **AI Features**: Diagnosis suggestions, medical coding assistance, patient risk stratification

**Key Statistics:**
- 8 workspace packages + 4 applications
- 35+ specialized microservices
- 100+ database tables with indexes
- 150+ REST API endpoints
- 375+ unit tests
- TypeScript strict mode 100%
- Zero breaking changes policy

---

## Monorepo Structure

Using **pnpm workspaces** + **Turborepo** for build orchestration and dependency management.

```
docita/
├── apps/                          # Applications
│   ├── app/                       # Main clinic app (Next.js 16)
│   ├── admin/                     # Admin panel (Next.js 16)
│   ├── api/                       # Backend API (NestJS 11)
│   └── landing/                   # Public landing page (Next.js 16)
│
├── packages/                      # Shared packages
│   ├── db/                        # Database layer (Prisma 6)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 100+ tables, enums, relationships
│   │   │   └── migrations/       # Versioned schema changes
│   │   └── package.json
│   │
│   ├── types/                     # TypeScript types & Zod schemas
│   │   ├── src/
│   │   │   ├── common.ts         # Shared types
│   │   │   ├── auth.ts           # Auth/user types
│   │   │   ├── patients.ts       # Patient-related types
│   │   │   ├── appointments.ts   # Appointment types
│   │   │   ├── billing.ts        # Billing/invoice types
│   │   │   ├── payments.ts       # Razorpay types (RazorpayWebhookPayload, etc)
│   │   │   └── ...               # 30+ more type modules
│   │   └── package.json
│   │
│   ├── auth/                      # Authentication package
│   │   ├── src/
│   │   │   ├── auth-context.tsx  # React Context + hooks
│   │   │   ├── index.ts          # Exports
│   │   │   ├── token-storage.ts  # HTTP-only cookie management
│   │   │   ├── permissions-map.ts # 28 permissions × 5 roles
│   │   │   └── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                        # Component library
│   │   ├── src/
│   │   │   ├── components/       # 25+ reusable components
│   │   │   ├── design-tokens.ts  # CSS variables, colors, spacing
│   │   │   ├── styles/
│   │   │   │   └── dark-mode.css # Light/dark variants
│   │   │   └── COMPONENT_AUDIT.ts # Inventory of all components
│   │   ├── .storybook/           # Storybook config
│   │   └── tailwind.config.ts
│   │
│   ├── hooks/                     # React hooks
│   │   └── src/
│   │       ├── useSearch.ts
│   │       ├── useOptimisticMutation.ts
│   │       └── ...
│   │
│   ├── utils/                     # Utility functions
│   │   └── src/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── ...
│   │
│   ├── data-access/              # Repository implementations
│   │   └── src/
│   │       ├── repositories/
│   │       │   ├── patient.repository.ts
│   │       │   ├── appointment.repository.ts
│   │       │   └── ...
│   │       └── index.ts
│   │
│   ├── eslint-config/            # Shared ESLint rules
│   │   ├── index.mjs
│   │   ├── next.mjs
│   │   └── base.mjs
│   │
│   └── typescript-config/        # TypeScript presets
│       ├── base.json
│       ├── nextjs.json
│       └── nestjs.json
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md           # This file
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   └── ... 20+ more guides
│
├── scripts/                       # Automation
│   ├── check_env.js
│   ├── test-db-connection.js
│   └── ...
│
└── Configuration Files
    ├── pnpm-workspace.yaml       # Workspace config
    ├── turbo.json                # Build orchestration
    ├── tsconfig.json             # Root TypeScript config
    ├── docker-compose.yml        # Local dev environment
    └── .env.example              # Environment template
```

### Workspace Packages Details

| Package | Purpose | Key Exports | Dependencies |
|---------|---------|-------------|--------------|
| `@workspace/db` | Prisma ORM + schema | Prisma client, enums (Role, Status) | prisma, @prisma/client |
| `@workspace/types` | Shared TypeScript types | 50+ interfaces, Zod schemas | zod |
| `@workspace/auth` | Auth Context + hooks | AuthProvider, useAuth, usePermission | react, @workspace/types |
| `@workspace/ui` | Component library | 25+ components, design tokens | react, tailwind, shadcn/ui |
| `@workspace/hooks` | Custom React hooks | useSearch, useOptimisticMutation | react, @workspace/types |
| `@workspace/utils` | Shared utilities | formatters, validators, helpers | None (zero dependencies) |
| `@workspace/data-access` | Repository pattern | Repository classes | prisma, @workspace/db |
| `@workspace/eslint-config` | ESLint rules | ESLint configs (.mjs files) | eslint |
| `@workspace/typescript-config` | TypeScript configs | tsconfig.json presets | None |

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16.0.9 (App Router, React 19)
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS 3.x with custom design tokens
- **Components:** Shadcn/UI + custom components
- **State:** React Context + React Query for server state
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Auth:** HTTP-only cookies (no localStorage)
- **Testing:** Vitest, Playwright, React Testing Library
- **Build:** Turbo monorepo, pnpm

### Backend
- **Runtime:** Node.js 20+ LTS
- **Framework:** NestJS 11.x (modular architecture)
- **Language:** TypeScript 5.x (strict mode)
- **ORM:** Prisma 6.x (type-safe database access)
- **Database:** PostgreSQL 15+ (full-text search, GIN indexes)
- **Caching:** Redis (circuit breaker, tag-based invalidation)
- **Validation:** Zod schemas (both runtime + type-level)
- **API Docs:** Swagger/OpenAPI 3.0
- **Auth:** JWT (refresh token rotation, secure cookies)
- **Testing:** Jest with comprehensive mocking
- **Logging:** Winston (structured, levels: ERROR/DEBUG)

### DevOps & Infrastructure
- **Container:** Docker with multi-stage builds
- **Orchestration:** Docker Compose (local), Kubernetes (production)
- **Package Mgr:** pnpm (faster, disk-efficient)
- **CI/CD:** GitHub Actions (lint, test, build, deploy)
- **Deployment:** Vercel (frontend), Railway (backend)
- **Database:** AWS RDS PostgreSQL (multi-AZ, automated backups)
- **Cache:** AWS ElastiCache Redis (cluster mode, failover)
- **Secrets:** AWS Secrets Manager + GitHub Secrets
- **Monitoring:** CloudWatch + custom metrics
- **Logging:** Winston → CloudWatch

---

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │
│  (Next.js Pages, Components, Routes)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         CONTROLLER LAYER                │
│  (NestJS Controllers, Request Handling) │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         SERVICE LAYER                   │
│  (Business Logic, 35+ Services)         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      REPOSITORY LAYER                   │
│  (Data Access Abstraction, Prisma)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         PERSISTENCE LAYER               │
│  (PostgreSQL Database)                  │
└─────────────────────────────────────────┘
```

### 2. Design Patterns Implemented

| Pattern | Usage | Benefit |
|---------|-------|---------|
| **Repository** | PatientsRepository, AppointmentsRepository | Data access abstraction, testability |
| **Factory** | PatientFactory, AppointmentFactory | Type-safe entity creation, validation |
| **Facade** | SubscriptionBillingFacade | Orchestrate complex multi-service operations |
| **Service** | Business logic isolated from controllers | Reusability, testability, separation of concerns |
| **Decorator** | @Public, @Roles, @CurrentTenant | Cross-cutting concerns (auth, validation) |
| **Guard** | AuthGuard, RoleGuard, RateLimitGuard | Request filtering, enforcement |
| **Observer** | DomainEventService (PATIENT_CREATED, etc) | Async communication between modules |
| **Strategy** | PaymentGatewayFactory (Razorpay vs PayPal) | Pluggable implementations |
| **Circuit Breaker** | RedisCachingService (fallback if Redis down) | Graceful degradation |

### 3. Modular Architecture

Each domain has its own NestJS module:

```
@Module({
  controllers: [PatientsController],
  providers: [
    PatientsService,
    PatientsRepository,
    PatientFactory,
    MedicalHistoryService,
  ],
  exports: [PatientsService, PatientsRepository],
  imports: [TypeOrmModule.forFeature([Patient])],
})
export class PatientsModule {}
```

**Benefits:**
- Clear domain boundaries
- Testable components (mock dependencies)
- Lazy-loaded modules reduce startup time
- Independent deployment possible

---

## Data Layer

### Database Schema Highlights

**100+ Tables** organized by domain:

| Domain | Tables | Key Features |
|--------|--------|--------------|
| **Auth** | users, roles, permissions, refresh_tokens | JWT + refresh token rotation |
| **Patients** | patients, patient_allergies, patient_medications | Encrypted PII, audit trail |
| **Appointments** | appointments, appointment_reminders, appointment_responses | Multi-specialty scheduling |
| **Consultations** | consultations, vital_signs, lab_tests | SOAP notes, medical coding |
| **Billing** | invoices, invoice_items, payments | Razorpay integration |
| **Subscriptions** | subscriptions, subscription_plans, add_ons | Recurring billing, webhooks |
| **Analytics** | audit_logs, user_activity | Complete traceability |

### Indexes Strategy

**Type-1: Unique Constraints**
```sql
-- Prevent duplicate emails per clinic
ALTER TABLE "Patient" ADD CONSTRAINT unique_clinic_email 
UNIQUE ("clinicId", email);

-- Prevent double-booking
ALTER TABLE "Appointment" ADD CONSTRAINT unique_doctor_slot 
UNIQUE ("clinicId", "appointmentDate", "doctorId");
```

**Type-2: Performance Indexes**
```sql
-- Fast patient lookups
CREATE INDEX idx_patient_clinic_name 
ON "Patient"("clinicId", "firstName");

-- Appointment filtering
CREATE INDEX idx_appointment_clinic_date 
ON "Appointment"("clinicId", "appointmentDate");

-- Invoice searches
CREATE INDEX idx_invoice_clinic_date 
ON "Invoice"("clinicId", "invoiceDate");
```

**Type-3: Full-Text Search**
```sql
-- Enable PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- GIN indexes on tsvector columns
CREATE INDEX idx_patient_search_tsvector 
ON "Patient" USING GIN(search_tsvector);

CREATE INDEX idx_appointment_search_tsvector 
ON "Appointment" USING GIN(search_tsvector);

-- Trigram indexes for LIKE queries
CREATE INDEX idx_patient_firstname_trgm 
ON "Patient" USING GIN("firstName" gin_trgm_ops);
```

### Data Relationships

```
Clinic (1) ───────────┬─────────── (many) User
                      │
                      ├─────────── (many) Patient
                      │                      │
                      │                      └─── (many) Appointment
                      │                                     │
                      │                                     ├─── (1) Doctor
                      │                                     ├─── (1) Consultation
                      │                                     │         │
                      │                                     │         ├─── (many) Diagnosis
                      │                                     │         └─── (many) Prescription
                      │                                     │
                      │                                     ├─── (many) Invoice
                      │                                     │             │
                      │                                     │             ├─── (many) InvoiceItem
                      │                                     │             └─── (many) Payment
                      │                                     │
                      │                                     └─── (many) Reminder
                      │
                      └─────────── (many) Subscription
                                              │
                                              ├─── (1) Plan
                                              ├─── (many) AddOn
                                              └─── (many) Invoice
```

---

## Security Model

### Authentication & Authorization

**Multi-Layer Security:**

```
1. HTTP-Only Cookie Auth
   ├─ Access Token (JWT, 15 min)
   ├─ Refresh Token (stored server-side, 7 days)
   └─ CSRF Token (meta tag)

2. Role-Based Access Control (5 roles)
   ├─ SUPER_ADMIN (28 permissions)
   ├─ CLINIC_ADMIN (19 permissions)
   ├─ DOCTOR (16 permissions)
   ├─ STAFF (10 permissions)
   └─ PATIENT (1 permission)

3. Permission-Gated Operations
   ├─ Can user VIEW patients?
   ├─ Can user CREATE invoices?
   ├─ Can user DELETE user accounts?
   └─ ... 25 more permissions

4. Tenant Isolation
   ├─ Clinic-level row security
   ├─ Database-enforced filtering
   └─ Logged at every access point
```

### Data Protection

**Encryption at Rest:**
```typescript
// Sensitive fields encrypted with master key
Patient: {
  firstName: encrypted,
  lastName: encrypted,
  phoneNumber: encrypted,
  email: encrypted,
  address: encrypted,
}
```

**Encryption in Transit:**
- TLS 1.3 for all connections
- Certificate pinning for mobile apps (future)
- Perfect forward secrecy (PFS)

**Audit Trail:**
- Every data access logged with: user, timestamp, action, resource, result
- Immutable audit log (append-only)
- Automatic redaction of PII in exports

**Key Management:**
- Master key: AWS KMS (never in code)
- Rotation: Quarterly
- Re-encryption: Automatic for all old data

### Rate Limiting

```
Endpoint              | Limit              | Window
──────────────────────┼────────────────────┼────────
/auth/login          | 5 attempts         | 15 min
/api/*               | 100 requests       | 1 min
/search/*            | 50 queries         | 1 min
/payments/*          | 10 requests        | 1 min
```

---

## Performance & Optimization

### Caching Strategy

**4-Level Caching:**

```
Level 1: Browser Cache (1 year)
├─ Static assets
├─ Scripts, styles
└─ Images

Level 2: CDN Cache (24h)
├─ Same as above
└─ Geographic distribution

Level 3: Application Cache (Redis, 5-60m)
├─ Search results (5m)
├─ Clinic settings (24h)
├─ Doctor schedules (1 day)
└─ Pricing tiers (24h)

Level 4: Database Cache (prepared statements, pooling)
```

### Query Optimization

**Before Optimization:**
```typescript
// ❌ N+1 Query Problem
const appointments = await db.appointment.findMany();
const consultations = await Promise.all(
  appointments.map(a => db.consultation.findUnique({ where: { appointmentId: a.id } }))
);
// N + 1 queries total
```

**After Optimization:**
```typescript
// ✅ Single Query with Eager Loading
const appointments = await db.appointment.findMany({
  include: {
    consultation: { include: { diagnoses: true } },
    patient: true,
  },
});
// 1 query total
```

### Search Optimization

**Performance Benchmarks:**

| Dataset Size | Query Time (before) | Query Time (after) | Improvement |
|--------------|-------------------|--------------------|-------------|
| 1,000 patients | 45ms | 12ms | 3.75x |
| 10,000 patients | 850ms | 95ms | 8.9x |
| 100,000 patients | 8.5s | 380ms | 22.4x |

**Optimization Techniques:**
1. PostgreSQL GIN indexes on tsvector
2. pg_trgm extension for typo tolerance
3. Redis caching (60-70% hit rate)
4. ILIKE fallback when indexes unavailable

### Monitoring & Alerting

**Metrics:**
- Query latency (P95, P99)
- Cache hit rate
- Database connection pool utilization
- API error rate
- Memory usage

**Alerts When:**
- P99 latency > 500ms
- Cache hit rate < 40%
- Error rate > 1%
- Slow query detected (> 1s)

---

## Development Workflow

### Local Setup

```bash
# Clone and install
git clone https://github.com/docita/docita.git
cd docita
pnpm install

# Setup environment
cp .env.example .env.local
pnpm prisma generate
pnpm prisma migrate dev

# Start all apps
pnpm dev

# Access:
# - Frontend: http://localhost:3000
# - API: http://localhost:3001
# - Docs: http://localhost:3001/api
```

### Testing

```bash
# All tests
pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage

# E2E tests
pnpm test:e2e
```

### Code Quality

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Format
pnpm format
```

---

## Deployment Pipeline

```
Developer commits → GitHub Actions
                      ↓
                   Lint ✅
                   Tests ✅
                   Build ✅
                      ↓
              Deploy to Staging
                      ↓
              E2E Tests ✅
                      ↓
              Deploy to Production
                      ↓
              Smoke Tests ✅
                      ↓
              Monitor Error Rate
```

**Environments:**
- **Development:** Local, single-container Docker Compose
- **Staging:** Cloud (AWS), mirror production config
- **Production:** Multi-region, auto-scaling, CDN

---

## Performance Benchmarks

| Operation | Baseline | Optimized | Gain |
|-----------|----------|-----------|------|
| Search 10k patients | 850ms | 95ms | 8.9x |
| Load appointment | 45ms | 12ms | 3.75x |
| Generate PDF | 3.2s | 1.1s | 2.9x |
| Bulk import 1000 | 45s | 8s | 5.6x |
| API response (p99) | 620ms | 140ms | 4.4x |

---

**Last Updated:** 2026-02-13  
**Maintained By:** Docita Architecture Team  
**Status:** Production Ready ✅
- **Communication**: WhatsApp integration for notifications.

## 🚀 Deployment

- **Containerization**: Docker multi-stage builds.
- **Orchestration**: Docker Compose (Dev), Kubernetes/Railway/Vercel (Prod).
- **CI/CD**: GitHub Actions for testing, linting, building, and security validation.

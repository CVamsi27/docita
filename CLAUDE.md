# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Docita is a healthcare practice management system built as a Turborepo monorepo. The application includes patient management, appointments, billing, prescriptions, clinical workflows, and more. This is a production-grade system handling protected health information (PHI) with strict security and compliance requirements.

## Technology Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Backend**: NestJS with domain-driven architecture
- **Frontend**: Next.js 16 (App Router) with React 19
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod-first architecture (see docs/zod-first-architecture.md)
- **State Management**: React Query (@tanstack/react-query) for server state, Zustand for client state
- **Forms**: React Hook Form + Zod validation
- **UI**: Shared component library in @workspace/ui
- **Deployment**: Staging-first Git flow, Render staging API, Fly.io production API, Cloudflare workers for web apps

## Repository Structure

```
docita/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   ├── app/          # Next.js main product app (port 3000)
│   ├── internal/     # Next.js internal interface (port 3002)
│   └── landing/      # Astro marketing site (port 3003)
├── packages/
│   ├── db/           # Prisma schema, migrations, client
│   ├── types/        # Zod schemas (source of truth)
│   ├── data-access/  # API clients and React Query hooks
│   ├── ui/           # Shared React components
│   ├── auth/         # Auth utilities
│   ├── hooks/        # Shared React hooks
│   ├── utils/        # Pure utility functions
│   ├── eslint-config/
│   └── typescript-config/
├── docs/             # Architecture docs
└── scripts/          # Automation scripts
```

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Run all apps (landing, app, internal, api)
pnpm dev

# Run specific apps
pnpm dev:landing   # Landing only
pnpm dev:app       # App + API
pnpm dev:internal  # Internal + API
```

### Building

```bash
# Build all apps
pnpm build

# Build specific apps
pnpm build:api
pnpm build:app
pnpm build:admin
pnpm build:landing
```

### Testing

```bash
# Run all tests
pnpm test

# Test specific apps
pnpm test:api       # API unit tests
pnpm test:e2e       # E2E tests (Playwright)

# API tests (from apps/api)
cd apps/api
pnpm test           # Unit tests
pnpm test:watch     # Watch mode
pnpm test:e2e       # E2E tests
pnpm test:cov       # With coverage

# App E2E tests (from apps/app)
cd apps/app
pnpm test:e2e       # Full E2E suite
pnpm test:e2e:ui    # Playwright UI mode
pnpm test:e2e:debug # Debug mode
```

### Linting & Formatting

```bash
pnpm lint           # Lint all packages
pnpm format         # Format with Prettier
```

### Database (Prisma)

```bash
# Generate Prisma client (runs automatically on postinstall)
pnpm db:generate

# Push schema changes (dev only)
pnpm db:push

# Create and apply migrations (production)
pnpm db:migrate

# Seed sample data
Use the API's medical-code sync job to refresh common ICD/CPT data instead of seed commands.

# Prisma Studio (database GUI)
cd packages/db && pnpm db:studio
```

### Code Quality

```bash
pnpm verify:standard           # Verify structure and contracts
pnpm check:hygiene             # Block stray artifacts from being committed
pnpm knip                      # Unused deps/exports (CI runs when scope detector marks Knip-relevant paths)
pnpm check:prisma-boundary     # Ensure Prisma not imported in frontend
```

## Architecture Principles

### Zod-First Type System

**CRITICAL**: Zod schemas in `packages/types` are the single source of truth for all data shapes. Never create TypeScript interfaces first.

Flow: `Zod Schema → z.infer<> → API contracts → UI forms → DB mappers`

Key rules:
- All types are inferred from Zod schemas using `z.infer<typeof Schema>`
- NestJS uses `nestjs-zod` with `createZodDto()` for DTOs
- Forms use `zodResolver` from `@hookform/resolvers/zod`
- API responses are validated with `schema.parse()` before use
- Prisma models are mapped to/from domain types in repository layers

Example:
```typescript
// packages/types/src/patient/patient.schema.ts
export const PatientSchema = BaseEntitySchema.extend({
  name: z.string().min(2),
  phone: z.string().regex(/^[0-9]{10}$/),
  age: z.number().int().min(0).max(120),
});

export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// packages/types/src/patient/patient.types.ts
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
```

See `docs/zod-first-architecture.md` for complete details.

### Backend (NestJS) Architecture

The API uses domain-driven design with a clear layering pattern:

```
apps/api/src/
├── domains/              # Business domains (DDD modules)
│   ├── patients/
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   └── patients.repository.ts
│   ├── appointments/
│   ├── prescriptions/
│   └── ...
├── common/              # Cross-cutting concerns
│   ├── interceptors/
│   ├── middleware/
│   ├── guards/
│   ├── pipes/
│   └── repositories/
├── gateways/           # WebSocket gateways
└── shared/             # Shared utilities
```

Key patterns:
- **Controllers**: Thin orchestration layer, delegates to services
- **Services**: Business logic and use cases
- **Repositories**: Data access, Prisma interactions, maps DB models to domain types
- **Guards**: Auth, tenant isolation, role-based access control
- **Interceptors**: Logging, response transformation, caching

### Prisma Boundary Rule

**CRITICAL**: `@prisma/client` types MUST NEVER leak outside of:
- `packages/db`
- `apps/api/src/*/repositories`

Always use mapper functions to convert between Prisma models and domain types:

```typescript
// ✅ CORRECT
export class PatientsRepository {
  async findById(id: string): Promise<Patient> {
    const raw = await this.prisma.patient.findUnique({ where: { id } });
    return PatientMapper.toDomain(raw); // Maps to domain type
  }
}

// ❌ WRONG - Prisma type leaked to service layer
async findById(id: string): Promise<PrismaPatient> { ... }
```

Run `pnpm check:prisma-boundary` to verify this boundary.

### Frontend Architecture

Next.js apps follow a feature-first pattern:

```
apps/app/
├── app/                # App Router (routes, layouts)
├── features/           # Feature modules
│   ├── patients/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── schemas/
│   └── ...
├── components/         # Shared app-level components
├── lib/               # API client, config
└── providers/         # React context providers
```

Key patterns:
- Use `@workspace/ui` components when available
- Use React Query for all server data fetching
- Use React Hook Form + Zod for forms
- Always handle loading, error, and empty states
- Use Next.js `Link` and `router.push()` for navigation
- Never import `@prisma/client` or `@workspace/db` in frontend code

## Branching and Releases

- **`main`** is canonical for production; **`staging`** mirrors **`main`** (same tree) and must remain aligned via automation.
- Branch from **`main`** and open pull requests **into `main`**.
- After merges to `main`, automation **fast-forwards** `staging` to the exact `main` commit so the staging environment always matches production code.
- Do not commit directly on `main` or `staging`. See `AGENTS.md` section 11.3 for the full model.

## Security & Compliance

This system handles Protected Health Information (PHI). Security rules are non-negotiable:

### Authentication & Authorization
- All protected routes require JWT authentication
- Tenant isolation is enforced at the database query level
- Role-based access control (RBAC) is applied in guards
- Never weaken auth guards or tenant middleware

### Data Protection
- Never log PHI in plaintext
- Never hardcode credentials, API keys, or secrets
- Encryption keys are managed via environment variables (see `ENCRYPTION_KEY`)
- Sensitive fields are encrypted at rest using `encryption.service.ts`

### Audit & Compliance
- Audit logging is required for sensitive operations
- Never remove audit trails
- Patient data retention follows DPDP (Digital Personal Data Protection) guidelines

## Development Workflow

### Adding a New Feature

1. Define Zod schemas in `packages/types/src/[domain]/`
2. Create/update NestJS domain module in `apps/api/src/domains/[domain]/`
3. Add API client functions in `packages/data-access/src/[domain]/`
4. Build UI in `apps/app/features/[domain]/`
5. Write tests at each layer

### Making Database Changes

1. Modify Prisma schema in `packages/db/prisma/schema.prisma`
2. Generate migration: `cd packages/db && pnpm db:migrate`
3. Update domain Zod schemas if needed
4. Update repository mappers to handle schema changes
5. Run `pnpm db:generate` to regenerate Prisma client

### Testing Strategy

- **Unit tests**: Test individual functions and components
- **Integration tests**: Test module interactions
- **E2E tests**: Test user flows (Playwright)
- Target changed code first, then run full test suite
- E2E critical flows before every release

## Important Patterns

### React Query Usage

```typescript
// In packages/data-access
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: string) => [...patientKeys.lists(), { filters }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// In component
const { data, isLoading } = useQuery({
  queryKey: patientKeys.detail(id),
  queryFn: () => getPatient(id),
});
```

### Error Handling

NestJS uses Zod validation pipe globally. Validation errors return structured responses:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Name must be at least 2 characters" }
  ]
}
```

### Environment Variables

Required variables are documented in `.env.example`. Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Minimum 32 characters
- `ENCRYPTION_KEY`: 64-character hex key for field encryption
- `NEXT_PUBLIC_API_URL`: API endpoint for frontend
- Background jobs and cache are in-process by default; see `.env.example` for the current runtime baseline.

## Code Quality Rules

From `.github/copilot-instructions.md`:

1. **Follow existing patterns** - extend, don't reinvent
2. **Keep files cohesive** - don't mix UI, data access, and business logic
3. **No new `any`** unless justified and constrained
4. **Remove dead code** - no commented-out blocks
5. **Test changed behavior** - add/update tests for changes
6. **Update docs** when architecture changes

## Coding Standards

### Import Path Standards

**CRITICAL**: Always use `@` path aliases instead of relative imports.

```typescript
// ✅ CORRECT - Use @ alias
import { PatientCard } from '@/components/patients/PatientCard';
import { usePatient } from '@/features/patients/hooks/usePatient';
import { api } from '@/lib/api';

// ❌ WRONG - Never use relative paths
import { PatientCard } from '../../../components/patients/PatientCard';
import { usePatient } from '../../hooks/usePatient';
```

For workspace packages, use the workspace alias:
```typescript
import { PatientSchema } from '@workspace/types';
import { getPatient } from '@workspace/data-access';
import { Button } from '@workspace/ui';
```

### Logging Standards

**CRITICAL**: Never use `console.log` or `console.error`. Always use the structured logger.

```typescript
// ✅ CORRECT - Use NestJS logger (backend)
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  async create(data: CreatePatient) {
    this.logger.log('Creating patient', { data });
    this.logger.error('Failed to create patient', error.stack);
    this.logger.warn('Patient creation slow', { duration });
  }
}

// ✅ CORRECT - Use logger utility (frontend)
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId });
logger.error('API request failed', { error });

// ❌ WRONG - Never use console
console.log('Creating patient');
console.error('Error:', error);
```

### No Emojis in Code

**CRITICAL**: Never add emojis to any code, comments, or commit messages.

```typescript
// ❌ WRONG
const message = 'Welcome! 👋';
// 🚨 TODO: Fix this bug

// ✅ CORRECT
const message = 'Welcome!';
// TODO: Fix validation bug
```

### Comment Management

**CRITICAL**: Handle comments intelligently. If a comment indicates work to be done, implement it and remove the comment.

```typescript
// ❌ WRONG - TODO comments left unimplemented
// TODO: Add validation for email
// FIXME: This breaks on null values
// NOTE: We should cache this

// ✅ CORRECT - Implement and remove
const emailSchema = z.string().email(); // Implemented validation
const value = data?.field ?? ''; // Fixed null handling
await cache.get(key); // Added caching
```

Remove comments that merely restate the code:
```typescript
// ❌ WRONG - Obvious comment
// Get patient by ID
const patient = await this.getById(id);

// ✅ CORRECT - No comment needed (code is self-documenting)
const patient = await this.getById(id);
```

Keep only comments that explain non-obvious decisions:
```typescript
// ✅ CORRECT - Explains why
// Using UTC to avoid timezone issues with appointment scheduling
const appointmentDate = new Date().toISOString();
```

### File Organization Standards

**Maximum 10 documentation files**: Keep documentation concise and consolidated. Remove redundant or outdated `.md` files.

Essential docs only:
- `README.md`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `docs/zod-first-architecture.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`
- `docs/TURBOREPO_STANDARD_STRUCTURE.md`

**Scripts folder**: Keep only essential automation scripts. Remove unused or redundant scripts.

**No temporary files**: Remove all:
- `.txt` files (except essential configs like `.gitignore`)
- `.log` files (logs should go to logging infrastructure)
- Temporary or experimental files

Before adding any file, ask:
1. Is this essential for the project?
2. Does this duplicate existing documentation or functionality?
3. Will this be maintained or become stale?

### Global Styles Standard

**CRITICAL**: All web apps (app, admin, landing) share a single global stylesheet source.

Location: `packages/ui/src/styles/global.css`

Each app imports it:
```typescript
// apps/app/app/layout.tsx
import '@workspace/ui/styles/global.css';

// apps/admin/app/layout.tsx
import '@workspace/ui/styles/global.css';

// apps/landing/src/layouts/main-layout.astro
import '@workspace/ui/globals.css';
```

Never create app-specific `global.css` files. All global styles are centralized in the UI package.

### Design Patterns & SOLID Principles

Follow these design patterns and SOLID principles consistently:

**Single Responsibility Principle (SRP)**:
```typescript
// ✅ CORRECT - Each class has one responsibility
class PatientRepository {
  async findById(id: string): Promise<Patient> { }
}

class PatientService {
  async createPatient(data: CreatePatient): Promise<Patient> { }
}

class PatientValidator {
  validate(data: unknown): CreatePatient { }
}

// ❌ WRONG - God class doing everything
class PatientManager {
  async findById(id: string) { }
  async createPatient(data: any) { }
  validate(data: any) { }
  sendEmail() { }
  generatePDF() { }
}
```

**Dependency Injection**:
```typescript
// ✅ CORRECT - Dependencies injected
@Injectable()
export class PatientsService {
  constructor(
    private readonly repository: PatientsRepository,
    private readonly logger: Logger,
  ) {}
}

// ❌ WRONG - Hard-coded dependencies
export class PatientsService {
  private repository = new PatientsRepository();
}
```

**Interface Segregation**:
```typescript
// ✅ CORRECT - Small, focused interfaces
interface Readable {
  read(id: string): Promise<Patient>;
}

interface Writable {
  create(data: CreatePatient): Promise<Patient>;
  update(id: string, data: UpdatePatient): Promise<Patient>;
}

// ❌ WRONG - Fat interface
interface Repository {
  read(id: string): Promise<Patient>;
  create(data: CreatePatient): Promise<Patient>;
  update(id: string, data: UpdatePatient): Promise<Patient>;
  delete(id: string): Promise<void>;
  export(): Promise<Buffer>;
  import(file: Buffer): Promise<void>;
}
```

**Open/Closed Principle**:
```typescript
// ✅ CORRECT - Open for extension, closed for modification
abstract class PaymentProcessor {
  abstract process(amount: number): Promise<void>;
}

class RazorpayProcessor extends PaymentProcessor {
  async process(amount: number) { }
}

// ❌ WRONG - Modifying existing code for new payment methods
class PaymentProcessor {
  async process(method: string, amount: number) {
    if (method === 'razorpay') { }
    if (method === 'stripe') { }
  }
}
```

**Repository Pattern**:
```typescript
// ✅ CORRECT - Repository abstracts data access
@Injectable()
export class PatientsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Patient> {
    const raw = await this.prisma.patient.findUnique({ where: { id } });
    return PatientMapper.toDomain(raw);
  }
}

// Service uses repository, not Prisma directly
@Injectable()
export class PatientsService {
  constructor(private repository: PatientsRepository) {}

  async getPatient(id: string): Promise<Patient> {
    return this.repository.findById(id);
  }
}
```

**Factory Pattern** (for complex object creation):
```typescript
// ✅ CORRECT - Factory for complex creation logic
export class PrescriptionFactory {
  static create(data: CreatePrescription): Prescription {
    return {
      ...data,
      prescriptionNumber: this.generateNumber(),
      validUntil: this.calculateValidity(data.issuedDate),
      status: 'ACTIVE',
    };
  }
}
```

### Before Committing

- Run `pnpm lint` and changed issues
- Run `pnpm verify:standard` and `pnpm check:hygiene` when touching structure, scripts, or many packages
- Run `pnpm knip` for consolidated PRs or workspace-wide dependency/export changes (CI runs Knip when changed paths match `isKnipChange` in `scripts/detect-workflow-scope.mjs`)
- Run `pnpm test` for changed areas
- Run `pnpm build` for changed areas
- Ensure no debug artifacts or `console.log` statements
- Verify no emojis in code or comments
- Check all imports use `@` aliases, not `../`
- Verify no TODO/FIXME comments (implement or remove them); drop redundant comments per `AGENTS.md` section 7.2
- Remove any .txt, .log, or temporary files
- Verify no secrets in code
- Check that types compile: `turbo check-types`
- Prefer fixing types over `@ts-expect-error` / broad `eslint-disable` (see `AGENTS.md` section 7.3)

## Key Documentation

- `docs/zod-first-architecture.md`: Complete Zod architecture guide
- `docs/TURBOREPO_STANDARD_STRUCTURE.md`: Monorepo structure standards
- `docs/TESTING.md`: Testing strategy and patterns
- `docs/API_DOCUMENTATION.md`: API endpoints reference
- `docs/DEPLOYMENT.md`: Production deployment guide

## Running Single Tests

```bash
# API - single test file
cd apps/api
pnpm test -- patients.service.spec.ts

# API - single test
pnpm test -- -t "should create patient"

# App - single E2E spec
cd apps/app
pnpm test:e2e -- e2e/patients.spec.ts
```

## Common Gotchas

1. **Prisma client regeneration**: Always run `pnpm db:generate` after schema changes
2. **Port conflicts**: The dev script kills ports 3000-3003 automatically via `scripts/kill-ports.js`
3. **Import aliases**: Use `@/` for app-level imports, not `../../../`
4. **Zod vs TypeScript**: Always define Zod schemas first, never TypeScript interfaces
5. **Tenant isolation**: All queries must include `tenantId` filter - enforced by guards
6. **Local background work**: In-process cache and background tasks are the default local setup

## Package Manager

This repo uses **pnpm** with version **10.30.3** (specified in `package.json#packageManager`). Never use npm or yarn.

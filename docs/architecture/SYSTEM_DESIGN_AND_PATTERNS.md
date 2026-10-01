# System Design and Patterns

Authoritative design reference for the Docita monorepo. Covers the high-level architecture, low-level layering, design patterns in use with concrete file references, database design, API surface, frontend architecture (with attention to token handling, memoization, and render strategy), security posture (auth tokens, PDF signed URLs, PHI, audit), and performance measurement.

This document is descriptive — it explains what the codebase actually does today, with file:line citations so claims can be verified or fixed. For *prescriptive* rules (what new code MUST follow), see [`AGENTS.md`](../../AGENTS.md). For UI/UX rules, see [`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md). For canonical data-point ownership (tier vs plan, GSTIN, patient name, support contact, etc.), see [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md).

### Table of contents

| § | Topic |
| --- | --- |
| 1–2 | HLD, backend LLD, request lifecycle |
| 3 | Design patterns catalog (repository → outbox seam) |
| 4–5 | Database, API design |
| 6–8 | Frontend, auth, security |
| 9–12 | Concurrency, performance, automation map, open posture |
| 13 | New-contributor pointers |
| 14–20 | Worker, billing, messaging, observability, flags, search, AI |
| 21–27 | Deploy, internal, landing, testing, DX, a11y, compliance |
| 28–29 | Improvement backlog, DPDP |
| 30–41 | Prisma extensions, persistence helpers, machine auth, FHIR, imports, RUM, cache, errors, transactions, `shared/lib`, ALS |
| 42–56 | Corrections, reading list, Vite route tree, proxy, packages, CI, local dev, k6, scripts, Sentry, schema, root files, interaction map, glossary, final opportunities |
| 57 | Audit method and evidence levels |
| **58–65** | **Client state & sockets, policy engine, outbox depth, shared modules catalog, utils/hooks, SSOT, enterprise posture, pending register** |
| **66–72** | **Pattern maturity, datetime, compatibility migrations, edge BFF boundaries, reliability selection, recommended additions, adoption sequence** |
| 73 | Reading order |

---

## 1. System overview (HLD)

### 1.1 Apps

| App | Runtime | Role | Deploy target |
| --- | --- | --- | --- |
| `apps/api` | NestJS (Node ≥22) | Public HTTP API, controllers, business logic, Prisma writes | Fly.io (`fly.toml`) |
| `apps/worker` | NestJS | Background jobs: PDF generation, scheduled reminders, exports | Fly.io (`apps/worker/fly.toml`) |
| `apps/app` | Vite + React Router (SPA) | Clinician web app | Cloudflare (static assets + Hono proxy Worker) |
| `apps/internal` | Vite + React Router (SPA) | Internal admin/dashboard | Cloudflare (static assets + Hono proxy Worker) |
| `apps/landing` | Astro | Marketing site | Cloudflare Workers |

The two NestJS apps share most of `apps/api/src/shared/*` and the same Prisma client from `@workspace/db`. The frontend apps share `@workspace/ui` primitives, `@workspace/types` Zod schemas, and `@workspace/data-access` React Query hooks.

### 1.2 Request topology

```
Browser (apps/app or apps/internal)
   │
   │ same-origin fetch to /api/v1/* (Hono proxy Worker)
   ▼
Cloudflare edge (static assets) → Hono proxy Worker (apps/<app>/api/index.ts)
   │
   │ cross-region fetch to api.docita.work
   ▼
NestJS API (apps/api) on Fly.io
   │
   ├─► Prisma → managed Postgres
   ├─► R2 (Cloudflare) for blob storage
   ├─► EventEmitter2 → in-process listeners
   └─► Postgres-backed job queue ──► apps/worker
```

The clinician and internal browsers do not talk to `api.docita.work` directly (see AGENTS.md §4): `/api/v1/*` traffic goes same-origin through each Vite app's Hono proxy Worker ([`apps/app/api/index.ts`](../../apps/app/api/index.ts) and [`apps/internal/api/index.ts`](../../apps/internal/api/index.ts)), backed by [`packages/utils/src/http/upstream-api-proxy.ts`](../../packages/utils/src/http/upstream-api-proxy.ts). This keeps cookies, CORS, and CSRF stable. The public landing site has a separate Astro BFF (§23.2).

### 1.3 Stack constraints

- Node ≥ 22.12.0, pnpm 10.30.3 only (workspace-wide, see [`package.json`](../../package.json)).
- Postgres is the single source of truth; Redis is optional and gated (`scripts/checks/check-cache-redis-required.mjs`).
- Shared HTTP contracts belong in `packages/types` and API DTOs wrap Zod schemas with `nestjs-zod` `createZodDto`. Frontend forms use `zodResolver`, reusing shared schemas where the HTTP shape matches and composing UI-only form schemas where it does not. `scripts/checks/check-type-duplicates.mjs` catches a narrow class of exported-shape duplication; it is not a proof that all shape drift is impossible.

---

## 2. Backend LLD

### 2.1 Domain-driven layout

Every API domain lives in `apps/api/src/domains/<domain>/` with four sub-folders:

```
apps/api/src/domains/<domain>/
├── core/                       # entities, value objects, repository INTERFACES, pure domain services
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/           # interfaces only
│   └── domain-services/        # pure functions (no @Injectable)
├── application/                # use cases, application services (CQS), DTOs, events, ports
│   ├── use-cases/
│   ├── services/               # *-command.service.ts, *-query.service.ts, facade *.service.ts
│   ├── dto/
│   ├── events/
│   └── ports/
├── infrastructure/             # Prisma repos, mappers, adapters, listeners
│   ├── persistence/
│   ├── mappers/
│   ├── repositories/
│   └── listeners/
└── presentation/               # controllers, route metadata
    └── controllers/
```

Enforced by [`scripts/checks/check-api-domain-layout.mjs`](../../scripts/checks/check-api-domain-layout.mjs). Canonical example: [`apps/api/src/domains/appointments/`](../../apps/api/src/domains/appointments/).

### 2.2 Request lifecycle

A request flows through a fixed chain declared in [`apps/api/src/app.module.ts:195-291`](../../apps/api/src/app.module.ts). The order is documented in the file itself:

```text
Guards (first registered runs first on inbound):
  E2EThrottlerGuard → JwtAuthGuard → StaffJwtAudienceGuard →
  TenantGuard → TenantRateLimitGuard → RolesGuard →
  SubscriptionStatusGuard → PasswordExpiredGuard →
  EmailVerifiedGuard → UserRateLimitGuard

Interceptors:
  CsrfInterceptor → RequestIdInterceptor → RequestContextInterceptor →
  IdempotencyInterceptor → TenantContextInterceptor → CacheInterceptor →
  RateLimitInterceptor → TimeoutInterceptor →
  PatientDataAuditInterceptor → BreakTheGlassInterceptor
```

Step-by-step contracts:

1. **Middleware**: helmet, CORS, body parsers, cookie parser. Set up in [`apps/api/src/main.ts`](../../apps/api/src/main.ts). The tenant middleware ([`shared/common/middleware/tenant.middleware.ts`](../../apps/api/src/shared/common/middleware/tenant.middleware.ts)) seeds the AsyncLocalStorage tenant store before any Prisma call can run.
2. **`RequestContextInterceptor`** ([`apps/api/src/shared/common/interceptors/request-context.interceptor.ts`](../../apps/api/src/shared/common/interceptors/request-context.interceptor.ts)): assigns/propagates `x-correlation-id` and runs the rest of the request inside an `AsyncLocalStorage` so any `@OnEvent` handler, logger, or Sentry capture can read the correlation id without it being passed explicitly.

   ```20:44:apps/api/src/shared/common/context/request-context.store.ts
   interface RequestContext {
     readonly correlationId: string;
   }

   const store = new AsyncLocalStorage<RequestContext>();
   // ...
   export function getCorrelationId(): string | undefined {
     return store.getStore()?.correlationId;
   }
   ```

3. **`JwtAuthGuard`** ([`apps/api/src/shared/modules/auth/auth/jwt-auth.guard.ts`](../../apps/api/src/shared/modules/auth/auth/jwt-auth.guard.ts)): verifies the JWT, populates `req.user`. Honors `@Public()` ([`public.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/public.decorator.ts)).
4. **`RolesGuard`** ([`roles.guard.ts`](../../apps/api/src/shared/modules/auth/auth/roles.guard.ts)): reads `@Roles()` ([`roles.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/roles.decorator.ts)) metadata.
5. **`TierGuard` / feature guards** ([`tier.guard.ts`](../../apps/api/src/shared/modules/auth/auth/tier.guard.ts), [`subscription-status.guard.ts`](../../apps/api/src/shared/modules/auth/guards/subscription-status.guard.ts)): enforce tier and feature gates via `FEATURE_TIER_MAP` (see §6.4).
6. **Validation pipes**: `ZodValidationPipe` from `nestjs-zod` runs against the controller's `createZodDto`-derived class.
7. **Controller**: thin — orchestration only. Enforced by [`scripts/checks/check-route-thinness.mjs`](../../scripts/checks/check-route-thinness.mjs).
8. **Application service / facade** → use case → repository → Prisma. See §3 for patterns.
9. **`PatientDataAuditInterceptor`** ([`patient-audit.interceptor.ts`](../../apps/api/src/shared/common/interceptors/patient-audit.interceptor.ts)) + **`BreakTheGlassInterceptor`** (class name; file [`emergency-access.interceptor.ts`](../../apps/api/src/shared/common/interceptors/emergency-access.interceptor.ts)): on successful write to any sensitive path, classifies the event (`AUTH_*`, `CLINICAL_*`, `BILLING_*`, etc.), sanitizes the payload via `sanitizeAuditPayload`, and persists an `AuditLog` row asynchronously. The break-the-glass interceptor records the justification when an emergency-access route is hit.

   ```24:35:apps/api/src/shared/common/interceptors/patient-audit.interceptor.ts
   const REDACTED_KEYS = new Set([
     'password',
     'currentPassword',
     'newPassword',
     'token',
     'refresh_token',
     'access_token',
     'mfa_challenge_token',
     'code',
     'secret',
     'signature',
   ]);
   ```

10. **`HttpExceptionFilter`** / global filter ([`apps/api/src/shared/modules/error-handling/filters/`](../../apps/api/src/shared/modules/error-handling/filters/)): translates exceptions to the canonical error envelope, mapping known Prisma error codes via [`prisma-error.registry.ts`](../../apps/api/src/shared/modules/error-handling/filters/prisma-error.registry.ts).

### 2.3 Module wiring

Domain modules declare their providers, controllers, and DI tokens. Example shape — see [`appointments.module.ts`](../../apps/api/src/domains/appointments/appointments.module.ts):

```ts
@Module({
  imports: [PrismaModule, AuthModule, /* ... */],
  controllers: [AppointmentsController, QueueController, /* ... */],
  providers: [
    AppointmentService,
    AppointmentQueryService,
    AppointmentCommandService,
    CreateAppointmentUseCase,
    /* ... */
    { provide: APPOINTMENT_READ_REPOSITORY_TOKEN, useClass: PrismaAppointmentReadRepository },
    { provide: APPOINTMENT_WRITE_REPOSITORY_TOKEN, useClass: PrismaAppointmentWriteRepository },
  ],
  exports: [AppointmentService],
})
```

Cross-domain imports are restricted by [`check-cross-domain-application-imports.mjs`](../../scripts/checks/check-cross-domain-application-imports.mjs) and [`check-cross-domain-infrastructure-imports.mjs`](../../scripts/checks/check-cross-domain-infrastructure-imports.mjs) — domains may import from `shared/`, `core/`, and from other domains' application-public interfaces only.

### 2.4 API domains inventory

Each folder under [`apps/api/src/domains/`](../../apps/api/src/domains/) follows §2.1. Current domains:

| Domain | Primary concerns |
| --- | --- |
| `analytics` | Usage and reporting aggregates |
| `appointments` | Scheduling, queue, overlap constraints (§9) |
| `billing` | Invoices, GST, clinical PDFs |
| `clinical` | Clinical automation schedulers |
| `clinics` | Onboarding, settings, workspace |
| `custom-fields` | Extensible field definitions |
| `dashboards` | Dashboard metrics |
| `doctor-clinics` | Doctor–clinic associations |
| `doctors` | Provider profiles, verification worker |
| `documents` | Storage port (R2/local), signed URLs |
| `enterprise-contracts` | Custom packages |
| `feedback` | Product feedback capture |
| `inventory` | Stock / supplies |
| `ipd` | Inpatient department |
| `leave` | Leave management |
| `medical-documents` | Uploaded clinical documents |
| `patient-portal` | Portal session auth |
| `patients` | Demographics, consent, DSR, PHI encryption |
| `payments` | Payment intents (Razorpay adapters) |
| `prescriptions` | Rx lifecycle, PDF, notifications |
| `public-booking` | Unauthenticated booking |
| `reminders` | Appointment reminders |
| `subscriptions` | Plans, dunning, Razorpay webhooks |
| `users` | Staff users, roles |
| `webhooks` | Provider ingress |
| `whatsapp` | Clinic WhatsApp + listeners |

New bounded contexts get a new top-level folder — not a `shared/services` god-module.

---

## 3. Design patterns catalog

Each pattern below has at least one canonical example from the repository. Use these as the model when adding new code.

### 3.1 Repository pattern

A repository hides Prisma behind an interface defined in `core/repositories/`. Controllers and services depend on the interface; the Prisma implementation lives in `infrastructure/persistence/`. Enforced by [`check-prisma-boundary.js`](../../scripts/checks/check-prisma-boundary.js).

**Canonical example**: appointments write side.

- Interface: [`apps/api/src/domains/appointments/core/repositories/appointment-write.repository.interface.ts`](../../apps/api/src/domains/appointments/core/repositories/appointment-write.repository.interface.ts)
- Implementation: [`apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts`](../../apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts)
- DI token: `APPOINTMENT_WRITE_REPOSITORY_TOKEN`

The implementation owns Prisma error translation. The 2026-05-25 appointment double-booking fix added a helper that converts Postgres exclusion-constraint violations into a domain-meaningful `BadRequestException`:

```29:40:apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts
async function withOverlapTranslation<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isPrismaExclusionViolation(error, APPOINTMENT_OVERLAP_CONSTRAINT)) {
      throw new BadRequestException({
        detail: 'Doctor has conflicting appointment',
      });
    }
    throw error;
  }
}
```

**Generic base repository** at [`apps/api/src/shared/common/repositories/base.repository.ts`](../../apps/api/src/shared/common/repositories/base.repository.ts) provides tenant-scoped `findOne`, `findAll`, `update`, `delete`. Two things matter:

1. `clinicId` is non-optional on all methods to make tenant leakage statically obvious:
   ```203:219:apps/api/src/shared/common/repositories/base.repository.ts
   async update(id: string, clinicId: string, data: Partial<T>): Promise<T> {
     if (!clinicId) {
       throw new Error(
         `${this.modelName}.update requires clinicId for tenant scoping`,
       );
     }
     const result = await this.model.updateMany({
       where: { id, clinicId },
       data,
     });
     // ...
   }
   ```
2. An explicit `findOneGlobal()` escape hatch for non-tenant-scoped models, with a "never for PHI" comment — anything else must take `clinicId`.

### 3.2 Command / Query Separation (CQS)

Within a domain, reads and writes split into separate services. The split is enforced by [`check-controller-cqs.mjs`](../../scripts/checks/check-controller-cqs.mjs).

**Canonical example**: appointments.

- Query service: [`apps/api/src/domains/appointments/application/services/appointment-query.service.ts`](../../apps/api/src/domains/appointments/application/services/appointment-query.service.ts)
- Command service: [`apps/api/src/domains/appointments/application/services/appointment-command.service.ts`](../../apps/api/src/domains/appointments/application/services/appointment-command.service.ts)
- Facade: [`apps/api/src/domains/appointments/application/services/appointment.service.ts`](../../apps/api/src/domains/appointments/application/services/appointment.service.ts) — keeps a stable public API for tests and DI while delegating internally.

Other domains that follow this split: billing (`invoices-command.service.ts` / `invoices-query.service.ts`), subscriptions (`subscriptions-query.service.ts`), leave (`leave-command.service.ts`), usage tracking (`usage-tracking-command.service.ts` / `usage-tracking-query.service.ts`).

### 3.3 Facade

A facade holds the legacy public interface and delegates to internal command/query/use-case classes. It exists so:
- existing tests that mock `new XService(...)` keep working when the internals split,
- consumers in other domains depend on a stable type.

```40:75:apps/api/src/domains/appointments/application/services/appointment.service.ts
@Injectable()
export class AppointmentService {
  private readonly queryService: AppointmentQueryService;
  private readonly commandService: AppointmentCommandService;

  constructor(
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    readRepository: IAppointmentReadRepository,
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    writeRepository: IAppointmentWriteRepository,
    createAppointmentUseCase: CreateAppointmentUseCase,
    // ...
  ) {
    this.queryService = new AppointmentQueryService(readRepository, prisma);
    this.commandService = new AppointmentCommandService(/* ... */);
  }
```

Facades larger than the size budget that *don't* delegate are flagged by [`check-facade-delegation.mjs`](../../scripts/checks/check-facade-delegation.mjs).

### 3.4 Use-case classes

A use case is a single-purpose application service that takes a typed command and returns a typed result. The pattern is one class per write operation, constructor-injected dependencies, single `execute()` method.

**Canonical example**: [`CreateAppointmentUseCase`](../../apps/api/src/domains/appointments/application/use-cases/create-appointment.use-case.ts).

```40:93:apps/api/src/domains/appointments/application/use-cases/create-appointment.use-case.ts
async execute(command: CreateAppointmentCommand): Promise<Appointment> {
  if (command.startTime >= command.endTime) {
    throw new BadRequestException('Start time must be before end time');
  }

  const overlap = await this.schedulingRules.validateAppointmentOverlap(
    command.doctorId, command.clinicId,
    command.startTime, command.endTime,
  );
  if (overlap.hasConflict) {
    throw new BadRequestException({ /* ... */ });
  }
  // ...
  await this.appointmentRepository.save(appointment);
  return appointment;
}
```

Other canonical use cases: `cancel-appointment.use-case.ts`, `reschedule-appointment.use-case.ts`, `start-consultation.use-case.ts`, `update-appointment-details.use-case.ts`, `record-appointment-vitals.use-case.ts`, `activate-subscription.use-case.ts`, `create-checkout.use-case.ts`, `resume-subscription-payment.use-case.ts`.

### 3.5 Strategy / Adapter

Used when the same operation has multiple provider implementations.

**Storage** — abstract base class with two concretions (R2 in prod, local FS in dev):

```30:60:apps/api/src/domains/documents/application/ports/storage-provider.port.ts
export abstract class StorageProvider {
  abstract readonly supportsSignedUrls: boolean;

  abstract upload(file: StorageFile, folder?: string, options?: StorageUploadOptions): Promise<string>;
  abstract delete(url: string): Promise<void>;
  abstract uploadBuffer(buffer: Buffer, objectKey: string, contentType: string, options?: StorageUploadOptions): Promise<string>;
  abstract generateSignedUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
```

- R2 implementation: [`apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts`](../../apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts) — uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Local implementation: [`apps/api/src/domains/documents/infrastructure/local-storage.provider.ts`](../../apps/api/src/domains/documents/infrastructure/local-storage.provider.ts).

**Payments** — Razorpay adapters separated by capability (orders, subscriptions, webhooks):

- [`apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay-order.adapter.ts`](../../apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay-order.adapter.ts)
- [`apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay.adapter.ts`](../../apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay.adapter.ts)
- Boundary enforced by [`check-razorpay-adapters.mjs`](../../scripts/checks/check-razorpay-adapters.mjs).

**Queue** — abstract `IQueueProvider` with `postgres-queue.service.ts` (prod) and `in-memory-queue.service.ts` (test):

- [`apps/api/src/shared/modules/queue/queue.interface.ts`](../../apps/api/src/shared/modules/queue/queue.interface.ts)
- [`apps/api/src/shared/modules/queue/postgres-queue.service.ts`](../../apps/api/src/shared/modules/queue/postgres-queue.service.ts)

### 3.6 Observer (Pub/Sub via EventEmitter2)

Cross-module side effects flow over `EventEmitter2`. Channel names are an enum to prevent string drift, enforced by [`check-application-event-constants.mjs`](../../scripts/checks/check-application-event-constants.mjs).

```6:19:apps/api/src/shared/common/events/application-events.ts
export enum ApplicationEvents {
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  DOCTOR_DELAY_MARKED = 'doctor-delay.marked',
  PRESCRIPTION_CREATED = 'prescription.created',
  INVOICE_GENERATED = 'invoice.generated',
  NOTIFICATION_CREATED = 'notification.created',
  // ...
  WHATSAPP_MESSAGE_SENT = 'whatsapp.message.sent',
  OCR_PAGE_PROCESSED = 'ocr.page.processed',
}
```

Emitter side ([`appointment-command.service.ts:57-65`](../../apps/api/src/domains/appointments/application/services/appointment-command.service.ts)):

```57:65:apps/api/src/domains/appointments/application/services/appointment-command.service.ts
this.eventEmitter.emit(
  ApplicationEvents.APPOINTMENT_CREATED,
  new AppointmentCreatedEvent(
    appointment.id, appointment.clinicId, appointment.patientId, appointment,
  ),
);
```

Listener side examples:
- [`apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts`](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts)
- [`apps/api/src/domains/whatsapp/application/listeners/staff-notification.listener.ts`](../../apps/api/src/domains/whatsapp/application/listeners/staff-notification.listener.ts)
- [`apps/api/src/shared/modules/messaging/email/email-events.listener.ts`](../../apps/api/src/shared/modules/messaging/email/email-events.listener.ts)
- [`apps/api/src/shared/modules/audit/audit/audit-event.listener.ts`](../../apps/api/src/shared/modules/audit/audit/audit-event.listener.ts)

Listeners run inside the same `AsyncLocalStorage` context as the emitting request (see §2.2) so they log the correct correlation id.

### 3.7 Decorator pattern (cross-cutting concerns)

Custom decorators in `apps/api/src/shared/modules/auth/auth/` annotate routes and classes; guards read the metadata via `Reflector`.

| Decorator | Defined in | Read by |
| --- | --- | --- |
| `@Public()` | [`public.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/public.decorator.ts) | `JwtAuthGuard` |
| `@Roles(...)` | [`roles.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/roles.decorator.ts) | `RolesGuard` |
| `@RequireFeature(Feature.X)` | feature guard module | `FeatureGuard` |
| `@AllowNoClinic()` | [`allow-no-clinic.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/allow-no-clinic.decorator.ts) | tenant guard |
| `@Tier(...)` | [`tier.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/tier.decorator.ts) | `TierGuard` |
| `@PatientPortalSession()` | [`patient-portal-session.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/patient-portal-session.decorator.ts) | session guard |
| `@UploadSessionSecretRoute()` | [`upload-session-secret-route.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/upload-session-secret-route.decorator.ts) | upload guard |

[`check-controller-rbac.mjs`](../../scripts/checks/check-controller-rbac.mjs) enforces that every controller route declares either `@Public`, `@Roles`, `@RequireFeature`, or inherits a controller-level posture.

### 3.8 Template Method (PDF rendering)

`BasePdfService` defines the rendering pipeline (header → title → patient details → doctor details → body → footer). Renderers (`InvoicePdfRenderer`, `PrescriptionPdfRenderer`, `ClinicalInvoicePdfService`) fill the variable steps.

- Base: [`apps/api/src/shared/modules/document-generation/pdf/base-pdf.service.ts`](../../apps/api/src/shared/modules/document-generation/pdf/base-pdf.service.ts) — `createDocument`, `renderHeader`, `renderTitle`, `renderPatientDetails`, `renderDoctorDetails`, `renderFooter`, `drawDivider`, `checkPageBreak`.
- Strategy contract: [`pdf-document-renderer.interface.ts`](../../apps/api/src/shared/modules/document-generation/pdf/pdf-document-renderer.interface.ts):
  ```22:30:apps/api/src/shared/modules/document-generation/pdf/pdf-document-renderer.interface.ts
  export interface IPdfDocumentRenderer {
    generatePrescription(data: PrescriptionPdfInput): Promise<Buffer>;
    generateInvoice(data: InvoicePdfInput): Promise<Buffer>;
    generate(config: PDFConfig): Promise<Buffer>;
  }
  ```
- Concretions: `invoice-pdf.renderer.ts`, `prescription-pdf.renderer.ts`, `clinical-invoice-pdf.service.ts`.

The renderers themselves are stateless and reusable; per-request data is passed in.

### 3.9 Factory (test fixtures + value-object factories)

- Test factories: [`apps/api/test/factories.ts`](../../apps/api/test/factories.ts) — provides `aClinic()`, `aPatient()`, `anAppointment()`, etc. with sensible defaults.
- Value-object factories: `AppointmentStatus.scheduled()`, `AppointmentStatus.cancelled()`, etc., as static methods on the VO class — avoids constructor noise and centralizes invariants.

### 3.10 Mapper (Prisma ↔ Domain)

Mappers translate between Prisma rows and domain objects in both directions. They live in `infrastructure/mappers/<entity>.mapper.ts`.

**Canonical example**: [`apps/api/src/domains/appointments/infrastructure/mappers/appointment.mapper.ts`](../../apps/api/src/domains/appointments/infrastructure/mappers/appointment.mapper.ts).

- `toDomain(raw: PrismaAppointment): Appointment` — parses JSON columns via `parsePrismaJsonColumn` + Zod schemas, normalizes enum values, returns a domain entity that enforces its own invariants.
- `toPersistence(domain: Appointment): Prisma.AppointmentUncheckedCreateInput` — builds the write payload from `domain.toPlain()` plus conditional JSON column inclusion.
- `toListItem(raw)` — denormalized list shape for `GET /appointments`; parses the response shape with `appointmentListItemResponseSchema` to guarantee API/contract parity.

### 3.11 Domain entities and value objects

Entities enforce invariants in the constructor and throw `InvariantViolationError` (not `HttpException`) on violation — keeps the domain HTTP-agnostic.

```140:152:apps/api/src/domains/appointments/core/entities/appointment.entity.ts
private validate(): void {
  if (this.startTime >= this.endTime) {
    throw new InvariantViolationError(
      'Appointment start time must be before end time',
    );
  }

  if (!this.clinicId || !this.patientId || !this.doctorId) {
    throw new InvariantViolationError(
      'Clinic, Patient, and Doctor IDs are required',
    );
  }
}
```

State transitions are also methods on the entity (`reschedule`, `cancel`, `complete`), not arbitrary Prisma updates.

### 3.12 DTO + Zod (HTTP contract)

A single Zod schema is the source of truth. `nestjs-zod`'s `createZodDto` wraps it for the controller; the same schema is reused on the frontend via React Hook Form or the `validate()` API client helper.

Pipeline (typical):
1. Schema in `packages/types/src/<domain>/*.ts` — e.g. `listPatientsQuerySchema`, `patientResponseSchema`.
2. DTO class in `apps/api/src/domains/<domain>/application/dto/*.dto.ts` — `export class ListPatientsQuery extends createZodDto(listPatientsQuerySchema) {}`.
3. Controller signature: `@Query() query: ListPatientsQuery`.
4. Frontend usage:
   ```54:65:apps/app/src/lib/api/api-client.ts
   export const typedApi = {
     patients: {
       list: (params?: { limit?: number; page?: number; search?: string }) =>
         client.validate(
           API_ROUTES.patients.list,
           listPatientsResponseSchema,
           params ? { params: listPatientsQuerySchema.parse(params) } : undefined,
         ),
   ```

Contract strictness is enforced by [`check-contract-strictness.mjs`](../../scripts/checks/check-contract-strictness.mjs) and [`check-type-duplicates.mjs`](../../scripts/checks/check-type-duplicates.mjs).

### 3.13 Pure rules / calculators

Deterministic business math lives in plain modules with no NestJS decorators or DI. They are 100% unit-testable.

- [`apps/api/src/domains/appointments/core/domain-services/appointment-interval-overlap.ts`](../../apps/api/src/domains/appointments/core/domain-services/appointment-interval-overlap.ts) — `findFirstSchedulingConflict`, `intervalsOverlap`.
- [`apps/api/src/domains/billing/core/services/pricing-helpers.ts`](../../apps/api/src/domains/billing/core/services/pricing-helpers.ts) — invoice line-item math.
- [`apps/api/src/domains/appointments/core/domain-services/appointment-update-patch.rules.ts`](../../apps/api/src/domains/appointments/core/domain-services/appointment-update-patch.rules.ts) — what fields may be patched in which status.

Tests live next to them; [`check-domain-rules-tests.mjs`](../../scripts/checks/check-domain-rules-tests.mjs) requires a `*.spec.ts` alongside any `rules/*.ts`.

### 3.14 Anti-corruption layer (error translation in repositories)

Pattern recap from the appointment double-booking fix: the repository is the only layer that knows Prisma error codes. It catches them and re-throws domain-meaningful exceptions. Existing examples:

| SQLSTATE / Prisma code | Translated to | Cited at |
| --- | --- | --- |
| `23P01` (`PrismaClientUnknownRequestError`, exclusion constraint) | `BadRequestException` | [`prisma-appointment-write.repository.ts:29-40`](../../apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts) |
| `P2002` (unique) | `BadRequestException` or treated as idempotent | [`pdf-job.service.ts:159-166`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts), [`idempotency.repository.ts:19-21`](../../apps/api/src/shared/modules/idempotency/idempotency.repository.ts) |
| `P2021` (missing table) | gracefully ignored in monitoring writes | [`prisma-missing-table.ts`](../../apps/api/src/shared/common/utils/prisma-missing-table.ts) |

The doc for this pattern is the new helper at [`apps/api/src/shared/common/utils/prisma-exclusion-violation.ts`](../../apps/api/src/shared/common/utils/prisma-exclusion-violation.ts). When a new invariant is best enforced as a DB constraint (uniqueness, exclusion, check), add a constraint name to a helper here and translate in the repository.

### 3.15 Registry pattern (pluggable strategies)

When behavior varies by `(entityType, mode)` or by import file type, the codebase uses a **registry** — a map from a typed key to a strategy implementation — instead of `switch` statements in controllers.

| Registry | Key | Canonical file |
| --- | --- | --- |
| Search | `(SearchEntityType, SearchMode)` | [`search-strategy.registry.ts`](../../apps/api/src/shared/modules/search/search-strategy.registry.ts) |
| Bulk import | `ImportKind` | [`bulk-import-strategy.registry.ts`](../../apps/api/src/shared/modules/imports/bulk-import-strategy.registry.ts) |
| Authorization policies | resource string → `AbacPolicy` | [`abac-policy.registry.ts`](../../apps/api/src/shared/modules/authorization/abac-policy.registry.ts) |
| PDF processors | `PdfDocumentType` | [`pdf-processor-registration.ts`](../../apps/api/src/shared/modules/queue/pdf-processor-registration.ts) |

**Contract:**

1. Register strategies at module bootstrap (`onModuleInit` or static map).
2. The orchestrator (search service, import service, policy engine) resolves the strategy and never branches on string literals.
3. Each strategy owns tenant scoping and pagination — the controller passes only validated DTOs.

Adding a new searchable entity means: implement `ISearchStrategy`, register in the registry, add FTS migration/index if needed — not a new `if` in a god-service.

### 3.16 Chain of Responsibility (authorization policies)

Backend authorization for fine-grained resources (patient record, invoice, appointment) uses an **ABAC policy chain** (ADR-0013), not ad-hoc `if (role === …)` in controllers.

- Pure, framework-agnostic policies live in [`packages/authorization/src/policies/`](../../packages/authorization/src/policies/) (`patient.policy.ts`, `invoice.policy.ts`, …) and are registered in [`AbacPolicyRegistry`](../../apps/api/src/shared/modules/authorization/abac-policy.registry.ts).
- Resolvers map DB rows to resource attributes in [`apps/api/src/shared/modules/authorization/resolvers/`](../../apps/api/src/shared/modules/authorization/resolvers/).
- [`AuthorizationService.evaluateAbac`](../../apps/api/src/shared/modules/authorization/authorization.service.ts) is the decision point; the global `PolicyGuard` (`APP_GUARD`, last stage) enforces it — 403 on deny, 404 on `tenant_mismatch` (no existence disclosure).
- Controllers declare `@RequirePolicy(resource, action)`; the static `check:policy-resolver-coverage` gate fails the build if a declared resource has no registered resolver (fail-closed).

The **frontend mirror** is [`apps/app/src/lib/access-control/access-policy.ts`](../../apps/app/src/lib/access-control/access-policy.ts). UI hides nav entries and blocks routes; the API is still authoritative. Never gate sensitive writes on the client alone.

`@RequireFeature` (tier/feature matrix) and policy engine (role + resource + action) are **orthogonal**: a user may have `Feature.PATIENTS` but still be denied `DELETE` on a specific patient by policy.

### 3.17 Builder pattern (FHIR resources)

FHIR export/import builds HL7 FHIR JSON through **builders/factories**, not string templates.

- Orchestrator: [`fhir.service.ts`](../../apps/api/src/shared/modules/fhir/fhir.service.ts)
- Per-resource factories: [`fhir/factories/fhir-patient.factory.ts`](../../apps/api/src/shared/modules/fhir/factories/fhir-patient.factory.ts), `fhir-appointment.factory.ts`, etc.
- HTTP output is serialized through FHIR response DTOs. FHIR is an export/projection surface today, not a persistence shape.

This keeps clinical mapping (Indian identifiers, clinic timezone on instants) in one place per resource type.

### 3.18 State machine (domain entities)

Aggregates with lifecycle rules encode transitions as **methods on the entity**, not as free-form status updates in services.

**Appointments** ([`appointment.entity.ts`](../../apps/api/src/domains/appointments/core/entities/appointment.entity.ts)): `reschedule`, `cancel`, `complete`, `markNoShow` each validate `AppointmentStatus` transitions and throw `InvariantViolationError` when illegal.

**Subscriptions** (billing domain): dunning and activation paths go through command services that call entity methods or dedicated state objects — avoid `prisma.subscription.update({ status: 'X' })` from controllers.

When adding a new status value: update the Prisma enum (additive migration), `packages/types` enum/schema, entity transition table, and any exclusion/unique constraints that reference status (see §9).

### 3.19 Bridge pattern (notification channels)

[`notification-orchestrator.service.ts`](../../apps/api/src/shared/modules/messaging/notification-orchestrator.service.ts) is the abstraction; **channels** are the implementations:

- [`channels/email.channel.ts`](../../apps/api/src/shared/modules/messaging/channels/email.channel.ts)
- [`channels/whatsapp.channel.ts`](../../apps/api/src/shared/modules/messaging/channels/whatsapp.channel.ts)
- [`channels/sms.channel.ts`](../../apps/api/src/shared/modules/messaging/channels/sms.channel.ts)

The orchestrator picks a channel from user/clinic preferences and tier (WhatsApp may be mode-blocked). Template rendering uses typed registries under `messaging/templates/` with Zod-validated params. Failures on one channel can fall through to another only where product explicitly allows it — do not silently drop clinical alerts.

### 3.20 Unit of Work (Prisma transactions)

Multi-step writes use a transaction runner at the **application** boundary (use case or command service), not inside repositories unless the repository method is explicitly named `*InTransaction`. [`transaction-runner.port.ts`](../../apps/api/src/shared/common/ports/transaction-runner.port.ts) keeps Prisma out of application code; [`transaction-runner.ts`](../../apps/api/src/prisma/transaction-runner.ts) is the Prisma adapter.

Examples:

- Onboarding clinic + user + subscription seed — [`onboarding-tx.repository`](../../apps/api/src/domains/clinics/core/repositories/onboarding-tx.repository.interface.ts) documents the transactional boundary.
- Outbox append co-located with domain write — durable domain-event handoff (§60).

[`check-multi-write-transaction.mjs`](../../scripts/checks/check-multi-write-transaction.mjs) flags service methods that perform multiple `create`/`update` calls without a transaction wrapper.

**Outbox writes** should participate in the same transaction as the aggregate mutation when using `IOutboxService.append` (see §60). The general queue port does not currently accept a transaction client; do not claim queue enqueue is atomic with a business mutation unless the concrete producer proves it.

### 3.21 Query objects (lightweight; not full Specification)

The codebase does **not** use a formal Specification pattern with composable predicates. Instead:

- **List/query DTOs** in `packages/types` define allowed filters (`listPatientsQuerySchema`, `listAppointmentsQuerySchema`).
- **Repositories** translate DTOs into Prisma `where` objects in one method (`buildWhereFromQuery`).
- **Search strategies** encapsulate FTS + ranking.

If filter composition grows beyond ~3 dimensions for one aggregate, extract a `*QueryBuilder` helper in `infrastructure/persistence/` rather than spreading optional chaining across the service.

### 3.22 Resilience (timeouts and backoff; no circuit breaker library)

External IO uses **bounded timeouts**, not a shared circuit-breaker framework:

- HTTP: [`fetch-with-timeout.ts`](../../apps/api/src/shared/common/http/fetch-with-timeout.ts) — enforced by [`check-external-http-timeouts.mjs`](../../scripts/checks/check-external-http-timeouts.mjs).
- Razorpay: `withRazorpayTimeout` wrapper in the adapter layer (§3.5).
- Outbox relay: exponential backoff on `OutboxEvent.attempts` ([`outbox-relay.scheduler.ts`](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts)).
- Queue consumers: `SKIP LOCKED` + DLQ (§14).

**Intentionally absent:** Hystrix-style circuit breakers, bulkheads per provider, and automatic half-open retry storms. Operational mitigation is rate limits (§8.5), Fly grace periods (ADR 0011), and playbooks under `docs/operations/playbooks/`.

For bounded parallel fan-out (imports, OCR pages), use [`map-with-concurrency.ts`](../../packages/utils/src/async/map-with-concurrency.ts) with an explicit concurrency limit — never unbounded `Promise.all` in schedulers ([`check-promise-all-in-schedulers.mjs`](../../scripts/checks/check-promise-all-in-schedulers.mjs)).

### 3.23 Additional domains using the standard stack

Beyond appointments, these domains are reference implementations for the §2 layout:

| Domain | CQS split | Notable patterns |
| --- | --- | --- |
| `billing` | `invoices-command` / `invoices-query` | PDF jobs, Razorpay webhooks, pricing helpers |
| `subscriptions` | query + webhook handlers | Tier activation use cases, dunning |
| `patients` | command/query + DSR | Consent, export, versioned field encryption |
| `prescriptions` | command + PDF orchestrator | Event listeners → WhatsApp |
| `whatsapp` | inbox + reconciliation worker | EventEmitter listeners, rate quotas |
| `clinical` | schedulers in worker | Reminders, coding sync |
| `enterprise-contracts` | worker module | Custom tier packages |

When touching an older domain that still has a fat `*.service.ts`, prefer extracting command/query and a use case per write path (§3.2–3.4) rather than growing the facade.

---

## 4. Database design

### 4.1 Schema layout

[`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma) is the only Prisma source. The former hand-maintained topic snapshots under [`packages/db/prisma/schema/`](../../packages/db/prisma/schema/) were retired because they could drift from the schema Prisma actually consumes. The retained README explains the retirement and points reviewers back to the canonical file.

### 4.2 Core models worth knowing

**Appointment** ([`schema.prisma`](../../packages/db/prisma/schema.prisma)) carries the bulk of clinical data alongside scheduling. Key columns:

- `version Int @default(1)` — optimistic concurrency on updates.
- `status AppointmentStatus` — `SCHEDULED | CONFIRMED | RESCHEDULING | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW`.
- Domain-specific exam JSON columns (`dentalChart`, `ophthalmologyExam`, `cardiologyExam`, `gynecologyExam`, `dermatologyExam`, `psychiatryExam`, `growthData`) — parsed via Zod schemas in the mapper to keep typing honest.
- Indexes: `@@index([clinicId, status, startTime])` is the hot composite for calendar queries; per-doctor and per-patient indexes for filtered lookups.

**RefreshToken** ([`schema.prisma`](../../packages/db/prisma/schema.prisma)) post-2026-05-24 hashing migration:
- `token` — legacy column (now NULL-able). Carries raw values issued before the migration; reads still fall back to it.
- `tokenHash` — SHA-256 of new tokens; uniquely indexed.
- `tokenFamily` — string id used to detect reuse-after-rotation (see §6.1).
- `replacedByToken`, `revokedAt` — for rotation chain and revocation.

### 4.3 Constraints — what the database enforces

| Constraint | Migration | Purpose |
| --- | --- | --- |
| `Appointment_no_active_overlap` (EXCLUDE GiST) | [`20260525130000_appointment_overlap_exclusion`](../../packages/db/prisma/migrations/20260525130000_appointment_overlap_exclusion/migration.sql) | Race-safe double-booking guard — see §9 for full details |
| `RefreshToken.tokenHash` UNIQUE | [`20260524000000_refresh_token_hash`](../../packages/db/prisma/migrations/20260524000000_refresh_token_hash/migration.sql) | Hashed-at-rest refresh token uniqueness |
| FK `ON DELETE RESTRICT` on PHI-bearing relations | [`20260523180000_audit_phi_relation_restrict`](../../packages/db/prisma/migrations/20260523180000_audit_phi_relation_restrict/migration.sql) | Never silently lose audit-bearing PHI when a doctor/patient/user is deleted |
| FK `ON DELETE SET NULL` for `Patient.user` | same migration | Patient records outlive a deleted user account |
| `Subscription.razorpayPaymentId` UNIQUE | [`20260523190000_audit_subscription_payment_idempotency`](../../packages/db/prisma/migrations/20260523190000_audit_subscription_payment_idempotency/migration.sql) | Webhook idempotency — see §6.7 |
| `User_clinic_onboarding_completion_trigger` | [`20260601120000_preserve_existing_user_onboarding_completion`](../../packages/db/prisma/migrations/20260601120000_preserve_existing_user_onboarding_completion/migration.sql) | Existing clinic users never re-enter full onboarding — see §68 |

### 4.4 Optimistic concurrency

`Appointment.version`, `Subscription.version`, and similar columns implement optimistic concurrency for updates. Repositories increment on every write:

```67:78:apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts
const result = await withOverlapTranslation(
  this.prisma.appointment.updateMany({
    where: { id, clinicId },
    data: {
      ...updateData,
      version: { increment: 1 },
    },
  }),
);
if (result.count === 0) {
  throw new NotFoundException(`Appointment ${id} not found`);
}
```

This protects against lost-update on concurrent edits but **does not protect against insert-time races** — those need a DB constraint (the exclusion constraint pattern from §3.14).

### 4.5 Indexes and query plans

Hot-path composite indexes were added incrementally; representative migrations:

- [`20251127182129_add_performance_indexes`](../../packages/db/prisma/migrations/20251127182129_add_performance_indexes/migration.sql) — baseline hot indexes.
- [`20260412120000_optimize_composite_indexes`](../../packages/db/prisma/migrations/20260412120000_optimize_composite_indexes/migration.sql) — composite reshaping.
- [`20260404165000_expand_latency_indexes`](../../packages/db/prisma/migrations/20260404165000_expand_latency_indexes/migration.sql) — latency-driven additions.
- [`20260329000000_optimize_indexes`](../../packages/db/prisma/migrations/20260329000000_optimize_indexes/migration.sql) — cleanup pass.

Guardrail scripts in `@workspace/db` (from `packages/db/package.json`): `db:check-integrity`, `db:analyze-indexes`, `db:check-query-plans`, `db:profile-queries`, `db:guardrail`. Run before merging schema/index changes per AGENTS.md §10.

### 4.6 Migration safety

Two scripts wrap raw Prisma migrate to make staging/prod safer:

- `pnpm --filter @workspace/db run db:migrate:dry-run` — preview without applying.
- `pnpm --filter @workspace/db run db:migrate:safe` — apply with extra integrity checks.

The migration prefix and reversibility are checked by [`check-migration-prefix-collision.mjs`](../../scripts/checks/check-migration-prefix-collision.mjs) and [`check-migration-reversibility.mjs`](../../scripts/checks/check-migration-reversibility.mjs).

### 4.7 Multi-tenant scoping and RLS

Tenant scoping is layered four ways. Each layer is independently sufficient to catch most leakage; together they are belt-and-suspenders.

**Layer 1 — JWT carries `clinicId`** (§7.2). Controllers extract it from `req.user`, never from URL or body.

**Layer 2 — `BaseRepository` requires `clinicId`**. `update`, `delete`, `exists` throw if `clinicId` is missing (§3.1).

**Layer 3 — Prisma tenant extension (fails closed)**. The most important and least-documented layer. [`apps/api/src/shared/common/extensions/tenant.extension.ts`](../../apps/api/src/shared/common/extensions/tenant.extension.ts) wraps every Prisma operation:

```9:54:apps/api/src/shared/common/extensions/tenant.extension.ts
export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-extension',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const rule = getTenantScopeRule(model);
        if (!rule) {
          return query(args);
        }

        const tenant = getCurrentTenant();

        if (tenant?.bypassed) {
          return query(args);
        }

        if (!tenant?.clinicId) {
          // Pre-tenant access is allowed only for self-scoped `User` operations.
          if (
            tenant?.preTenant &&
            model === 'User' &&
            tenant.userId &&
            (operation === 'findUnique' /* ... */ ||
              operation === 'update')
          ) {
            const typedArgs = coerceTenantExtensionArgs(args);
            const where = typedArgs.where ?? {};
            if (where['id'] !== tenant.userId) {
              throw new Error(
                `Security Violation: Pre-tenant access to '${model}' must be scoped to the authenticated user.`,
              );
            }
            return query(args);
          }

          throw new Error(
            `Security Violation: Attempted to access tenant-scoped model '${model}' without a valid tenant context.`,
          );
        }
        // ...
        applyTenantScopeForTest(model, operation, typedArgs, tenant.clinicId);
        return query(args);
```

Any Prisma operation on a tenant-scoped model **without** a `clinicId` in the current AsyncLocalStorage tenant context throws. The only pre-tenant escape is reading/updating the authenticated user's own row during onboarding, and the extension verifies `where.id === tenant.userId` before allowing it. The scope rules live in [`tenant-scope-policy.ts`](../../apps/api/src/shared/common/extensions/tenant-scope-policy.ts).

**Layer 4 — Postgres RLS (feature-gated; verify per environment)**. The supporting machinery exists. Local defaults may keep `RLS_ENABLED=false`, while the checked-in Fly API and worker configs set it to `true`. Actual enforcement still depends on provisioning and using the `docita_app` connection role, so repository configuration is not proof that a live environment is enforcing RLS. Follow [`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md):

- `RlsService`, `TenantContextInterceptor`, and SQL `tenant_isolation` policies — wired behind `RLS_ENABLED`; effective enforcement still requires the non-owner `docita_app` runtime role.
- [`check-rls-rollout-readiness.mjs`](../../scripts/checks/check-rls-rollout-readiness.mjs) — readiness gate.
- [`check-rls-bypass-annotation.mjs`](../../scripts/checks/check-rls-bypass-annotation.mjs) — every Prisma call that bypasses the tenant extension (and, post-flip, RLS) must be annotated.
- `prisma.runUnrestricted(fn)` — the controlled bypass used by auth resolution (before clinic context exists) and background workers. Every site is annotated `// RLS-BYPASS:` with a reason, e.g. [`pdf-job.service.ts:85`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts), [`auth-session.service.ts:57`](../../apps/api/src/shared/modules/auth/auth/auth-session.service.ts).

### 4.8 Archives

Long-retention but cold data (audit logs, old appointments, WhatsApp logs) move to `*Archive` tables in the canonical [`schema.prisma`](../../packages/db/prisma/schema.prisma) via scheduled jobs in [`apps/api/src/shared/modules/compliance/data-retention.scheduler.ts`](../../apps/api/src/shared/modules/compliance/data-retention.scheduler.ts). The archive tables drop foreign keys (the archived row no longer needs to reference live records) and add `archivedAt`.

---

## 5. API design

### 5.1 Routing and base URL

All routes are mounted under `/api/v1/*`. In Cloudflare builds, [`apps/app/api/index.ts`](../../apps/app/api/index.ts) and [`apps/internal/api/index.ts`](../../apps/internal/api/index.ts) proxy same-origin `/api/v1/*` requests with [`packages/utils/src/http/upstream-api-proxy.ts`](../../packages/utils/src/http/upstream-api-proxy.ts). In local Vite development, the dev-server proxy (`vite.config.ts`) preserves the same browser contract. Browser telemetry uses API routes under the same `/api/v1/*` proxy path.

### 5.2 Validation

New request bodies, query objects, and params should use `createZodDto`-derived classes where a structured boundary exists. Response DTOs increasingly use `@ZodSerializerDto`; data-access clients parse shared response schemas on the paths they own. Keep closing legacy gaps rather than assuming every historical controller already has full request-and-response parity.

### 5.3 Auth posture per route

Controllers declare one of:
- `@Public()` for unauthenticated endpoints (e.g. login, password reset, public booking).
- `@Roles(Role.DOCTOR, Role.ADMIN, ...)` for role-scoped routes.
- `@RequireFeature(Feature.X)` for feature-gated routes (see §6.4).
- Combinations stack (`@Roles` AND `@RequireFeature` both fire).

[`check-controller-rbac.mjs`](../../scripts/checks/check-controller-rbac.mjs) fails the build if any controller route lacks a declared posture.

### 5.4 Idempotency

Two patterns are in use:

1. **Idempotency keys** for client-driven retry safety — [`apps/api/src/shared/modules/idempotency/idempotency.repository.ts`](../../apps/api/src/shared/modules/idempotency/idempotency.repository.ts). Catches `P2002` on `(clinicId, key)` unique to return the stored response.
2. **Job-level idempotency** for queue producers — [`pdf-job.service.ts:79-134`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts) catches `P2002` on the `PdfJob` unique key (`clinicId + documentType + documentId`) to return the existing job instead of enqueueing twice.

Job idempotency invariants are enforced by [`check-job-idempotency.mjs`](../../scripts/checks/check-job-idempotency.mjs).

### 5.5 Webhooks

Razorpay webhooks land in dedicated handlers under [`apps/api/src/domains/subscriptions/application/webhooks/razorpay/handlers/`](../../apps/api/src/domains/subscriptions/application/webhooks/razorpay/handlers/) and [`apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts`](../../apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts). Required pieces:

- **Signature verification** before any side effect ([`check-webhook-signatures.mjs`](../../scripts/checks/check-webhook-signatures.mjs)).
- **Replay protection** via [`apps/api/src/shared/modules/webhooks/webhook-replay-dedupe.repository.ts`](../../apps/api/src/shared/modules/webhooks/webhook-replay-dedupe.repository.ts) keyed on `razorpayPaymentId` (the new unique migration in §4.3). Enforced by [`check-webhook-replay-protection.mjs`](../../scripts/checks/check-webhook-replay-protection.mjs).
- **Idempotent application** — handlers catch `P2002` on the payment-id unique and treat the duplicate as already-processed ([`subscription-charged.webhook-handler.ts:79-82`](../../apps/api/src/domains/subscriptions/application/webhooks/razorpay/handlers/subscription-charged.webhook-handler.ts)).

### 5.6 Error envelope

Errors flow through the bootstrap-registered [`AllExceptionsFilter`](../../apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts). Prisma errors are mapped via [`prisma-error.registry.ts`](../../apps/api/src/shared/modules/error-handling/filters/prisma-error.registry.ts). The active response is problem-details shaped: `{ type, title, status, detail, instance, timestamp, code?, validationErrors? }`; development responses may also include `stack` and `errorType`. The older module-level filter was removed so there is one active envelope.

### 5.7 Health checks

[`apps/api/src/shared/common/controllers/health-check.controller.ts`](../../apps/api/src/shared/common/controllers/health-check.controller.ts) exposes liveness/readiness probes. The readiness probe checks Prisma connectivity and (when configured) Redis.

---

## 6. Frontend design

### 6.1 Feature architecture

Each feature owns its surface inside `apps/app/src/features/<feature>/`:

```
features/appointments/
├── components/          # presentational + container components
├── hooks/               # use-* hooks combining data-access + local state
├── rules/               # business rules (with *.spec.ts colocated)
├── lib/                 # feature-local helpers
├── types/               # feature-local types (NOT shared types)
└── index.ts             # public surface; barrel export
```

Cross-feature imports are blocked by [`check-feature-boundaries.mjs`](../../scripts/checks/check-feature-boundaries.mjs). Shared code lives in `apps/app/src/{components,hooks,lib}` (reached via `@/components`, `@/hooks`, `@/lib`) until ≥2 apps need it, at which point it promotes to `packages/*`.

### 6.2 Providers

[`apps/app/src/providers/`](../../apps/app/src/providers/) wires the React Query client, navigation, theme, and the data-access bridge:

- The data-access bridge ([`data-access-bridge.tsx`](../../apps/app/src/providers/react-query-provider.tsx)) injects the session-aware fetcher, `clinicId`, and tier guard into `@workspace/data-access` via `DataAccessProvider`.
- [`apps/app/api/index.ts`](../../apps/app/api/index.ts) — CSP nonce generation, auth redirects for protected routes, and `/api/v1/*` proxy to the API (see §45).

Provider order in the root layout matters: QueryClient → Auth → Clinic → DataAccess → Socket (when enabled) → theme/appearance.

### 6.2.1 Client state (Zustand)

Server state lives in **React Query** (§6.3). Cross-cutting **client** state uses Zustand stores under [`apps/app/src/lib/stores/`](../../apps/app/src/lib/stores/):

| Store | Purpose | Persistence |
| --- | --- | --- |
| [`permission-store.ts`](../../apps/app/src/lib/stores/permission-store.ts) | Cached `currentTier`, `currentMode`, feature overrides from `syncFromClinic` | Session memory; **not** billing truth — see [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md) |
| [`appearance-store.ts`](../../apps/app/src/lib/stores/appearance-store.ts) | Theme / density preferences | `localStorage` (allowlisted by `check-client-storage-usage.mjs`) |

Feature-local UI state stays in feature hooks (`useState` / `useReducer`). Do not add a global store for data that already has an API source of truth.

### 6.2.2 Real-time (Socket.io)

[`socket-context.tsx`](../../apps/app/src/lib/socket/socket-context.tsx) connects to Nest gateways ([`payment.websocket.gateway.ts`](../../apps/api/src/websockets/payment.websocket.gateway.ts), [`notifications.gateway.ts`](../../apps/api/src/websockets/notifications.gateway.ts)) using the **in-memory access token** (§7.4) because WebSocket handshakes do not send httpOnly cookies the same way as `fetch`.

**Invalidation contract (§16.3):** socket events trigger React Query `invalidateQueries` — they do not push partial entity state into Zustand. This keeps one cache owner and avoids dual sources of truth for appointments, payments, and notifications.

### 6.3 Data fetching: `@workspace/data-access` + React Query

The pattern is: domain hooks live in `packages/data-access/src/hooks/` (e.g. `useAppointments`, `usePatients`, `useBillingHistory`) and consume `useDataAccessContext()` for the fetcher, clinic id, and tier guard. App-level composition (auth, locale, toasts) lives in `apps/app/src/features/<feature>/hooks/`. The legacy `apps/app/src/hooks/api/` directory is forbidden ([`check-legacy-app-api-hooks.mjs`](../../scripts/checks/check-legacy-app-api-hooks.mjs)).

Inline `fetch()` in features is blocked by [`check-frontend-fetch.mjs`](../../scripts/checks/check-frontend-fetch.mjs).

Runtime query defaults are applied by the data-access wrappers through [`packages/data-access/src/core/stale-time.ts`](../../packages/data-access/src/core/stale-time.ts). It maps query-key prefixes to stale times so cache policy stays next to the shared React Query layer:

```ts
export const STALE_TIME_BY_PREFIX = {
  appointments: SHORT_STALE_TIME_MS,
  notifications: SHORT_STALE_TIME_MS,
  dashboard: MEDIUM_STALE_TIME_MS,
  patients: MEDIUM_STALE_TIME_MS,
  clinic: LONG_STALE_TIME_MS,
  reference: LONG_STALE_TIME_MS,
} as const;
```

Stale time is intentionally **short** for queue/live-state data and **longer** for reference data. The older package and app-local tables were removed; [`packages/data-access/src/core/stale-time.ts`](../../packages/data-access/src/core/stale-time.ts) is the single effective registry and carries regression tests for hot prefixes.

### 6.4 Tier and feature gating (frontend mirror of API)

The single source of truth is `FEATURE_TIER_MAP` in `packages/types`. Same map drives:

- Backend: `@RequireFeature(Feature.X)` and `assertClinicHasFeatureOrThrow(clinic, Feature.X)`.
- Frontend: `<FeatureGate feature={Feature.X}>...</FeatureGate>` ([`apps/app/src/components/auth/feature-gate.tsx`](../../apps/app/src/components/auth/feature-gate.tsx)) and `hasFeatureAccess(clinic, Feature.X)` ([`apps/app/src/lib/subscription/tier-access.ts`](../../apps/app/src/lib/subscription/tier-access.ts)).

Numeric tier comparisons (`tier >= Tier.INTELLIGENCE`) are banned ([`check-tier-comparisons.mjs`](../../scripts/checks/check-tier-comparisons.mjs)). Front Desk gating is tier-only (`isFrontDeskTier(tier)`) — workspace-profile concepts were removed and are blocked by [`check-workspace-profile-gating.mjs`](../../scripts/checks/check-workspace-profile-gating.mjs).

### 6.5 Memoization

Patterns in use (look for `React.memo`, `useMemo`, `useCallback` in feature components):

- **Stable callbacks** passed to child lists — `useCallback` with the minimal dependency set, especially in calendar and queue components.
- **Selector memoization** — when reading from large React Query payloads, `useMemo` to derive view-specific shapes (e.g. grouping appointments by hour, sorting by priority).
- **`React.memo` on row components** in long lists (patient lists, invoice items).
- **`@workspace/ui` primitives are pre-memoized** where appropriate; consumer code should not wrap them again.

Anti-pattern (avoid): wrapping everything in `useMemo` without measuring. Profile first; memoize where re-renders are demonstrable.

### 6.6 Render strategies and code splitting

- All clinician routes default to client components (`'use client'`) because they need session, React Query, and interactivity.
- Server components are used in `apps/app/src/layout.tsx` and the root-level shells.
- Lazy-load heavy panels (PDF viewer, charts, settings sub-pages) with `React.lazy` + `Suspense` in the Vite apps; the chunk graph is bounded by [`check-file-size-budget.mjs`](../../scripts/checks/check-file-size-budget.mjs) and the perf budget gates (`perf:budget:enforce` / `perf:route-budgets:enforce`).
- Suspense + error boundary pairs are enforced by [`check-suspense-error-boundary-pair.mjs`](../../scripts/checks/check-suspense-error-boundary-pair.mjs) — any Suspense boundary must have a sibling error boundary so the page never gets stuck.

### 6.7 Forms

React Hook Form + Zod resolver. Example patterns are repeated across `apps/app/src/features/onboarding/`, `apps/app/src/features/patients/`, `apps/app/src/features/appointments/`, and settings forms. Reuse a shared request schema when the form is the HTTP shape; otherwise compose a UI-only form schema and map deliberately at submit time. [`check-form-schema-extends.mjs`](../../scripts/checks/check-form-schema-extends.mjs) reports form schemas that appear to fork a base schema.

### 6.8 UI primitives

`@workspace/ui` is grouped by concern under `packages/ui/src/components/`:

- `form/` — `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `FormField`.
- `overlay/` — `Dialog`, `Sheet`, `Popover`, `Tooltip`, `Toast`, `WizardDialog`.
- `layout/` — `AppShell`, `AppPageScaffold`, `PageHeader`, `PageContainer`, `Section`, `Breadcrumbs`, `PageTabs`.
- `feedback/` — `DataState`, `EmptyState`, `LoadingState`, `ErrorState`, `Skeleton`.
- `data-display/` — `Table`, `DataGrid`, `Card`, `Stat`, `ProgressGauge`, `CategoryAvatar`.
- `navigation/` — `TopBar`, `SideNav`, `AskAiButton`, `AskAiOverlay`.
- `indicators/` — badges, status pills, tier chips.

Every page composes `AppPageScaffold → PageHeader → DataState → Content`. App-local duplicates of these primitives are blocked at review per AGENTS.md §4.3.

---

## 7. Authentication and session management

The most security-sensitive area in the codebase. Both sides (API issuance and frontend usage) are detailed.

### 7.1 Token shapes and TTLs

Defined once in [`packages/auth/src/session-semantics.ts`](../../packages/auth/src/session-semantics.ts):

```1:11:packages/auth/src/session-semantics.ts
/** Shared browser/API CSRF double-submit contract. */
export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
export const CSRF_RESPONSE_HEADER_NAME = "X-CSRF-Token";

/** Short-lived access JWT; refresh tokens cover long sessions. */
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

/** Refresh token lifetime (30 days). */
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
```

- **Access token**: JWT, 15-minute TTL, signed by NestJS `JwtService`. Audience varies by role (`jwtAudienceForRole`).
- **Refresh token**: opaque `nanoid(64)`, 30-day TTL, stored hashed in `RefreshToken.tokenHash` (SHA-256). Pre-2026-05-24 rows still carry raw values in `RefreshToken.token` and are honored by fallback lookup during the cycle-out period.

### 7.2 Issuance flow

```43:108:apps/api/src/shared/modules/auth/auth/auth-session.service.ts
async login(
  user: UserWithoutPassword,
  tokenFamily?: string,
  deviceInfo?: AuthDeviceInfo,
): Promise<AuthLoginResult> {
  const payload: Record<string, unknown> = {
    email: user.email,
    sub: user.id,
    role: user.role,
    name: user.name,
    clinicId: user.clinicId,
  };
  // ...
  const accessToken = this.jwtService.sign(payload, {
    audience: jwtAudienceForRole(user.role),
  });
  const refreshToken = nanoid(64);

  const newTokenFamily = tokenFamily || nanoid(16);

  await this.prisma.refreshToken.create({
    data: {
      token: null,
      tokenHash: this.hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(
        Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
      ),
      tokenFamily: newTokenFamily,
      deviceName: deviceInfo?.deviceName,
      ipAddress: deviceInfo?.ipAddress,
      userAgent: deviceInfo?.userAgent,
      lastUsedAt: this.clock.now(),
    },
  });
  // ...
}
```

The API returns tokens in the JSON body **and** sets cookies. Cookie attributes ([`auth-cookie.helpers.ts`](../../apps/api/src/shared/modules/auth/auth/auth-cookie.helpers.ts)):

```5:30:apps/api/src/shared/modules/auth/auth/auth-cookie.helpers.ts
function getCookieOptions(configService: AppConfigService) {
  const isProduction = configService.isProduction();
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access_token: string; refresh_token: string },
  configService: AppConfigService,
): void {
  const cookieOptions = getCookieOptions(configService);
  res.cookie('access_token', tokens.access_token, {
    ...cookieOptions,
    maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie('refresh_token', tokens.refresh_token, {
    ...cookieOptions,
    maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/v1/auth',
  });
}
```

Both cookies are `HttpOnly + Secure(prod) + SameSite=strict`. The refresh cookie is scoped to `/api/v1/auth` so it's not sent on regular API calls — only on refresh/logout.

### 7.3 Token family rotation (reuse detection)

Every refresh chain shares a `tokenFamily` id. On refresh:

```110:172:apps/api/src/shared/modules/auth/auth/auth-session.service.ts
async refreshTokens(incomingRefreshToken: string): Promise<AuthLoginResult> {
  const incomingHash = this.hashToken(incomingRefreshToken);
  // Try hash first; fall back to raw token for legacy rows.
  const storedToken = await this.prisma.runUnrestricted(async () => {
    return (
      (await this.prisma.refreshToken.findUnique({
        where: { tokenHash: incomingHash },
        include: { user: true },
      })) ??
      (await this.prisma.refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true },
      }))
    );
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < this.clock.now()) {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  if (storedToken.replacedByToken) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenFamily: storedToken.tokenFamily,
        userId: storedToken.userId,
      },
      data: { revokedAt: this.clock.now() },
    });

    throw new UnauthorizedException(
      'Token reuse detected. All sessions have been revoked. Please log in again.',
    );
  }
  // issue new tokens, mark old as replaced
}
```

If a refresh token that has already been rotated (`replacedByToken` set) is presented, **the entire family is revoked**. This is the standard rotating-refresh-token defense against stolen-token replay.

### 7.4 Frontend storage and use

[`apps/app/src/lib/auth/session.ts`](../../apps/app/src/lib/auth/session.ts) creates a session manager keyed `docita_token` over the data-access factory:

```9:23:apps/app/src/lib/auth/session.ts
export const appSession = createBrowserSessionManager({
  apiUrl: API_URL,
  tokenStorageKey: "docita_token",
  redirectStorageKey: APP_REDIRECT_AFTER_LOGIN_KEY,
  publicPaths: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/portal/login",
    "/book",
  ],
  resolveLoginPath: resolveAppLoginPath,
});
```

`createBrowserSessionManager` ([`packages/data-access/src/lib/browser-session.ts`](../../packages/data-access/src/lib/browser-session.ts)) keeps:

- The **access token in memory only** (no `localStorage`). The httpOnly `access_token` cookie is the durable session credential; the in-memory token exists for non-cookie-bearing channels such as `wss://` socket auth. On hard reload the in-memory token is empty until the bootstrap refresh fetch — which rides the httpOnly refresh-token cookie — returns a new one. Any legacy token from earlier client versions is evicted from `localStorage` on construction so it cannot be exfiltrated post-upgrade.
- The **CSRF token in-memory only** (read from the `XSRF-TOKEN` cookie if absent, captured from the `X-CSRF-Token` response header):
  ```77:94:packages/data-access/src/lib/browser-session.ts
  const getCsrfToken = (): string | null => {
    if (inMemoryCsrfToken) return inMemoryCsrfToken;
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${csrfCookieKey}=([^;]*)`),
    );
    const encoded = match?.[1];
    return encoded ? decodeURIComponent(encoded) : null;
  };

  const captureCsrfFromResponse = (response: Response): void => {
    const headerToken = response.headers.get("X-CSRF-Token");
    if (headerToken && headerToken.length > 0) {
      inMemoryCsrfToken = headerToken;
    }
  };
  ```
- The **refresh token is never read by JS** — it lives in the `HttpOnly` cookie scoped to `/api/v1/auth`. Refresh is performed by POSTing to `/auth/refresh` with `credentials: include`; the cookie is sent automatically.

Request attach pattern ([`apps/app/src/lib/api/api-client.ts`](../../apps/app/src/lib/api/api-client.ts)):

```27:55:apps/app/src/lib/api/api-client.ts
export async function fetchWithSession(
  endpoint: string,
  init?: RequestInit,
): Promise<Response> {
  const csrfToken = appSession.getCsrfToken();
  const request = (token: string | null) =>
    fetch(`${API_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: mergeHeaders(init?.headers, token, csrfToken, init?.method),
    });

  let response = await request(appSession.getToken());
  if (response.status === 401) {
    const refreshed = await appSession.refreshAccessToken();
    if (refreshed) {
      response = await request(appSession.getToken());
    }
  }

  if (response.status === 401) {
    appSession.clearSession();
    appSession.redirectToLogin();
  }

  appSession.captureCsrfFromResponse(response);
  return response;
}
```

**Refresh is single-flight** — `refreshInFlight` map dedupes concurrent refreshes per `(apiUrl, tokenStorageKey)` so a burst of 401s does not produce a stampede.

### 7.5 CSRF (double-submit, header-exposed variant)

- Cookie `XSRF-TOKEN` is set with `httpOnly: true, secure, sameSite: 'strict'` — it is **not** readable from JS ([`csrf.interceptor.ts:27-44`](../../apps/api/src/shared/common/interceptors/csrf.interceptor.ts#L27)). This is a deliberate hardening over the standard double-submit pattern.
- The server exposes the same token on the `X-CSRF-Token` **response header** on every safe-method request. The client reads from there and echoes it back as `X-XSRF-TOKEN` on every mutating method (POST/PUT/PATCH/DELETE).
- Cross-check: the interceptor reads `XSRF-TOKEN` from the request cookie (server-side; cookies cross on every request regardless of httpOnly) and compares it to the `X-XSRF-TOKEN` request header. Mismatch → `ForbiddenException('Invalid or missing CSRF token')`.
- Names are imported from `@workspace/auth` (no string literals) — that's the contract.

**Bypasses** (all narrow and intentional, see [`csrf.interceptor.ts`](../../apps/api/src/shared/common/interceptors/csrf.interceptor.ts)):

1. `Authorization: Bearer …` requests — token-auth is CSRF-safe by construction.
2. Public web-vitals beacon (`/api/v*/monitoring/web-vitals`) — no session.
3. Public booking writes (`/public/booking/clinics/…`) — pre-auth, may be cross-site.
4. **Auth-bootstrap exemption** (`canBootstrapCsrfForAuthMutation`): pre-auth routes such as login, register, MFA verify, and password reset may bootstrap a CSRF token even when stale auth cookies are present. Other `/auth/*` mutations bootstrap only when no `access_token` or `refresh_token` cookie exists. Session-bound `/auth/logout`, `/auth/refresh`, and change-password flows retain the strict double-submit check.

### 7.5.1 Why httpOnly on the CSRF cookie

The standard double-submit pattern uses a JS-readable cookie because the client needs to copy its value into the request header. We chose the **header-exposed variant**:

- The token is delivered to the client via `X-CSRF-Token` response header on every safe request.
- The cookie stays httpOnly so an XSS payload cannot read the token by walking `document.cookie`.
- A successful XSS still has the page's fetch context and could make state-changing requests *with* the implicit cookie ride-along — but it cannot harvest the token to mint requests from elsewhere, and a stale-token attack via the cookie alone fails the double-submit compare.

The trade-off: anything that strips or transforms the `X-CSRF-Token` response header (a misconfigured CDN, a future caching layer) silently breaks login. The middleware proxy ([`upstream-api-proxy.ts`](../../packages/utils/src/http/upstream-api-proxy.ts), §45) must pass it through.

### 7.6 MFA (TOTP + hashed backup codes)

[`MfaService`](../../apps/api/src/shared/modules/auth/auth/mfa.service.ts) implements optional second-factor for staff accounts:

- **TOTP** via `otplib` (`generateSecret` / `verify`) with a QR code rendered by `qrcode`. The TOTP secret is **encrypted at rest** via `EncryptionService` before being stored on the user row.
- **Backup codes**: 10 single-use codes are generated with `nanoid`, **bcrypt-hashed** (`bcrypt.hash(code, 10)`) and stored as a JSON column on the user row; `MfaService` generates and manages the hashes itself (the former `packages/types` backup-code schemas were removed as dead code). The plaintext codes are returned to the user **once** at enrollment.
- Verifying a backup code at login does a bcrypt compare across the stored hashes and then **removes** the matched hash so the code cannot be reused.
- Disabling MFA requires a valid current TOTP code — there is no admin override path that skips verification.

### 7.7 Token storage posture (resolved)

The previous version of this doc tracked "access token in `localStorage`" as known debt. As of the cookie-only migration:

- `createBrowserSessionManager` no longer writes the access token to `localStorage` and removes any legacy stored value on construction.
- Same-origin clients (`apps/app/src/lib/api/api-client.ts`, the shared `client-factory`, the monitoring beacon) ride the httpOnly `access_token` cookie via `credentials: "include"` and no longer attach `Authorization: Bearer`.
- The in-memory token is retained only for non-cookie channels (wss:// socket auth).
- The JWT guard continues to accept either source, so any future cross-origin SDK consumer can still use Bearer auth without a server change.

Net effect: an XSS that achieves script execution can no longer read the access token from `document.cookie` (the cookie is httpOnly) or from `localStorage` (it isn't stored there). It still has the page's fetch context — but mutations must pass the double-submit CSRF check (§7.5), and the attacker has no way to harvest a token to use elsewhere.

---

## 8. Security

### 8.1 PHI handling and audit

- **No plaintext PHI in app logs.** Operational logs may carry reviewed identifiers and counts needed for triage, but not plaintext names, emails, phone numbers, DOBs, addresses, clinical narrative, or token material. The serializer/redactor and [`check-sensitive-logging.mjs`](../../scripts/checks/check-sensitive-logging.mjs) enforce part of this boundary; keep log-site review in the loop.
- **Audit trail** for sensitive writes via `PatientDataAuditInterceptor` (§2.2). Coverage enforced by [`check-audit-logging.mjs`](../../scripts/checks/check-audit-logging.mjs), [`check-audit-coverage.mjs`](../../scripts/checks/check-audit-coverage.mjs), [`check-phi-read-audit.mjs`](../../scripts/checks/check-phi-read-audit.mjs).
- **Emergency access** is recorded via [`apps/api/src/shared/common/interceptors/emergency-access.interceptor.ts`](../../apps/api/src/shared/common/interceptors/emergency-access.interceptor.ts) with break-glass justification.
- **Sentry PHI scrubbing** in the frontend (canonical scrubber [`packages/utils/src/monitoring/phi-scrubber.ts`](../../packages/utils/src/monitoring/phi-scrubber.ts), wired in `apps/app/src/lib/monitoring/`) and equivalent on the backend ([`check-sentry-scrubbing.mjs`](../../scripts/checks/check-sentry-scrubbing.mjs)).

### 8.2 Encryption

- **Refresh tokens at rest**: SHA-256 hashed (§7.1).
- **Field-level encryption** for sensitive columns via `EncryptionService` ([`apps/api/src/shared/common/encryption.service.ts`](../../apps/api/src/shared/common/encryption.service.ts)) using `ENCRYPTION_KEY`. Coverage tracked by [`check-phi-encryption-coverage.mjs`](../../scripts/checks/check-phi-encryption-coverage.mjs).
- **Secrets rotation** procedure: [`docs/operations/SECRET_ROTATION_CHECKLIST.md`](../operations/SECRET_ROTATION_CHECKLIST.md).
- **Critical env vars** (per AGENTS.md §6): `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `ENCRYPTION_KEY` (64-char hex), `VITE_API_URL`. Process-env access patterns checked by [`check-process-env.mjs`](../../scripts/checks/check-process-env.mjs).

### 8.3 Webhook security

Covered in §5.5. The combination is:

1. Signature verification on every inbound webhook ([`check-webhook-signatures.mjs`](../../scripts/checks/check-webhook-signatures.mjs)).
2. Replay-dedupe table keyed on provider event id ([`webhook-replay-dedupe.repository.ts`](../../apps/api/src/shared/modules/webhooks/webhook-replay-dedupe.repository.ts), [`check-webhook-replay-protection.mjs`](../../scripts/checks/check-webhook-replay-protection.mjs)).
3. Idempotent application — `P2002` on the provider payment-id unique is treated as "already processed".

### 8.4 PDF security: signed URLs

This is the section the original question called out specifically.

**How a PDF is created and served**:

1. **Enqueue**: a write-side path (invoice paid, prescription signed) calls `pdfJobService.enqueue(documentId, documentType, clinicId)`. The job is persisted in `PdfJob`, keyed uniquely on `(clinicId, documentType, documentId)`. If a duplicate enqueue happens, `P2002` is caught and the existing job id is returned ([`pdf-job.service.ts:97-112`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts)).
2. **Render**: the worker picks up the job, the renderer (template-method §3.8) produces a `Buffer`, and `storageProvider.uploadBuffer(buffer, objectKey, 'application/pdf')` writes it to R2 ([`r2-storage.provider.ts:153-171`](../../apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts)). The **`objectKey` is what gets persisted** in `Invoice.pdfUrl` / `Prescription.pdfUrl` and, despite its historical column name, `PdfJob.pdfUrl` — not a signed URL.
3. **Serve**: when a client asks for the PDF URL or polls a completed async job, the query service calls `storageProvider.generateSignedUrl(objectKey, GENERATED_PDF_SIGNED_URL_TTL_SECONDS)`:
   ```300:330:apps/api/src/domains/billing/application/services/invoices-query.service.ts
   if (invoice.pdfUrl) {
     const url = await this.storageProvider.generateSignedUrl(
       invoice.pdfUrl,
       SIGNED_URL_TTL_SECONDS,
     );
     // ...
   }
   ```
4. **Sign**: R2 (S3-compatible) issues a presigned URL via `@aws-sdk/s3-request-presigner`:
   ```173:184:apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts
   async generateSignedUrl(
     objectKey: string,
     expiresInSeconds: number,
   ): Promise<string> {
     const ttl = this.assertSignedUrlTtl(expiresInSeconds);
     const command = new GetObjectCommand({
       Bucket: this.bucket,
       Key: objectKey,
     });

     return getSignedUrl(this.client, command, { expiresIn: ttl });
   }
   ```

**TTL contract** ([`storage-provider.port.ts`](../../apps/api/src/domains/documents/application/ports/storage-provider.port.ts)):

- Floor: `MIN_SIGNED_URL_TTL_SECONDS = 30` (anything shorter has no operational use).
- Ceiling: `MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60` (24h — tighter than the R2 max of 7d).
- **Invoice and prescription PDFs**: call sites use the storage-port-owned `GENERATED_PDF_SIGNED_URL_TTL_SECONDS = 15 * 60` (**15 minutes**).
- **Generic stored files**: [`stored-file-url-resolver.service.ts`](../../apps/api/src/domains/documents/application/services/stored-file-url-resolver.service.ts) uses the storage-port-owned `GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS = 4 * 60 * 60` (**4 hours**) for object-key resolution. Do not assume every generic upload is non-PHI; classify attachment surfaces before relying on this default.

```68:85:apps/api/src/domains/documents/application/ports/storage-provider.port.ts
protected assertSignedUrlTtl(expiresInSeconds: number): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new BadRequestException(
      `Signed URL TTL must be a positive finite number, received ${String(expiresInSeconds)}`,
    );
  }
  if (expiresInSeconds < MIN_SIGNED_URL_TTL_SECONDS) {
    return MIN_SIGNED_URL_TTL_SECONDS;
  }
  if (expiresInSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
    return MAX_SIGNED_URL_TTL_SECONDS;
  }
  return Math.floor(expiresInSeconds);
}
```

**Why this is safe**:

- Generated PDF object keys are deterministic tenant-filtered document paths such as `pdfs/invoices/<id>.pdf` and `pdfs/prescriptions/<id>.pdf`. Their safety comes from private object storage, endpoint authorization, and time-limited signatures — not from key entropy.
- Presigned URLs are time-limited and signed against the R2 account credentials.
- The endpoint that issues the URL is itself behind auth and tier guards (`@RequireFeature(Feature.INVOICING)` on `GET /invoices/:id/pdf`, see [`invoices.controller.ts`](../../apps/api/src/domains/billing/presentation/controllers/invoices.controller.ts)) — the caller must be authorized for the underlying invoice/prescription record, which is tenant-filtered (`clinicId`) inside the query service before the URL is generated.
- **Every invoice/prescription PDF endpoint access writes a PHI-read audit entry** via `logPatientPhiRead(...)` before it returns a signed URL, raw bytes, an async acknowledgement, or job status.
- TTL is clamped server-side; a client cannot ask for a 7-day URL.
- PDF and status branches call [`setPrivateNoStoreHeaders`](../../apps/api/src/shared/common/http/private-download-response.ts), preventing browser or intermediary caching of signed-URL JSON, raw bytes, async acknowledgements, and job status.

**Properties that are intentionally not used**:

- We do not embed the JWT in the PDF URL. The URL is a separate capability.
- We do not expose `objectKey` to the client — only the signed URL.
- We do not generate "permanent" URLs.

### 8.5 Rate limiting and abuse

`@nestjs/throttler` is wired into [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts) with per-route overrides. See [`docs/operations/RATE_LIMITS.md`](../operations/RATE_LIMITS.md) for the per-endpoint matrix.

### 8.6 Tenant safety end-to-end

Belt and suspenders (see §4.7 for the full layered model):

1. JWT carries `clinicId` (§7.2) and `JwtAuthGuard` puts it on `req.user`.
2. `TenantGuard` + tenant middleware seed the AsyncLocalStorage tenant context before any handler runs.
3. `BaseRepository` rejects writes without `clinicId` (§3.1) and domain repositories always include `clinicId` in `where` clauses.
4. **Prisma tenant extension** fails closed if any tenant-scoped model is touched without a `clinicId` in the current context (§4.7, Layer 3) — this is the kill-switch against accidental cross-tenant leaks in new code.
5. Cross-tenant data references checked by [`check-auth-tenant-safety.mjs`](../../scripts/checks/check-auth-tenant-safety.mjs).
6. Postgres RLS is feature-gated: code and configuration exist, but each environment still needs effective-role verification and a staging soak — see §4.7, Layer 4.

### 8.7 Upload safety

[`check-upload-validation.mjs`](../../scripts/checks/check-upload-validation.mjs) requires every upload endpoint to validate mime type and size before passing to `StorageProvider.upload(...)`. The provider then re-sanitizes the filename (`sanitizeFilename` in [`storage-provider.port.ts:61-66`](../../apps/api/src/domains/documents/application/ports/storage-provider.port.ts)).

---

## 9. Concurrency: race-safe writes (the recent change)

This section documents the pattern landed on 2026-05-25 for appointment double-booking, because it is the model to copy for similar invariants.

### 9.1 Problem

`CreateAppointmentUseCase` did a check-then-insert:

1. `validateAppointmentOverlap(...)` — `findMany` against active rows.
2. `repository.save(appointment)` — `prisma.appointment.create(...)`.

Under READ COMMITTED (default), two parallel requests for overlapping slots on the same doctor could both pass step 1 and both succeed at step 2, producing a silent double-booking.

### 9.2 Fix: DB exclusion constraint + repository error translation

[`packages/db/prisma/migrations/20260525130000_appointment_overlap_exclusion/migration.sql`](../../packages/db/prisma/migrations/20260525130000_appointment_overlap_exclusion/migration.sql):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'));
```

Postgres now refuses any insert/update that would create a second active appointment overlapping an existing one on the same `(clinicId, doctorId)`. The `[)` (half-open) range lets back-to-back slots not collide. Cancelled / no-show / completed rows are excluded, so rebookings remain possible.

Repository translates `23P01` to `BadRequestException` so the application layer sees the same shape the pre-flight check throws (§3.1, §3.14):

```29:40:apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-write.repository.ts
async function withOverlapTranslation<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isPrismaExclusionViolation(error, APPOINTMENT_OVERLAP_CONSTRAINT)) {
      throw new BadRequestException({
        detail: 'Doctor has conflicting appointment',
      });
    }
    throw error;
  }
}
```

### 9.3 Why this pattern (and not the alternatives)

- **Not a transaction lock**: locks must be remembered on every code path. A constraint is enforced regardless of caller.
- **Not Serializable isolation**: would require retry plumbing on every booking call site.
- **Not advisory locks**: brittle to forget; same problem as transaction locks.
- **DB constraint** is enforced for migrations, raw `psql`, scripts, and every code path past, present, and future.

### 9.4 Generalization

Pattern checklist for any future "check, then insert" race:

1. Identify the invariant. Can the database express it (`UNIQUE`, `EXCLUDE`, `CHECK`)?
2. Add the constraint via migration.
3. Add or reuse a helper in `apps/api/src/shared/common/utils/` that detects the violation by constraint name and Prisma error class.
4. In the repository, wrap the write with a translator that converts the violation into a domain-meaningful exception matching the existing pre-flight check.
5. Keep the application-level pre-flight check — it gives nicer error messages and avoids touching the DB in the contested case.

---

## 10. Performance

### 10.1 Measurement infrastructure

| Script | What it measures |
| --- | --- |
| [`scripts/perf/perf-baseline.mjs`](../../scripts/perf/perf-baseline.mjs) | Captures baseline bundle sizes, route weights, and time-to-interactive for `apps/app` and `apps/internal`. Output is checked into baselines for regression comparison. |
| [`scripts/perf/check-perf-budget.mjs`](../../scripts/perf/check-perf-budget.mjs) | Compares current build against baseline; fails if any route or chunk exceeds the budget. Run via `pnpm perf:budget:warn` (advisory) and `pnpm perf:budget:enforce` (fails CI). |
| [`scripts/perf/check-a11y-budget.mjs`](../../scripts/perf/check-a11y-budget.mjs) | Accessibility violation budget. |
| [`scripts/perf/accessibility-audit.ts`](../../scripts/perf/accessibility-audit.ts) + [`run-app-accessibility-audit.mjs`](../../scripts/perf/run-app-accessibility-audit.mjs) | Playwright-driven axe-core runs against critical pages. |
| [`scripts/perf/sync-a11y-baseline.mjs`](../../scripts/perf/sync-a11y-baseline.mjs) | Refresh the baseline when a fix legitimately changes the report. |

### 10.2 Web vitals

The clinician frontend collects web vitals in [`web-vitals-reporter.tsx`](../../apps/app/src/lib/monitoring/web-vitals.ts) and posts to `/api/v1/monitoring/web-vitals` with `keepalive: true`. That request follows the same-origin middleware proxy (§45). This satisfies the AGENTS.md §4 rule that browser telemetry must not POST directly to `api.docita.work`.

Failure mode: vitals telemetry must be non-blocking and must not produce console noise. The proxy swallows errors silently and uses `keepalive: true` so it survives page unload.

### 10.3 Backend latency and slow queries

- Every request carries an `x-correlation-id` propagated through `AsyncLocalStorage` (§2.2), allowing log correlation across services and `@OnEvent` listeners.
- Sentry tags every captured exception with the correlation id ([`request-context.interceptor.ts:46-54`](../../apps/api/src/shared/common/interceptors/request-context.interceptor.ts)).
- DB profile scripts: `db:profile-queries`, `db:check-query-plans`, `db:analyze-indexes`. Run before merging hot-path changes per AGENTS.md §10.
- N+1 detection script: [`check-n-plus-1.mjs`](../../scripts/checks/check-n-plus-1.mjs).
- External HTTP timeouts: every outbound fetch must use `fetchWithTimeout` ([`apps/api/src/shared/common/http/fetch-with-timeout.ts`](../../apps/api/src/shared/common/http/fetch-with-timeout.ts)), enforced by [`check-external-http-timeouts.mjs`](../../scripts/checks/check-external-http-timeouts.mjs).

### 10.4 Caching

- React Query owns the client cache (§6.3). Stale times are intentional and per-data-type, not a global default.
- A backend cache module (`apps/api/src/cache/`, `CacheConfigModule`) wraps an optional Redis behind an in-memory fallback. `check-cache-redis-required.mjs` blocks deploying with `CACHE_BACKEND=redis` until Redis is provisioned.
- Cloudflare edge caching is **not** used for authenticated routes — they're marked dynamic. Static assets and the marketing site use long cache TTLs by default.

### 10.5 Bundle and code-splitting controls

- [`check-file-size-budget.mjs`](../../scripts/checks/check-file-size-budget.mjs) — 400-line cap on API service files and feature components (backstop, not a quality measure; see AGENTS.md §15.5).
- `pnpm knip` — unused exports/deps. Scope-aware in CI ([`scripts/workflow/detect-workflow-scope.mjs`](../../scripts/workflow/detect-workflow-scope.mjs)).

### 10.6 Render performance

- Server-rendered shells with client-rendered routes (§6.6) keep TTFB cheap and let the heavy components hydrate progressively.
- Origin-inspired UI standard ([`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md)) forbids decorative motion — no `animate-pulse` on chrome, no `transition-all`, no skeleton wave animations — which removes a class of unnecessary layout work.
- `DataState` at the page level is mandatory; inline `Loading…` text is forbidden so users don't see partial trees.

### 10.7 Worker performance and back-pressure

- The Postgres-backed queue ([`postgres-queue.service.ts`](../../apps/api/src/shared/modules/queue/postgres-queue.service.ts)) uses `SKIP LOCKED` for safe concurrent consumption.
- Worker size budget: [`check-worker-size.mjs`](../../scripts/checks/check-worker-size.mjs).
- DLQ controller: [`dlq.controller.ts`](../../apps/api/src/shared/modules/queue/dlq.controller.ts) — exposes failed jobs to internal tooling.
- Detached promises (unawaited `then`s that hide errors) are blocked by [`check-detached-promises.mjs`](../../scripts/checks/check-detached-promises.mjs).
- Cron schedules are linted by [`check-cron-schedules.mjs`](../../scripts/checks/check-cron-schedules.mjs).

---

## 11. Automation map

CI enforces invariants; reviewers enforce judgment. The checks below are the mechanical layer.

| Concern | Check |
| --- | --- |
| Layering / DDD | `check-prisma-boundary.js`, `check-api-domain-layout.mjs`, `check-cross-domain-application-imports.mjs`, `check-cross-domain-infrastructure-imports.mjs`, `check-backend-structure.mjs` |
| Repository + thin controller | `check-controller-cqs.mjs`, `check-route-thinness.mjs` |
| Facade / CQS | `check-facade-delegation.mjs` |
| Zod-first contracts | `check-contract-strictness.mjs`, `check-type-duplicates.mjs`, `check-json-column-zod.mjs`, `check-json-parse-guarded.mjs` |
| Data access (frontend) | `check-frontend-fetch.mjs`, `check-legacy-app-api-hooks.mjs` |
| Feature / package boundaries | `check-feature-boundaries.mjs`, `check-package-boundaries.mjs`, `check-frontend-structure.mjs`, `check-no-duplicate-shared-paths.mjs` |
| Tier / feature gating | `check-tier-comparisons.mjs`, `check-workspace-profile-gating.mjs`, `check-tier-ladder-drift.mjs` |
| RBAC | `check-controller-rbac.mjs` |
| Tenant / RLS | `check-auth-tenant-safety.mjs`, `check-rls-rollout-readiness.mjs`, `check-rls-bypass-annotation.mjs` |
| Audit / PHI | `check-audit-logging.mjs`, `check-audit-coverage.mjs`, `check-phi-read-audit.mjs`, `check-phi-encryption-coverage.mjs`, `check-phi-boundary-parity.mjs`, `check-sensitive-logging.mjs` |
| Webhooks | `check-webhook-signatures.mjs`, `check-webhook-replay-protection.mjs` |
| Idempotency | `check-job-idempotency.mjs` |
| Errors | `check-user-facing-errors.mjs`, `check-empty-catches.mjs` |
| Migrations | `check-migration-prefix-collision.mjs`, `check-migration-reversibility.mjs`, `check-multi-write-transaction.mjs` |
| Externals | `check-external-sdk-in-application.mjs`, `check-external-http-timeouts.mjs`, `check-razorpay-adapters.mjs` |
| Sentry / monitoring | `check-sentry-scrubbing.mjs`, `check-no-console-runtime.mjs` |
| Typing discipline | `check-as-cast-density.mjs`, `check-non-null-assertion.mjs`, `check-deep-optional-chain.mjs` |
| Dates | `check-new-date-in-domain-infrastructure.mjs` (must use `IClock`) |
| Cache | `check-ad-hoc-service-cache.mjs`, `check-cache-redis-required.mjs` |
| Workers | `check-worker-size.mjs`, `check-detached-promises.mjs`, `check-cron-schedules.mjs`, `check-promise-all-in-schedulers.mjs` |
| Hygiene | `check-hygiene` (= `scripts/workflow/check-repo-hygiene.mjs`), `check-filename-case.mjs`, `check-process-env.mjs`, `check-native-button-types.mjs` |
| Pipelines | `check-pdf-pipeline.mjs`, `check-upload-validation.mjs`, `check-deployment-contracts.mjs`, `check-browser-telemetry-same-origin.mjs`, `check-suspense-error-boundary-pair.mjs` |
| Size / structure (advisory) | `check-file-size-budget.mjs`, `check-module-scope-config.mjs`, `check-repo-on-module-init-cache.mjs` |
| Tests | `check-domain-rules-tests.mjs`, `check-feature-test-density.mjs` |

### 11.1 Extended catalogue (all `scripts/checks/` scripts)

§11 above is the **principle map** (what reviewers care about). The table below is the **file map** — every `check-*.mjs` plus `check-prisma-boundary.js`. Authoritative grouping also lives in [`scripts/checks/README.md`](../../scripts/checks/README.md). Wire new scripts into [`detect-workflow-scope.mjs`](../../scripts/workflow/detect-workflow-scope.mjs) and root `package.json`.

| Group | Scripts |
| --- | --- |
| Layering / DDD | `check-prisma-boundary.js`, `check-api-domain-layout.mjs`, `check-cross-domain-application-imports.mjs`, `check-cross-domain-infrastructure-imports.mjs`, `check-backend-structure.mjs`, `check-frontend-structure.mjs`, `check-feature-boundaries.mjs`, `check-package-boundaries.mjs`, `check-module-scope-config.mjs`, `check-external-sdk-in-application.mjs` |
| Repository / CQS / facade | `check-controller-cqs.mjs`, `check-route-thinness.mjs`, `check-facade-delegation.mjs`, `check-repo-on-module-init-cache.mjs`, `check-use-case-loc.mjs`, `check-repository-di-tokens.mjs` |
| Auth / tenant / RBAC / RLS | `check-controller-rbac.mjs`, `check-auth-tenant-safety.mjs`, `check-rls-rollout-readiness.mjs`, `check-rls-bypass-annotation.mjs`, `check-workspace-profile-gating.mjs`, `check-tier-comparisons.mjs`, `check-require-feature-guard.mjs` |
| Contracts / Zod | `check-contract-strictness.mjs`, `check-type-duplicates.mjs`, `check-json-column-zod.mjs`, `check-json-parse-guarded.mjs`, `check-form-schema-extends.mjs` |
| PHI / audit | `check-phi-encryption-coverage.mjs`, `check-phi-boundary-parity.mjs`, `check-phi-read-audit.mjs`, `check-audit-logging.mjs`, `check-audit-coverage.mjs`, `check-sensitive-logging.mjs`, `check-user-facing-errors.mjs` |
| Frontend / UI / data-access | `check-frontend-fetch.mjs`, `check-legacy-app-api-hooks.mjs`, `check-patient-name-ssot.mjs`, `check-suspense-error-boundary-pair.mjs`, `check-no-duplicate-shared-paths.mjs`, `check-native-button-types.mjs`, `check-filename-case.mjs`, `check-query-key-factory.mjs`, `check-client-storage-usage.mjs`, `check-globals-css-imports.mjs` |
| Web / external IO | `check-external-http-timeouts.mjs`, `check-webhook-signatures.mjs`, `check-webhook-replay-protection.mjs`, `check-upload-validation.mjs`, `check-razorpay-adapters.mjs` |
| Cache / queue / jobs | `check-ad-hoc-service-cache.mjs`, `check-cache-redis-required.mjs`, `check-job-idempotency.mjs`, `check-cron-schedules.mjs`, `check-promise-all-in-schedulers.mjs`, `check-detached-promises.mjs`, `check-multi-write-transaction.mjs`, `check-cron-heartbeat-coverage.mjs`, `check-event-emit-via-outbox.mjs`, `check-worker-size.mjs` |
| Hygiene / typing | `check-empty-catches.mjs`, `check-as-cast-density.mjs`, `check-non-null-assertion.mjs`, `check-deep-optional-chain.mjs`, `check-new-date-in-domain-infrastructure.mjs`, `check-no-console-runtime.mjs`, `check-process-env.mjs`, `check-application-event-constants.mjs`, `check-env-vs-globalenv.mjs` |
| PDF / pipeline | `check-pdf-pipeline.mjs`, `check-pdf-bearer-cap.mjs` |
| Migrations | `check-migration-prefix-collision.mjs`, `check-migration-reversibility.mjs` |
| Performance / structure | `check-n-plus-1.mjs`, `check-file-size-budget.mjs`, `check-circular-deps.mjs` (also `pnpm check:circular`) |
| Deploy / nav / E2E | `check-deployment-contracts.mjs` |
| Sentry / telemetry | `check-sentry-scrubbing.mjs`, `check-sentry-scrubber-parity.mjs`, `check-browser-telemetry-same-origin.mjs` |
| Tests | `check-domain-rules-tests.mjs`, `check-feature-test-density.mjs` |

**Perf scripts** (not under `checks/`): [`scripts/perf/check-route-budgets.mjs`](../../scripts/perf/check-route-budgets.mjs), `check-perf-budget.mjs`, `check-a11y-budget.mjs` — see §10.1.

**Workflow scripts**: `scripts/workflow/check-repo-hygiene.mjs` (`pnpm check:hygiene`), `verify-package-contracts.mjs`, `verify-turborepo-structure.mjs`, `detect-workflow-scope.mjs`.

**Bundle**: `pnpm verify:standard` runs the production guardrail set. Run before push when touching architecture, auth, data access, or large feature surfaces.

---

## 12. Open posture observations and roadmap

These are not bugs — they're tracked technical debt items worth knowing about when designing new work.

1. ~~**Access token in `localStorage`**~~ — **resolved** (§7.7). Frontend now rides httpOnly cookies; Bearer header removed from same-origin clients.
2. **RLS rollout proof incomplete** (§4.7). Application-layer scoping is comprehensive; checked-in Fly configs request RLS, but live `docita_app` role use and staging soak still need operational evidence.
3. **Exclusion constraint scope** is `(clinicId, doctorId)` (§9.2). The stricter `(doctorId)` scope (doctor can be in one place period) requires auditing existing data first.
4. **Legacy refresh tokens** (§7.1) still exist in the unhashed `token` column. New writes are hashed; legacy rows cycle out at refresh/revocation/expiry. After 30 days post-2026-05-24 the fallback lookup can be removed.
5. **PDF download endpoint authentication**: the signed URL is the capability. Today there is no additional binding to the requesting user — anyone with the URL within the TTL can fetch the PDF. For higher-sensitivity documents, consider issuing single-use signed URLs or signing the URL request with the user's session.
6. **Same-origin telemetry** must be preserved when routes move; the AGENTS.md rule is enforced manually for now (no `check-cross-origin-telemetry` script). If browser POSTs to `api.docita.work` regress, console noise and CORS failures return.

---

## 13. Pointers for new contributors

- New feature: start with the Zod schema in `packages/types`, then API DTO + domain, then `packages/data-access` hook, then `apps/app/src/features/<feature>/`. See AGENTS.md §9.1.
- New DB column: schema first, migration, then update mappers and Zod schemas. Run `pnpm db:generate`. See AGENTS.md §9.2.
- New write race? Use the pattern in §9.
- New external provider? Strategy/adapter pattern (§3.5). Don't import the SDK outside `infrastructure/adapters/<provider>/`.
- New webhook? Signature → replay-dedupe → idempotent application (§5.5).
- New PDF? Use the template-method base (§3.8). Store `objectKey`, not URL. Serve via `generateSignedUrl` (§8.4).
- New page? `AppPageScaffold → PageHeader → DataState → Content`. Read [`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) before writing UI.

---

## 14. Worker and background job system

### 14.1 Queue substrate

The job queue is **Postgres-backed**, not Redis. The implementation lives in [`apps/api/src/shared/modules/queue/`](../../apps/api/src/shared/modules/queue/):

- `postgres-queue.service.ts` — production queue using `SELECT … FOR UPDATE SKIP LOCKED` for safe concurrent consumers.
- `in-memory-queue.service.ts` — test/dev fallback bound by `QUEUE_DRIVER`.
- `queue.interface.ts` — port the rest of the code depends on (DIP).
- `dlq.controller.ts` — dead-letter-queue inspection endpoints (internal only).
- `worker-metrics.service.ts` — depth, success/failure, age metrics published to the observability module.
- `pdf-job.service.ts` + `pdf-processor-registration.ts` — type-safe job enqueue + handler registration for PDF generation.

Choosing Postgres over Redis avoids a second stateful dependency and makes queue state inspectable alongside application state. Do not infer atomic business-write enqueue from the substrate alone: the current `IQueueProvider.enqueue` contract does not accept a transaction client (§14.4).

### 14.2 Worker entrypoint and module graph

[`apps/worker/src/main.ts`](../../apps/worker/src/main.ts) is intentionally thin: it creates an application context from [`WorkerModule`](../../apps/api/src/worker.module.ts) (defined next to the API, not under `apps/worker/src/`). There is **no HTTP listener** — only schedulers, queue consumers, and PDF processors.

`WorkerModule` composes domain-specific worker modules:

| Module | Role |
| --- | --- |
| `DocumentsWorkerModule` | PDF generation consumers |
| `BillingWorkerModule` / `PrescriptionsWorkerModule` | Invoice/prescription PDF pipelines |
| `SubscriptionsWorkerModule` / `EnterpriseContractsWorkerModule` | Billing-side async work |
| `ClinicalSchedulerModule` / `RemindersSchedulerModule` | Appointment reminders, coding jobs |
| `ComplianceSchedulerModule` | Retention/archival crons |
| `EphemeralStoreSchedulerModule` | TTL cleanup for ephemeral rows |
| `MonitoringSchedulerModule` / `AdminAlertsSchedulerModule` | Ops alerts |
| `WhatsappReconciliationWorkerModule` | Provider state reconciliation |
| `DoctorsVerificationWorkerModule` | Credential verification backlog |
| `OutboxModule` | Outbox relay scheduler (§60) |

`ENABLE_SCHEDULERS=false` disables `ScheduleModule` for local runs that only need queue consumers.

**Cron vs queue:** Time-based work uses `@Cron` in `apps/api/src/shared/schedule/` and domain `*.scheduler.ts` files. Ad-hoc/async work uses the Postgres queue (§14.1). Both can run in the worker process; API pods may also run crons when `ENABLE_SCHEDULERS` is on — confirm deploy config in `fly.toml` / worker `fly.toml` so heavy crons are not duplicated across every API replica without leader election (outbox relay uses in-process `running` guard + `SKIP LOCKED` until advisory locks land).

### 14.3 Idempotency at the job layer

`scripts/checks/check-job-idempotency.mjs` flags handlers that mutate state without an idempotency key. Pair every external-effect job (email, SMS, PDF upload) with:

1. A natural idempotency key (e.g., `${appointmentId}:reminder:${windowStart}`).
2. A unique constraint on the side-effect ledger row.
3. Catch unique-violation as "already done" — never as a hard error.

### 14.4 Job enqueue and transaction boundaries

The current queue port does **not** accept a Prisma transaction client. A producer that writes business state and then calls `queue.enqueue` has a crash window between the two writes. Use the transactional outbox (§60) when durable handoff must be atomic with an aggregate mutation. Queue-specific producers such as PDF jobs still need their own unique keys and idempotent retry behavior (§14.3).

### 14.5 Scheduled jobs

Cron-style schedulers live under `apps/api/src/shared/schedule/`. `scripts/checks/check-cron-schedules.mjs` validates expressions; `check-promise-all-in-schedulers.mjs` blocks unbounded fan-out in cron handlers (a foot-gun that has caused database connection exhaustion historically).

---

## 15. Subscriptions, billing, and tier gating

### 15.1 Domain split

Three domains cooperate:

| Domain | Responsibility |
| --- | --- |
| `apps/api/src/domains/subscriptions` | Plan catalog, tier ladder, subscription lifecycle, dunning state |
| `apps/api/src/domains/payments` | Payment intents, transactions, refunds |
| `apps/api/src/domains/billing` | Invoices, receipts, GST/tax computation, ledger |

### 15.2 Razorpay adapter

The provider lives behind a strategy/adapter pair to keep the SDK out of `application/`. `scripts/checks/check-razorpay-adapters.mjs` enforces that `razorpay` package imports only happen inside `infrastructure/adapters/razorpay/`.

### 15.3 Tier model

- Tier ladder is `Tier.{ FRONT_DESK | CORE | INTELLIGENCE | … }` defined in `packages/types`.
- **Comparisons are banned.** `tier >= Tier.INTELLIGENCE` is a code smell (the ladder is not always monotonic for features). Use `hasFeatureAccess(Feature.X, tier)`.
- `check-tier-comparisons.mjs` blocks direct comparisons; `check-tier-ladder-drift.mjs` blocks ladder mutations without a coordinated migration.

### 15.4 Webhooks

Razorpay webhooks land in `apps/api/src/domains/webhooks/`. Pipeline: signature verify → replay dedupe via idempotency store → translate into a domain event → emit on EventEmitter2. Two checks enforce this contract: `check-webhook-signatures.mjs` and `check-webhook-replay-protection.mjs`.

### 15.5 Subscription status guard

`SubscriptionStatusGuard` (see app.module.ts guard chain in §2.2) blocks expired/suspended workspaces from most routes. Allow-listed routes (billing, settings, logout) are decorated with `@AllowExpiredSubscription`.

---

## 16. Notifications and messaging

### 16.1 Channels

[`apps/api/src/shared/modules/messaging/`](../../apps/api/src/shared/modules/messaging/) defines a channel-port + adapters pattern:

- `channels/` — `EmailChannel`, `WhatsAppChannel`, `SmsChannel` adapters.
- `templates/` — typed template registry (subject, body, params Zod schema).
- `notification-orchestrator.service.ts` — picks channel by recipient preference and tier, falls through on failure.
- `admin-alerts/` — internal-only critical alerts (cron failures, queue depth, PHI access anomalies).

### 16.2 WhatsApp pipeline

Three layers — do not conflate them:

| Layer | Location | Role |
| --- | --- | --- |
| Domain | [`apps/api/src/domains/whatsapp/`](../../apps/api/src/domains/whatsapp/) | Clinic outbound messages, templates, event listeners (`whatsapp-event.listener.ts`, `staff-notification.listener.ts`) |
| Broadcast | [`shared/modules/whatsapp-broadcast/`](../../apps/api/src/shared/modules/whatsapp-broadcast/) | Marketing/broadcast templates, approval state, per-tenant quotas |
| Support inbox | [`shared/modules/support-whatsapp/`](../../apps/api/src/shared/modules/support-whatsapp/) | Inbound help bot for clinicians (shared copy constants in `support-whatsapp-shared.ts`) |

Channel adapter: [`messaging/channels/whatsapp.channel.ts`](../../apps/api/src/shared/modules/messaging/channels/whatsapp.channel.ts). Tier/mode may block WhatsApp via `MODE_BLOCKED_FEATURES` (CORE mode) — independent of template approval.

### 16.3 Real-time updates

[`apps/api/src/shared/services/websocket-emission.service.ts`](../../apps/api/src/shared/services/websocket-emission.service.ts) emits domain events to scoped rooms (clinic + role). The browser subscribes via React Query cache invalidation listeners — no direct UI state writes from the socket layer, to keep React Query as the single source of truth.

---

## 17. Observability

### 17.1 Logging

Pino is the structured logger ([`apps/api/src/shared/modules/observability/pino-options.factory.ts`](../../apps/api/src/shared/modules/observability/pino-options.factory.ts)). Its serializers reduce request shape and scrub structured payloads; automatic HTTP logging is disabled. Add request/tenant/user metadata deliberately where the log site has that context. NestJS `Logger` and `@/lib/logger` are the allowed call sites; `console.*` is banned at runtime by `check-no-console-runtime.mjs`.

### 17.2 PHI redaction

[`phi-redactor.ts`](../../apps/api/src/shared/modules/observability/phi-redactor.ts) recursively scrubs known PHI keys (email, phone, dob, name, address, mrn, notes, transcript) from log payloads before serialization. `phi-leak-guard.spec.ts` is the regression suite.

### 17.3 Sentry

Server and client both ship to Sentry with PHI scrubbing rules in their runtime configs. `check-sentry-scrubbing.mjs` and `check-sentry-scrubber-parity.mjs` enforce that the scrubber stays wired. API telemetry such as web vitals remains same-origin through the app proxy; Sentry SDK ingestion is a separate integration and must retain its own PHI scrubber.

### 17.4 Metrics

The monitoring module persists API request, error, system, queue-health, and web-vitals records; the worker also records queue-job metrics. Frontend RUM flows through the same `/api/v1/*` middleware proxy. `ObservabilityService` emits selected Sentry distributions and keeps a bounded in-process metrics buffer. External aggregation and dashboards are operations concerns; the repository does not prove a Grafana deployment.

### 17.5 Audit

PHI-touching reads call explicit helpers such as `logPatientPhiRead`, `logClinicPhiListRead`, and `logPatientPortalPhiRead`. [`check-phi-read-audit.mjs`](../../scripts/checks/check-phi-read-audit.mjs) scans GET controllers for those markers. Sensitive writes are classified after successful HTTP completion by [`PatientDataAuditInterceptor`](../../apps/api/src/shared/common/interceptors/patient-audit.interceptor.ts). [`check-audit-coverage.mjs`](../../scripts/checks/check-audit-coverage.mjs) protects the audit ledger's tracked-file coverage.

---

## 18. Feature flags and configuration

### 18.1 Feature flags

[`apps/api/src/shared/modules/feature-flags/`](../../apps/api/src/shared/modules/feature-flags/) provides scope-aware flags: global, per-tenant, per-user. [`feature-flags.service.ts`](../../apps/api/src/shared/modules/feature-flags/feature-flags.service.ts) supports boolean toggles and percentage rollouts (deterministic hash on user/clinic id).

Flags are resolved on demand by `FeatureFlagsService`, cached briefly through `CACHE_MANAGER`, and exposed to the clinician app through `/api/v1/feature-flags/me`.

**Distinction from tier gating:** `Feature` enum + `FEATURE_TIER_MAP` control **product packaging** (what a paying clinic may use). Feature **flags** control **gradual rollout** and kill switches (experiments, internal tools). A flag must not override `MODE_BLOCKED_FEATURES` or subscription lockout — mode and subscription guards run first (AGENTS.md §15.8).

Frontend flags use the `useResolvedFeatureFlags()` data-access hook. Internal app has separate operator surfaces for flag management (§22).

### 18.2 Configuration

[`apps/api/src/shared/modules/config/`](../../apps/api/src/shared/modules/config/) wraps `@nestjs/config` with Zod validation at boot. Missing or malformed env vars fail fast on startup — never at first use. `scripts/checks/check-process-env.mjs` prevents stray `process.env.X` reads outside the config module.

### 18.3 Module-scope side effects

`check-module-scope-config.mjs` and `check-repo-on-module-init-cache.mjs` block reading config or instantiating caches at module load time — both interact badly with NestJS DI and test isolation.

---

## 19. Search

[`apps/api/src/shared/modules/search/`](../../apps/api/src/shared/modules/search/) is a Strategy-based abstraction:

- `search-strategy.registry.ts` — registry keyed by `(entityType, mode)`.
- `strategies/` — entity-specific implementations (patients, appointments, documents, …).
- `search-full-text-support.service.ts` — Postgres FTS (`tsvector` + `tsquery`) with tenant scoping baked into every query.

The service guarantees: tenant filter is always present, results are paginated, and ranking weights are colocated with the strategy (not the controller).

---

## 20. AI / OCR pipeline

### 20.1 `ai-core` — REMOVED 2026-08-08

The former `apps/api/src/shared/modules/ai-core/` module (provider factory + shared AI schemas) was **deleted**; its only consumer (`summarizeMedicalHistory` in `medical-history.service.ts`) was removed with it. The SDK-at-the-edge constraint it existed to enforce survives via `check-external-sdk-in-application.mjs` (§20.2), and the live LLM integration lives solely in `shared/modules/ai/`. Do not reintroduce a second AI module.

### 20.2 `ai` (orchestration)

[`apps/api/src/shared/modules/ai/`](../../apps/api/src/shared/modules/ai/) handles clinical AI suggestions and document OCR:

- [`openai.service.ts`](../../apps/api/src/shared/modules/ai/openai.service.ts) — LLM adapter; timeouts, retries, PII redaction before provider calls.
- `ocr-extraction.service.ts` + `ocr-basic-parser.ts` + `ocr-field-normalizer.ts` — raw OCR text → typed clinical fields.
- `clinical-ai-prompts.ts` — versioned prompts; outputs validated via `clinical-ai-enum-parse.ts` and Zod so freeform LLM text cannot land in typed slots.

`check-external-sdk-in-application.mjs` keeps the OpenAI SDK out of `application/` and `core/`.

### 20.3 OCR assets

Bulk document OCR in imports uses [`text-extractor.service.ts`](../../apps/api/src/shared/modules/imports/text-extractor.service.ts). Production API images download Tesseract English data during the Docker build and set `TESSDATA_PREFIX`; a local ignored `eng.traineddata` file may exist for development (§48.5).

### 20.4 Product constraints

- AI suggestions are not medical advice — UI footer contract in [`UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) §4.
- Cross-border processor review required before new LLM/OCR vendors (§29.4).

---

## 21. Deployment topology and CI/CD

### 21.1 Targets

| App | Build | Host |
| --- | --- | --- |
| `apps/api` | NestJS bundle | Fly.io (`fly.toml`, primary region + replicas) |
| `apps/worker` | NestJS bundle | Fly.io (`apps/worker/fly.toml`) |
| `apps/app` | Vite SPA (static build) | Cloudflare (static assets + Hono proxy Worker; `wrangler.toml`) |
| `apps/internal` | Vite SPA (static build) | Cloudflare (static assets + Hono proxy Worker; `wrangler.toml` / `wrangler.staging.toml`) |
| `apps/landing` | Astro | Cloudflare Workers |

### 21.2 Cloudflare build quirks

[`scripts/deploy/`](../../scripts/deploy/) contains Cloudflare/Astro patch guards, Cloudflare credential checks, application security-header verifiers, DB schema-sync verification, and the API startup smoke. Edge changes that stream or set unusual headers should extend these verifiers.

### 21.3 CI scope detection

[`scripts/workflow/detect-workflow-scope.mjs`](../../scripts/workflow/detect-workflow-scope.mjs) maps changed paths → required check sets. Touching `packages/db/**` triggers the full migration + boundary suite; touching `apps/landing/**` triggers only the landing build. Adding a new repo-wide invariant requires registering it here, otherwise it's only enforced locally.

### 21.4 Branch and release model

`main` is the canonical production branch. Feature branches PR into `main`; path-filtered pushes to `main` deploy the affected Fly and Cloudflare targets. [`sync-staging-after-promotion.yml`](../../.github/workflows/sync-staging-after-promotion.yml) automatically updates the `staging` ref to the exact `main` commit after promotion, matching the mirror contract in AGENTS.md.

### 21.5 Migrations in CI

`check-migration-reversibility.mjs` and `check-migration-prefix-collision.mjs` gate every Prisma migration. The current posture (DB schema locked, additive-only — see memory) is enforced by review, not by a script; if a destructive migration is needed, it should be split into expand → backfill → contract steps and each step shipped as a separate PR.

---

## 22. Internal admin app

[`apps/internal/`](../../apps/internal/) mirrors the structure of `apps/app/` but with a thinner `shared/lib` (no subscription/access-control trees) and a narrower feature set: tenant CRUD, support tools, audit log search, queue/DLQ inspection, feature-flag toggles.

### 22.1 Layout parity with `apps/app`

| Area | `apps/app` | `apps/internal` |
| --- | --- | --- |
| Routes | `src/App.tsx` route tree (`ProtectedLayout`) | Same React Router conventions |
| Features | `features/<feature>/` | Smaller feature set (ops/support) |
| Data access | `packages/data-access` + `DataAccessProvider` | `packages/data-access/internal` hooks |
| Proxy | Hono proxy Worker (`api/index.ts`) `/api/v1/*` branch | Same-origin proxy pattern |
| Sentry | Runtime-specific configs | PHI scrubber parity enforced (§56 item 45) |

### 22.2 Auth and network

Authentication uses a separate JWT audience (`StaffJwtAudienceGuard` in the guard chain, §2.2). Internal staff cannot authenticate to `apps/app`, and clinic users cannot authenticate to `apps/internal`. The split is enforced both at token issuance and at every request.

Network exposure is restricted via Cloudflare Access policy (IP allowlist + SSO) — independent from the JWT layer (defense in depth).

### 22.3 When to put code in internal vs app

- **Operator-only** surfaces (DLQ replay UI, global feature flags, cross-tenant search) → `apps/internal/src/features/`.
- **Clinic-scoped** product UX → `apps/app/src/features/`.
- Shared DTOs/types → `packages/types/src/admin/` and `packages/data-access/src/internal/hooks/`.

---

## 23. Landing site (Astro)

[`apps/landing/`](../../apps/landing/) is a **static-first** marketing surface with a small **edge BFF** for API proxying — not a second clinician app.

### 23.1 Static pages and islands

- Marketing routes are Astro components with minimal React islands only where interactivity is required (booking widgets, payment token pages).
- No shared JS bundle with `apps/app` — deploy and cache policies stay independent (§21.1).

### 23.2 Edge API proxy (BFF)

[`apps/landing/src/pages/api/[...path].ts`](../../apps/landing/src/pages/api/%5B...path%5D.ts) forwards `/api/*` to the upstream API through an Astro `APIRoute`. It currently carries a small local implementation rather than importing the shared `upstream-api-proxy.ts` helper:

- Strips **hop-by-hop** headers (`connection`, `transfer-encoding`, …) before forwarding.
- Appends `/api/<path>` to `API_PROXY_TARGET`.
- Streams the upstream response and removes transport/CORS response headers.

This is conceptually the same edge-BFF pattern as §45, but the public landing surface has different auth and cookie requirements. [`landing-api-proxy.test.ts`](../../apps/landing/src/lib/landing-api-proxy.test.ts) locks down URL/query handling, traversal rejection, request forwarding, and response-header filtering before any future consolidation (§65.5).

### 23.3 Public flows

- **Contact / leads**: POST to `public/*` routes on the API (captcha-gated).
- **Public booking**: [`public-api.ts`](../../apps/landing/src/lib/public-api.ts) — typed client, no session cookies.
- **Payment links**: [`pages/pay/[token].astro`](../../apps/landing/src/pages/pay/[token].astro) — tokenized checkout surface.

### 23.4 Testing

[`apps/landing/e2e/booking-redirect.spec.ts`](../../apps/landing/e2e/booking-redirect.spec.ts) guards booking redirect behavior (§56 item 55).

### 23.5 Constraints

- No Prisma, no `@workspace/data-access`, no clinician auth cookies on marketing origins.
- Prefer native `<a href>` for static routes; hydrate islands only when needed (AGENTS.md §4).

---

## 24. Testing strategy

### 24.1 Test layers

| Layer | Tooling | Scope |
| --- | --- | --- |
| Unit | Vitest | Pure rules, mappers, value objects, services with mocked ports |
| Integration | Vitest + ephemeral Postgres | Repository + use case against a real schema |
| Domain rules | `check-domain-rules-tests.mjs` | Mandatory tests for every rule in `core/domain-services/` |
| Feature density | `check-feature-test-density.mjs` | Floor on tests-per-feature |
| E2E (web) | Playwright | `apps/app/e2e/`, `apps/internal/e2e/` |
| E2E nav | `check-e2e-nav-routes.mjs` | Every route in the nav is exercised |
| Visual / a11y | `pnpm audit:app` | Playwright-driven axe accessibility audit |

### 24.2 Fixture and factory pattern

Prefer `make<Entity>` factories for repeated aggregate fixtures: valid defaults plus partial overrides keep setup small and resilient to schema growth. The repository uses this pattern in several focused suites; it is a convention to expand, not a universal fixture layer.

### 24.3 What's intentionally not tested

- The full Razorpay payment flow runs against the sandbox in a manual smoke test, not in CI (the sandbox is too rate-limited for parallel CI runs).
- Email rendering is asserted via snapshot of the rendered HTML body; actual delivery is not exercised in CI.

---

## 25. Developer experience

### 25.1 Turborepo + pnpm

`pnpm` is the only supported package manager. The root `packageManager` field pins `pnpm@10.30.3`, `engines.node` requires Node ≥22.12.0, and AGENTS.md makes pnpm-only usage mandatory. There is currently no `preinstall` enforcement hook. Turborepo's task graph parallelizes `build`, `lint`, `test`, and `check-types`; the cache key includes `tsconfig.json` and `pnpm-lock.yaml`.

### 25.2 Scripts taxonomy

| Folder | Purpose |
| --- | --- |
| `scripts/checks/` | Repo invariants (the full list lives in §11) |
| `scripts/workflow/` | CI orchestration, scope detection, repo hygiene |
| `scripts/perf/` | Performance budgets and baselines |
| `scripts/ui/` | Color contrast, UI copy, design-token verification |
| `scripts/db/` | DB seed, snapshot, sanity-checks |
| `scripts/deploy/` | Cloudflare/Astro patch guards, smoke tests, header verifiers |
| `scripts/lib/` | Shared helpers for other scripts |

### 25.3 Verify bundles

- `pnpm verify:standard` — production guardrail (run before push for non-trivial work).
- `pnpm check:hygiene` — quick drift checks (filenames, orphans, dead exports).
- `pnpm knip` — unused exports / files. **Known false positive: CSS `@import` is invisible to Knip — grep `globals.css` before deleting fonts/styles it flags.**

### 25.4 Editor and type performance

TypeScript configuration is split per package, with package-specific incremental metadata where configured. `.tsbuildinfo` files are gitignored. Measure editor and CI performance before adding project references or cache complexity; the repository does not carry a checked-in latency baseline.

---

## 26. Accessibility and internationalization

### 26.1 Accessibility

- `@workspace/ui` primitives are built on Radix UI — focus management, ARIA attributes, and keyboard navigation are inherited.
- `scripts/ui/check-contrast.mjs` blocks color choices below WCAG AA contrast.
- `pnpm audit:app` runs axe-core against the rendered app in CI.
- `check-native-button-types.mjs` blocks `<button>` without an explicit `type=` (the implicit `type=submit` foot-gun has bitten forms repeatedly).

### 26.2 Internationalization

The app is currently single-locale (English, India clinical terminology). Strings live as colocated constants, not in a translation catalog. There is no `i18next` or `next-intl` integration. **This is debt** — see §28.

---

## 27. Compliance and data lifecycle

### 27.1 PHI surface

PHI handling spans explicit boundaries: the observability redactor, patient encryption field boundary, Sentry scrubbers, audit interceptor, and compliance services. [`check-phi-boundary-parity.mjs`](../../scripts/checks/check-phi-boundary-parity.mjs) mechanically checks encrypted patient fields against server/shared redactors, and `check-sentry-scrubber-parity.mjs` protects early-boot scrubber copies. Audit classification and newly introduced PHI still require review (§65.2).

### 27.2 Encryption at rest

Selected patient PII fields are encrypted with versioned authenticated field encryption via [`apps/api/src/shared/common/encryption.service.ts`](../../apps/api/src/shared/common/encryption.service.ts), using the field list in [`encryption-patient-fields.boundary.ts`](../../apps/api/src/shared/common/encryption-patient-fields.boundary.ts). This is AES-GCM with key-version support, not per-row envelope encryption. [`check-phi-encryption-coverage.mjs`](../../scripts/checks/check-phi-encryption-coverage.mjs) checks boundary/encrypt/decrypt/result-extension parity; schema-to-PHI classification still requires review.

### 27.3 Data export and deletion

Compliance services expose structured patient export and anonymization paths. Retention cleanup anonymizes soft-deleted patients after the grace window; direct erasure requests first reject unresolved obligations, then anonymize.

### 27.4 Backups and DR

Production migration automation currently integrates with AWS RDS snapshots before apply ([`deploy.yml`](../../.github/workflows/deploy.yml)). See [`docs/operations/DR_RUNBOOK.md`](../operations/DR_RUNBOOK.md) for the documented recovery process.

### 27.5 Audit retention

Audit logs, WhatsApp logs, and completed/cancelled appointments have scheduled database-table archival. A regulator-facing export job and per-tenant retention-policy editor remain pending (§29.3, §65).

---

## 28. Areas for improvement

This section is the long-form companion to §12. It splits into "posture" (security/compliance debt), "architecture" (debt that slows feature work), and "operability" (debt that hurts when something breaks).

### 28.1 Security and compliance posture

1. ~~**Access token in `localStorage`**~~ — **resolved** (§7.7). The migration has shipped: the in-memory token is the only client-side store, the `Authorization: Bearer` send path is removed for same-origin callers, and a regression test asserts no Authorization header is attached by `fetchWithSession`.
2. ~~**RLS rollout incomplete**~~ — **code-scaffolded** (§4.7). `check-rls-rollout-readiness.mjs` is part of `pnpm verify:standard` (blocking). Checked-in Fly configs request RLS, but remaining work is operational proof: provision/use the `docita_app` role, soak in staging, and verify effective enforcement (see [`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md)).
3. **PDF signed URLs are bearer capabilities** — **scaffolded**. Tracked in [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md). Advisory check: `scripts/checks/check-pdf-bearer-cap.mjs`.
4. **Legacy unhashed refresh tokens** — **tracked** in [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md).
5. **MFA is TOTP only** — **tracked** in [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md). WebAuthn rollout pending product decision.
6. ~~**No formal audit-event retention policy**~~ — **scaffolded**. See [`docs/compliance/AUDIT_EXPORT.md`](../compliance/AUDIT_EXPORT.md) for design + open items.
7. ~~**DR runbook absent**~~ — **resolved**. See [`docs/operations/DR_RUNBOOK.md`](../operations/DR_RUNBOOK.md).
8. **Encryption key rotation** — **tracked** in [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md) and [`ADR 0007`](decisions/0007-kek-rotation-cadence.md).
9. **Webhook secret rotation** — **tracked** in [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md).

### 28.2 Architecture and code health

10. ~~**Frontend `localStorage`/`sessionStorage` usage** is unaudited~~ — **resolved**. `scripts/checks/check-client-storage-usage.mjs` enforces an allowlist.
11. **EventEmitter2 is in-process** — **scaffolded**. The durable `OutboxEvent` table, append service, and relay scheduler exist. Razorpay invoice payment capture is migrated to an atomic outbox append; additional durable command fan-out should migrate as those paths are touched. Multi-region readiness still requires a deliberate relay/bus design.
12. ~~**No outbox table** for domain events~~ — **scaffolded**. See [`apps/api/src/shared/modules/outbox/`](../../apps/api/src/shared/modules/outbox/). `scripts/checks/check-event-emit-via-outbox.mjs` flags direct emits in command paths.
13. ~~**`@workspace/data-access` query-key conventions** are not lint-enforced~~ — **resolved**. `scripts/checks/check-query-key-factory.mjs` enforces the `queryKeys` factory.
14. **Feature folders mix client and server boundaries** — **deferred**. Lower priority than the data-access boundary, which is now enforced. Track if the boundary becomes a recurring source of regressions.
15. ~~**No bundle-size budget per route**~~ — **resolved**. See `scripts/perf/route-budgets.config.mjs` + `scripts/perf/check-route-budgets.mjs`.
16. ~~**Knip is run, but `globals.css` `@import` blind spot**~~ — **resolved**. `scripts/checks/check-globals-css-imports.mjs` surfaces the surrogate list for Knip.
17. ~~**Type-only barrel files** in `packages/types`~~ — **resolved**. The package root re-exports per-domain barrels (`ai`, `clinical`, `patient`, `billing`, `operations`, and the remaining contract groups).
18. ~~**Inconsistent use of `IClock`**~~ — **resolved**. `scripts/checks/check-new-date-in-domain-infrastructure.mjs` covers `application/` as well.
19. ~~**Some `any` and `as` casts in adapter layers**~~ — **resolved**. `check-as-cast-density.mjs` is blocking (MAX_CASTS_PER_FILE = 0).
20. **Tier ladder is a single global enum** — **partially addressed** via `FEATURE_TIER_MAP`. Per-feature capability matrix evolution is a follow-up if multiple cross-tier features emerge.
21. **No automated dead-route detector** for API controllers — **deferred**. Lower-priority than UI dead-route coverage already in place.
22. ~~**Optimistic concurrency**~~ — **resolved**. [`withVersion`](../../apps/api/src/shared/common/repositories/with-version.ts) helper is the standard pattern.

### 28.3 Frontend specifically

23. ~~**No design-token contract test**~~ — **resolved**. See [`packages/ui/src/test/design-tokens.contract.test.tsx`](../../packages/ui/src/test/design-tokens.contract.test.tsx).
24. **No internationalization scaffolding** — **plan documented**. See [`docs/UpcomingPlans/I18N_PLAN.md`](../UpcomingPlans/I18N_PLAN.md). Implementation pending product locale decision.
25. ~~**Web Vitals are measured but not budgeted per route**~~ — **resolved**. See `scripts/perf/route-budgets.config.mjs` (`ROUTE_WEB_VITALS`).
26. **React Query cache invalidation** — **convention adopted**. Per-domain invalidation maps land in `packages/data-access` hooks; tracked in [`packages/data-access/CHANGELOG.md`](../../packages/data-access/CHANGELOG.md).
27. **Skeleton coverage uneven** — **convention adopted**. New surfaces use `DataState` (UI standard §3); pre-existing inline skeletons are migrated when their pages are touched.
28. ~~**No visual-regression coverage**~~ — **resolved**. See [`apps/app/e2e/accessibility.spec.ts`](../../apps/app/e2e/accessibility.spec.ts).

### 28.4 Backend specifically

29. ~~**Use cases are sometimes thicker than the rules suggest**~~ — **resolved**. `scripts/checks/check-use-case-loc.mjs` is advisory at 150 lines.
30. ~~**Repository interfaces are not always consumed via DI tokens**~~ — **resolved (advisory)**. `scripts/checks/check-repository-di-tokens.mjs` flags non-token-bound repository providers.
31. ~~**Domain events are fire-and-forget**~~ — **scaffolded** by the outbox seam (item 12). Listener retry via queue is the next concrete step.
32. ~~**Prisma extensions** undocumented~~ — **resolved**. See [`apps/api/src/shared/common/extensions/README.md`](../../apps/api/src/shared/common/extensions/README.md).
33. ~~**Request-budget enforcement**~~ — **resolved**. [`query-budget.extension.ts`](../../apps/api/src/shared/common/extensions/query-budget.extension.ts) is registered in `PrismaService`, reads the request-scoped counter seeded by `RequestContextInterceptor`, and emits structured warnings when a route exceeds the default budget.

### 28.5 Operability

34. ~~**No structured incident playbooks**~~ — **resolved**. Five playbooks in [`docs/operations/playbooks/`](../operations/playbooks/).
35. ~~**DLQ has no auto-replay tooling**~~ — **scaffolded**. [`dlq-replay.scheduler.ts`](../../apps/api/src/shared/modules/queue/dlq-replay.scheduler.ts) (inert; wire after classification rules ratified).
36. ~~**Cron-failure alerts are best-effort**~~ — **resolved** (decorator + check + persistence). Every `@Cron` handler in `apps/api/src/` carries a unique `@TrackHeartbeat('<name>')`; `pnpm check:cron-heartbeat-coverage` is in `verify:standard` and fails on coverage gaps **or** duplicate names. The worker-scoped [`PrismaCronHeartbeatService`](../../apps/api/src/shared/modules/schedule/cron-heartbeat.ts) registers the active recorder and upserts success/failure state into the `CronHeartbeat` model.
37. ~~**Frontend error boundaries** are present per page but the catch + telemetry behavior varies~~ — **resolved**. Single `ErrorBoundary` in `@workspace/ui/components/feedback/`; app wrapper at [`apps/app/src/components/errors/error-boundary.tsx`](../../apps/app/src/components/errors/error-boundary.tsx) wires Sentry.
38. ~~**No synthetic uptime monitoring** documented~~ — **resolved**. See [`docs/operations/SYNTHETIC_MONITORING.md`](../operations/SYNTHETIC_MONITORING.md).
38a. ~~**Fly cold start returns 502**~~ — **mitigated**. `apps/api` uses
    `auto_stop_machines = 'suspend'` with `grace_period = '240s'` so an
    idled VM resumes from a RAM snapshot in ~1s. Root-cause work on the
    multi-minute `NestFactory.create` bootstrap continues; per-phase
    timings now log on every boot (`[bootstrap] <phase> +<delta>ms`).
    See ADR [0011](decisions/0011-fly-suspend-cold-start.md) and `fly.toml`.
    Client-side safety net for host failover, DB outages and deploys: the
    frontend probes `GET /api/health/ready` (502/503/504 or an intermediary
    error page = outage), gates every route behind a server-warming screen
    that retries with backoff, and restores the workspace automatically —
    without dropping a signed-in session. The store, prober, recovery helpers
    and gate factory live in [`@workspace/data-access`](../../packages/data-access/src/lib/api-availability.ts);
    the screen chrome lives in
    [`@workspace/ui`](../../packages/ui/src/components/feedback/server-warming-screen.tsx).
    Both SPAs mount it — the clinician app (i18n copy) and the internal
    console (English literals, gate above `AuthProvider` so bootstrap and
    login are covered) — via thin per-app binding modules
    (`apps/<app>/src/lib/api/api-availability.ts`).

### 28.6 Documentation

39. ~~**`docs/architecture/` overlaps with `AGENTS.md`**~~ — **resolved**. Each architecture doc now opens with a prescriptive/descriptive header.
40. ~~**No ADR log**~~ — **resolved**. See [`docs/architecture/decisions/`](decisions/) — 10 backfilled ADRs + template.
41. ~~**Pattern Catalogue examples are scattered**~~ — **resolved**. AGENTS.md §15 now links each pattern entry to a canonical file:line.

### 28.7 Historical sweep snapshot (2026-05)

The improvements list was swept end-to-end in the 2026-05 audit. The
following table preserves that point-in-time result. It is not the live ledger;
§65 is authoritative for current pending work.

| Status                | Count | Items                                                                                  |
| --------------------- | ----- | -------------------------------------------------------------------------------------- |
| Resolved              | 38    | 1, 6, 7, 10, 13, 15, 16, 18, 19, 22, 23, 25, 28, 29, 30, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 56 |
| Code-scaffolded[^1]   | 10    | 2, 3, 4, 5, 8, 9, 11, 12, 31, 35                                                       |
| Convention adopted    | 2     | 26, 27                                                                                 |
| Deferred (tracked)    | 5     | 14, 17, 20, 21, 24                                                                     |

[^1]: "Code-scaffolded" means the seam, interface, advisory check, or
runbook lands but the full implementation (often a multi-week migration
or product decision) is tracked elsewhere — see
`docs/compliance/AUTH_HARDENING.md`, the outbox `OutboxModule`, and the
DLQ replay scheduler stub for the canonical scaffolds.

### Newly enforced checks (added by the 2026-05 sweep)

The following invariants are now enforced (or advised) by scripts in
`scripts/checks/`:

- `check-pdf-bearer-cap.mjs`
- `check-client-storage-usage.mjs`
- `check-query-key-factory.mjs`
- `check-form-schema-extends.mjs`
- `check-event-emit-via-outbox.mjs`
- `check-use-case-loc.mjs`
- `check-repository-di-tokens.mjs`
- `check-cron-heartbeat-coverage.mjs`
- `check-sentry-scrubber-parity.mjs`
- `check-phi-boundary-parity.mjs`
- `check-browser-telemetry-same-origin.mjs`
- `check-route-meta-coverage.mjs`
- `check-tools-route-gate.mjs`
- `check-env-vs-globalenv.mjs`
- `check-globals-css-imports.mjs`

See `scripts/checks/README.md` for the catalogue and how to extend it.

---

The list above is intentionally long and unfiltered. Not every item is worth doing — many are deliberately deferred. Use this as a starting point for sprint-planning prioritization, not as a defect list.

**2026-06 consolidated register:** §65 merges §28, §56, and [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md) 🚧 items into one planning table.

---

## 29. DPDP compliance and consent management

Docita operates under India's **Digital Personal Data Protection Act (DPDP)** in addition to clinic-side medical-records expectations. This shapes the design more than a generic "PHI" framing would.

### 29.1 Consent surface

[`apps/api/src/shared/modules/compliance/consent-compliance.service.ts`](../../apps/api/src/shared/modules/compliance/consent-compliance.service.ts) is the authority on what consents a patient has granted, when, and for which purpose (`treatment`, `marketing`, `analytics`, `third-party-share`). `consent.controller.ts` exposes the patient-facing surface; `ConsentGuard` in `apps/api/src/shared/modules/auth/guards/consent.guard.ts` blocks routes when the required consent is missing.

The model is **purpose-scoped, not blanket**: granting "treatment" does not grant "marketing." This matches DPDP §6 ("specific, informed, unconditional, unambiguous").

### 29.2 Data Subject Requests (DSRs)

`data-subject-request.service.ts` implements operational request handlers:

- **Access / portability** — return a structured patient export.
- **Correction** — apply reviewed correction input and audit the change.
- **Erasure** — reject pending financial/appointment obligations, otherwise anonymize.
- **Withdrawal** — `ConsentComplianceService.withdrawConsent()` revokes a specific consent.

Each operation writes a purpose-specific action through [`dpdp-audit.emitter.ts`](../../apps/api/src/shared/modules/compliance/dpdp-audit.emitter.ts), which delegates to the general `AuditService`.

### 29.3 Retention and archival

[`archival.service.ts`](../../apps/api/src/shared/modules/compliance/archival.service.ts) and [`data-retention.scheduler.ts`](../../apps/api/src/shared/modules/compliance/data-retention.scheduler.ts) implement scheduled retention:

- Scheduler invokes explicit retention windows for audit logs, WhatsApp logs, and completed/cancelled appointments.
- Rows move in batches into `*Archive` database tables and are deleted from live tables in a transaction.
- Soft-deleted patients older than the grace period are anonymized in batches.

**(This corrects §27.5 above — archival exists; what is missing is a per-tenant retention-policy UI and a regulator-export job.)**

### 29.4 Cross-border data transfer

[`DPDP Act 2023`](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf) §16 allows the Central Government to restrict transfers to notified countries or territories; it is not a blanket localization rule. Keep the product's India-region posture, but review current notifications and any stricter applicable sectoral rule before adding an external processor (LLM, OCR, payment) or changing data residency.

---

## 30. Prisma extensions (the cross-cutting layer)

`apps/api/src/shared/common/extensions/` contains Prisma client extensions for cross-cutting database behavior. [`PrismaService`](../../apps/api/src/prisma/prisma.service.ts) currently wires six: RLS routing, encryption, audit immutability, tenant scoping, query budgets, and slow-query logging. This is one of the most load-bearing pieces of the backend.

### 30.1 `tenant.extension.ts`

For every model that has a tenant-scope rule (`tenant-scope-policy.ts`), the extension:

1. Reads `getCurrentTenant()` from request-scoped AsyncLocalStorage (`middleware/tenant.middleware.ts`).
2. Refuses operations when there is no tenant context unless explicitly bypassed (e.g., onboarding User read).
3. Injects `clinicId` (or the model's equivalent scope key) into every `where`, and validates that creates/updates carry the matching scope.
4. Allows explicit `tenant.bypassed === true` for cross-tenant operations (audit job, internal admin). Calls to `runUnrestricted()` require a nearby `// RLS-BYPASS: <reason>` comment or a narrow check allow annotation; [`check-rls-bypass-annotation.mjs`](../../scripts/checks/check-rls-bypass-annotation.mjs) enforces that review marker.

This is the ORM-level defense preventing a forgotten tenant filter from leaking across clinics. It complements explicit repository scoping and the feature-gated database RLS layer (§4.7).

### 30.2 `encryption.extension.ts`

Encrypts patient writes by delegating to `EncryptionService.encryptPatientData()` and declares explicit result decryptors for the same patient fields. Adding a new encrypted field requires updating the boundary **and** the result extension; [`check-phi-encryption-coverage.mjs`](../../scripts/checks/check-phi-encryption-coverage.mjs) catches parity drift between them. It does not infer whether every newly added schema column is PHI.

### 30.3 `audit-immutability.extension.ts`

Blocks `delete` / `deleteMany` on `AuditLog` and `AuditLogArchive` outside the scheduled archival mode. This protects retention handling at the ORM boundary. Do not describe update blocking or database-trigger coverage unless the matching migration proves it.

### 30.4 `logging.extension.ts`

Measures Prisma operation duration and logs a warning when it exceeds `DATABASE_CONSTANTS.SLOW_QUERY_THRESHOLD_MS`. It is deliberately small: correlation-rich request logging and offline query-plan checks live elsewhere.

### 30.5 `rls-routing.extension.ts`

When `TenantContextInterceptor` opens an RLS-scoped request transaction, [`active-tx.storage.ts`](../../apps/api/src/shared/modules/rls/active-tx.storage.ts) publishes that transaction via ALS. [`rls-routing.extension.ts`](../../apps/api/src/shared/common/extensions/rls-routing.extension.ts) re-routes Prisma operations through the same connection so `SET LOCAL app.current_clinic_id` actually governs the query.

### 30.6 `query-budget.extension.ts`

Counts Prisma operations in request-scoped ALS and emits a structured warning when a request exceeds the default budget. It is an observability backstop for accidental N+1 work, not a request blocker: route-specific optimization still needs query-plan review and realistic load evidence.

### 30.7 Why extensions and not middleware

NestJS interceptors fire on HTTP request boundaries; Prisma extensions fire when callers use the extended `PrismaService`, including background jobs, schedulers, and internal services. This makes extensions the central enforcement point for tenant scoping, selected patient-field encryption, and audit-log delete protection. Preserve the extension chain and its bypass rules; do not claim coverage for raw SQL or a client instantiated outside that chain.

---

## 31. Base repository and shared persistence utilities

### 31.1 `base.repository.ts`

[`apps/api/src/shared/common/repositories/base.repository.ts`](../../apps/api/src/shared/common/repositories/base.repository.ts) is a reusable scaffold for repositories that fit a conventional tenant-scoped CRUD shape. It provides:

- Runtime-guarded access to a Prisma model delegate by model name.
- Tenant-scoped `findAll`, `findOne`, `update`, and `delete` helpers.
- Cursor pagination, optional text search, and global lookup escape hatch for non-PHI reference models.

Specialized repositories remain valid when an aggregate needs richer mapping, constraint translation, or transaction-aware methods. Optimistic concurrency has a separate [`with-version.ts`](../../apps/api/src/shared/common/repositories/with-version.ts) helper; adopt it deliberately where the write shape supports a version predicate.

Direct `prisma.<model>.findX` calls outside repositories are blocked by `check-prisma-boundary.js`.

### 31.2 `query.builder.ts`

[`apps/api/src/shared/common/builders/query.builder.ts`](../../apps/api/src/shared/common/builders/query.builder.ts) provides typed appointment, patient, and invoice query builders. The point is *not* to hide Prisma; it is to keep filter, include/select, ordering, and pagination assembly out of controllers and command services.

### 31.3 Repository-domain boundary

[`repository-domain-item.boundary.ts`](../../apps/api/src/shared/common/repositories/repository-domain-item.boundary.ts) currently centralizes a narrow cast from erased Prisma delegate rows to repository domain output. It is a pragmatic escape hatch, not a full mapper guarantee. Prefer aggregate-specific mappers for clinical entities and tighten this helper if its usage expands (§65.2).

---

## 32. Machine authentication and API keys

[`apps/api/src/shared/modules/auth/auth/api-key.service.ts`](../../apps/api/src/shared/modules/auth/auth/api-key.service.ts) implements per-clinic API keys for integration partners (lab vendors, PMS systems, FHIR consumers).

- Keys are stored as **hashed only** — the plaintext is shown once at creation and never recoverable.
- Admin-authenticated clinic routes create, list, rotate, and revoke keys. Plaintext is returned only at creation or rotation; validation updates `lastUsedAt`. Rotation supports a bounded overlap window so partner credentials can roll without an all-at-once cutover.

> **Note:** route-level `ApiKey` header enforcement (`ApiKeyGuard` / `RequireApiKeyScopes`) was removed as unused dead code (2026-08). When a real partner surface lands, reintroduce a guard wired to `ApiKeyService.validateApiKey` + scoped enforcement deliberately.

---

## 33. FHIR interop

[`apps/api/src/shared/modules/fhir/`](../../apps/api/src/shared/modules/fhir/) exposes a clinician-authenticated, read/export-oriented FHIR R4 projection surface:

- Resources: `Patient`, `Appointment`, `Observation`, `MedicationRequest`, `Condition`, `AllergyIntolerance`, and `Immunization`, plus patient bundles, CCD export, and a capability statement.
- All responses are projections from domain entities — FHIR is **not** the storage shape. The mappers live in `fhir/factories/`.
- [`fhir.controller.ts`](../../apps/api/src/shared/modules/fhir/fhir.controller.ts) currently exposes GET routes only and requires clinic-scoped clinician roles. Do not describe partner writes or API-key access until those routes and guard contracts exist.

---

## 34. Bulk imports pipeline

[`apps/api/src/shared/modules/imports/`](../../apps/api/src/shared/modules/imports/) is one of the most pattern-rich subsystems in the codebase. It ingests messy real-world data (Excel sheets from PMS exports, scanned PDFs from old paper records, photos of registers) and turns it into typed clinical records.

### 34.1 Pipeline stages

```
upload → classify → extract → normalize → score → preview → commit
```

| Stage | Service | Notes |
| --- | --- | --- |
| Upload | `imports.controller.upload.ts` | `check-upload-validation.mjs` enforces size/MIME/virus checks |
| Classify | `document-classifier.service.ts` | Document → type (prescription, lab report, registration form) |
| Extract | `import-file-parser.service.ts`, `text-extractor.service.ts`, `import-ocr-workflow.service.ts` | Excel vs PDF vs image branches |
| Normalize | `import-row-normalizer.ts`, `import-column-mapping.service.ts` | User-mappable headers → canonical columns |
| Score | `confidence-scorer.service.ts` | Each row gets a 0–1 confidence; below threshold goes to review |
| Dedupe | `import-duplicate-detector.service.ts` | Phone + name fuzzy match against existing patients |
| Preview | `import-preview.service.ts` | Operator sees the diff before commit |
| Commit | `import-patient-persistence.service.ts`, `ocr-import-commit.service.ts` | Transactional write, idempotent per import session |

### 34.2 Strategy registry

`bulk-import-strategy.registry.ts` keyed by `(entityType, sourceFormat)` selects the right pipeline. Adding a new source format (e.g., DICOM metadata, lab CSV with a new vendor's headers) is a single strategy registration — no controller changes.

### 34.3 Image preprocessing

`image-preprocessor.service.ts` runs deskew, contrast normalization, and rotation correction before OCR. Without this, accuracy drops ~20% on phone-camera captures of paper records.

### 34.4 Session and resumability

`import-session.service.ts` persists state per session so a large import (10k+ rows) can resume after a process restart. Combined with idempotent commit (§14.3), an operator can retry a partially-failed import without duplicating rows.

---

## 35. Internal admin services

`apps/api/src/shared/modules/internal/` is the backend half of `apps/internal/`. It is a separate module — not just a separate controller — so its dependencies (which include cross-tenant queries) can be wired without polluting the per-tenant modules.

Capabilities:

- **Clinic management**: create clinics, change status/tier, update admins, and manage clinic AI settings.
- **Subscription and billing admin**: inspect subscriptions/payments, extend grace periods, and manage tier pricing/offers.
- **Internal analytics**: cross-tenant aggregates for operations and commercial reporting.
- **Support**: feedback, inquiries, WhatsApp support threads, and broadcast operations.
- **Internal logs**: query the internal log surface through storage-backed and fallback readers.

The split between `apps/api/src/domains/<domain>/` (tenant-scoped business logic) and `apps/api/src/shared/modules/internal/` (staff-only cross-tenant operations) is deliberate. Internal requests use the staff audience and bypass path; keep that capability isolated and audited.

---

## 36. Performance module and RUM

Client-side performance beacons (web vitals: LCP, INP, CLS, TTFB, FCP) are accepted by the monitoring module and queried by internal tooling. [`apps/api/src/shared/modules/performance/`](../../apps/api/src/shared/modules/performance/) separately exposes server/runtime performance metrics.

- The browser posts to `/api/v1/monitoring/web-vitals` — same-origin via the middleware proxy, never directly cross-origin (§1.2).
- Web-vital samples persist as `SystemMetric` rows; internal queries aggregate a bounded recent window.
- Runtime rating thresholds live in `web-vitals-metrics.service.ts`; CI route targets live separately in `scripts/perf/route-budgets.config.mjs`. Keep them intentionally aligned when budgets change.

Backend latency is captured separately by the request-logging interceptor and surfaced through the monitoring module.

---

## 37. Caching strategy (multi-layer)

The system has **four** layers of caching, each with a different invalidation model. Knowing which one applies to a given piece of data is a frequent source of bugs.

| Layer | Lives in | Invalidation | Use for |
| --- | --- | --- | --- |
| HTTP response cache (`CacheInterceptor`) | `apps/api/src/shared/common/interceptors/cache.interceptor.ts` | Opt-in `@CacheDuration`, normalized key, TTL, ETag | Selected GET configuration routes |
| Service cache (Redis/in-memory) | `apps/api/src/cache/` (`CacheConfigModule`) | TTL + explicit | Cross-request compute (tier-feature matrix, clinic auth context) |
| Prisma query cache | N/A — intentionally not used | — | Avoid; correctness with the tenant extension is hard |
| Frontend React Query cache | `packages/data-access` | Per-key invalidation on mutation | All client-visible read data |

### 37.1 Ad-hoc caches are blocked

`check-ad-hoc-service-cache.mjs` scans domain application services for instance-level `Map` caches and flags them unless allowlisted. Shared infrastructure caches still exist where they have bounded size/TTL semantics; new cross-request caches should use the cache module unless a reviewed local cache is justified.

### 37.2 Redis is optional

`check-cache-redis-required.mjs` permits the in-memory cache for single-instance dev, but flags any code that *requires* Redis without a fallback. Production topology can opt into Redis; the abstraction is preserved so local dev and integration tests do not need it.

### 37.3 Clinic auth cache

`clinic-auth-cache.service.ts` is a hot path: guards and authorization resolve clinic tier, mode, subscription state, and feature overrides through it. The in-memory map is bounded and TTL-based, with explicit invalidation helpers for mutation paths.

---

## 38. Error handling and error filters

[`apps/api/src/shared/modules/error-handling/`](../../apps/api/src/shared/modules/error-handling/):

- `filters/http-exception.filter.ts` — bootstrap-registered `AllExceptionsFilter`: maps Zod, auth/HTTP, framework-free domain, and known Prisma failures into problem details; 5xx failures are forwarded to Sentry and monitoring with request-body key summaries rather than body values.
- `exceptions/` and `shared/common/errors/` — reusable application/resource/validation exceptions plus framework-free domain errors.
- `logger.service.ts` + `logger-level.registry.ts` — structured Nest logger helper and a small validated level-to-writer dispatch registry. There is no per-module runtime override endpoint in this module.
- `sentry.utils.ts` — Sentry capture policy and PHI scrubber hook for server events.

### 38.1 The "empty catch" check

`check-empty-catches.mjs` blocks `try { … } catch {}`. Catches must either log + rethrow, translate to a domain exception, or carry an explanatory `// expected: ...` comment that documents *why* swallowing is correct.

---

## 39. Transactions and connection management

### 39.1 `prisma.$transaction` patterns

Two styles are used:

- **Interactive transactions** (`prisma.$transaction(async (tx) => …)`) — for use cases that span multiple repository calls. Application services obtain the client through `ITransactionRunner.runInTransaction()` and thread `tx` explicitly into repositories.
- **Batch transactions** (`prisma.$transaction([…])`) — for write fan-out where the operations are statically known.

The interactive form holds a connection for the duration of the callback. Long-running computation inside a transaction is a foot-gun; `check-multi-write-transaction.mjs` flags suspicious patterns.

### 39.2 Connection pool sizing

[`PrismaService`](../../apps/api/src/prisma/prisma.service.ts) builds a `pg.Pool` through `createUtcPoolConfig()`. Pool maximum, idle timeout, and connection timeout come from `DATABASE_CONSTANTS`, with production/development variants. Review those constants alongside Fly machine count and worker concurrency before scaling replicas.

### 39.3 The "transaction within a request" rule

A request must complete its transaction before external I/O (HTTP, provider SDK calls) — otherwise a slow dependency holds a DB connection. For durable handoff coupled to a write, append an outbox row inside the transaction and let the relay run after commit. The database-backed queue is still a separate write through its current port (§14.4).

### 39.4 RLS request transaction envelope

When RLS is enabled for a clinic-scoped HTTP request, [`TenantContextInterceptor`](../../apps/api/src/shared/common/interceptors/tenant-context.interceptor.ts) opens one interactive transaction for the request, applies `SET LOCAL app.current_clinic_id`, and publishes the transaction through [`active-tx.storage.ts`](../../apps/api/src/shared/modules/rls/active-tx.storage.ts). The RLS-routing extension sends Prisma operations back through that connection. This is distinct from `ITransactionRunner`, which application services use for atomic business writes.

---

## 40. Frontend `shared/lib` taxonomy

`apps/app/src/lib/` is the largest "everything-else" tree in the frontend. It is **not** a junk drawer — it is organized by concern:

| Subtree | Owns |
| --- | --- |
| `auth/` | Browser session, CSRF, login lockout, return-path safety, idle logout, browser request/fetch helpers |
| `access-control/` | Client-side mirror of API permissions (the matrix + parsers + rules) |
| `subscription/` | Tier and feature-gate hooks/components |
| `contexts/` | `AppConfig`, `Clinic`, `Socket`, `TierConfig` providers |
| `api/` | The thin proxy fetcher consumed by `@workspace/data-access` |
| `http/` | Retry, timeout, status-code helpers |
| `monitoring/` | Sentry init, web-vitals beacon, error reporter |
| `security/` | XSS-safe HTML helpers, URL allowlisting |
| `errors/` | UI-side error mapping + user-facing copy |
| `formatters/` | Currency, date, phone, name formatters (locale-aware in one place) |
| `rules/` | Pure business rules shared across features (booking eligibility, conflict checks) |
| `validation/` | Zod schemas specific to UI forms not derived from API DTOs |
| `i18n/` | Locale strings (currently English only) |
| `stores/` | Zustand stores (rare — most state is in React Query) |

The split is enforced by `check-no-duplicate-shared-paths.mjs` so a `lib/foo.ts` and `lib/auth/foo.ts` cannot coexist.

---

## 41. Scoped lifecycle context: AsyncLocalStorage

The backend uses small, purpose-specific ALS carriers rather than one broad request bag:

| Carrier | Stored value | Consumer |
| --- | --- | --- |
| [`request-context.store.ts`](../../apps/api/src/shared/common/context/request-context.store.ts) | `{ correlationId }` | Deep request logging and synchronous `@OnEvent` handlers |
| [`tenant.middleware.ts`](../../apps/api/src/shared/common/middleware/tenant.middleware.ts) | `{ clinicId?, userId?, bypassed?, preTenant? }` | Tenant extension, pre-tenant onboarding, controlled unrestricted paths |
| [`active-tx.storage.ts`](../../apps/api/src/shared/modules/rls/active-tx.storage.ts) | RLS-scoped Prisma transaction | RLS-routing extension (§30.5, §39.4) |
| `audit-immutability.extension.ts` archival store | `{ archivalMode }` | Scheduled archive delete bypass only |

Keeping carriers narrow makes bypasses reviewable. Business data, feature flags, and logger instances should not become a generic ambient context.

### 41.1 Failure mode

If a service uses detached work, it must not assume HTTP ALS survives beyond the request. `check-detached-promises.mjs` flags common patterns. The correct path for durable work is the queue or outbox, with clinic/correlation identifiers passed explicitly where needed.

---

## 42. Notes that correct or refine earlier sections

Updated 2026-05 after the §28/§56 sweep. A few items deserve nuance:

- **§27.5 and §28.1 item 6** — now scaffolded. `data-retention.scheduler.ts` (§29.3) handles automated retention; the regulator-facing export job and per-tenant policy editor are designed in [`docs/compliance/AUDIT_EXPORT.md`](../compliance/AUDIT_EXPORT.md) but not yet shipped.
- **§28.1 item 9 (webhook secret rotation)** — API keys (§32) already support overlap-window rotation. The hardening doc lifts that pattern; see [`docs/compliance/AUTH_HARDENING.md`](../compliance/AUTH_HARDENING.md).
- **§28.2 item 22 (optimistic concurrency)** — **resolved**. [`apps/api/src/shared/common/repositories/with-version.ts`](../../apps/api/src/shared/common/repositories/with-version.ts) is the shared helper; new aggregates should use it.
- **§27.4 (DR runbook)** — **resolved**. See [`docs/operations/DR_RUNBOOK.md`](../operations/DR_RUNBOOK.md) for RTO/RPO, drill cadence, and recovery procedures.
- **§28.2 item 11 (in-process EventEmitter)** — **scaffolded** by [`OutboxModule`](../../apps/api/src/shared/modules/outbox/outbox.module.ts). The durable relay scheduler exists and Razorpay invoice payment capture uses an atomic append; migrating additional durable command fan-out and defining listener retry semantics are the next concrete steps.

---

## 43. Further reading

- [`AGENTS.md`](../../AGENTS.md) — normative rules (this doc is descriptive).
- [`docs/architecture/DATA_FOUNDATIONS.md`](DATA_FOUNDATIONS.md) — schema rationale.
- [`docs/architecture/DATA_ACCESS_MIGRATION_PLAN.md`](DATA_ACCESS_MIGRATION_PLAN.md) — frontend data-fetching contract.
- [`docs/architecture/API_DOCUMENTATION.md`](API_DOCUMENTATION.md) — endpoint reference.
- [`docs/architecture/zod-first-architecture.md`](zod-first-architecture.md) — the schema-first principle.
- [`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) — the Origin-inspired UI standard.
- [`docs/compliance/`](../compliance/) — DPDP-specific operational documents.
- [`docs/operations/`](../operations/) — runbooks (incomplete; see §28.5).

---

## 44. Vite SPA route tree (`apps/app/`)

The clinician app is a Vite + React Router SPA. Auth states are separated by **layouts** in the route tree (`apps/app/src/App.tsx`), which compose guards and chrome per surface:

| Layout | Purpose | Chrome |
| --- | --- | --- |
| `AuthLayout` | Login, register, password reset, MFA challenge | Public chrome, no nav |
| `SetupLayout` | Post-signup onboarding (clinic profile, team invites, payment) | Onboarding-only chrome |
| `ProtectedLayout` | Authenticated clinician surface — the bulk of the app | Full app shell with nav, sidebar, command palette |
| `ToolsLayout` | Internal dev/QA tooling (gated by `check-tools-route-gate`) | Minimal chrome |
| `PortalLayout` | Patient-portal subtree (different auth audience) | Portal-specific shell |
| `PublicLayout` | Public booking flow (no auth required) | Marketing-style chrome |
| `apps/<app>/api/index.ts` | Hono proxy Worker: same-origin `/api/v1/*` + `/socket.io/*` | N/A |

### 44.1 Layout cascade

Each layout mounts its chrome (sidebar, header, command palette) *once per session*, not re-mounted on route change. The shared providers (`react-query-provider`, `navigation-history-provider`, `app-config-context`, theme) are mounted once in `main.tsx` so they survive across layout changes — a user moving from the protected app to auth (logout) does not lose React Query cache or socket subscriptions until the auth state actually changes. Guards live in the route tree (`src/App.tsx`), not in per-page hooks; `/api/*` and `/socket.io/*` traffic is proxied by the Hono Worker.

### 44.2 Top-level error and not-found handling

- Root `errorElement` — the global error boundary (last-resort).
- Root `errorElement` on `*` — the root-of-root fallback when even the layout failed.
- `*` catch-all route — 404 surface.
- Nested route `errorElement` boundaries keep an error in `patients/:id/...` from unmounting the app shell.

`check-error-tsx-coverage.mjs` enforces that every meaningful route segment has an error boundary.

### 44.3 Feature surfaces and `route-meta.ts`

[`apps/app/src/lib/routing/route-meta.ts`](../../apps/app/src/lib/routing/route-meta.ts) holds a path → `{ label, parentPath? }` map covering every protected route (including dynamic segments like `/patients/:id`). It is consumed for breadcrumbs and page-title resolution — a lightweight registry, not a full nav/permission spec. Sidebar entries, permission gates, and tier gates live elsewhere (`components/navigation/*`, `lib/access-control/`). `check-e2e-nav-routes.mjs` cross-references nav routes against Playwright e2e specs to ensure every nav-visible route has at least one nav test.

---

## 45. Same-origin API proxy (Hono proxy Worker)

[`apps/app/api/index.ts`](../../apps/app/api/index.ts) and [`apps/internal/api/index.ts`](../../apps/internal/api/index.ts) proxy `/api/v1/*` (and `/socket.io/*` upgrades) in Cloudflare builds. Both delegate to [`packages/utils/src/http/upstream-api-proxy.ts`](../../packages/utils/src/http/upstream-api-proxy.ts). Local Vite development uses the dev-server proxy (`vite.config.ts`) so callers keep the same same-origin URL contract.

### 45.1 Responsibilities

1. **Forward path and method** with one canonical `/api/v1` prefix.
2. **Forward cookies** so the JWT and CSRF cookies cross the boundary (the browser only knows the same-origin domain).
3. **Strip hop-by-hop headers** and upstream `access-control-*` response headers that should not leak through a same-origin BFF.
4. **Preserve response cookies** while removing upstream `Domain=` attributes so refresh cookies bind to the frontend origin.
5. **Stream binary responses** without buffering (PDFs, exports).
6. **Block unauthorized hosts** — the proxy target is read from server env, never from client input. A malicious header cannot redirect the proxy.

### 45.2 Why this exists

Without the proxy, the browser would talk to `api.docita.work` cross-origin. Consequences:

- **CORS**: every preflight is an extra RTT and a deployment-coordination headache.
- **Cookies**: `SameSite=Lax` cookies don't ride cross-origin XHR; only `SameSite=None; Secure` works, which is a weaker posture.
- **Sentry/RUM**: cross-origin POSTs to `/perf/*` or `/sentry/*` hit CORS at edge case times (offline, slow network) and disappear silently.

The cost is one extra network hop (browser → CF edge → api). The latency is dominated by the CF→api leg either way, so the proxy hop is negligible.

### 45.3 Monitoring routes

Web vitals post to `/api/v1/monitoring/web-vitals` and use the same middleware path. The current repository does not define a separate Next `/api/monitoring/*` route tree. Sentry SDK ingestion is separate from this application-API proxy and retains its own PHI-scrubbing setup (§51).

### 45.4 Public API reads

Public reads such as the login daily thought use `/api/v1/public/*` and flow through the same middleware proxy. Keep product data in the API rather than introducing Next-only business endpoints.

---

## 46. Workspace packages, in depth

### 46.1 `packages/types`

The Zod-first contract package. Internal layout:

```
packages/types/src/
├── access/         # roles, permissions, access matrix
├── admin/          # internal-app DTOs
├── ai/             # LLM I/O schemas (versioned)
├── api/            # HTTP response envelopes, error codes, pagination
├── auth/           # login, session, MFA, password reset
├── billing/        # tier, subscription, invoice, payment, tax, enterprise-contract, feature-display
├── clinical/       # vitals, medications, contraindication-checker, medical-validation
├── contracts/      # OpenAPI-ish surface contracts
├── forms/          # form-only schemas not part of the HTTP surface
├── leave/          # leave management
├── medical-documents/
├── operations/     # ops/queue/job schemas
├── patient/        # demographics, identifiers, consent
├── pdf/            # PDF generation input/output
├── shared/         # primitives reused across domains
└── whatsapp/       # message/template schemas
```

Each leaf exports Zod schemas; the inferred TypeScript types (`z.infer<typeof X>`) are exported next to them. `check-type-duplicates.mjs` blocks redefining a type that already exists in `@workspace/types`.

### 46.2 `packages/db`

The Prisma boundary. Internal layout:

- `prisma/schema.prisma` — the canonical schema consumed by Prisma. Edit this file first.
- `prisma/schema/README.md` — retirement note for the former hand-maintained topic snapshots. Schema navigation now starts from canonical `schema.prisma`.
- `prisma/migrations/` — additive migrations. For destructive shape changes, use expand → backfill → contract phases per AGENTS.md §9.4 and the database safety scripts.
- `src/` — the exported Prisma client, enums, and shared model utilities.
- `scripts/` — schema-merge and post-generation helpers.

Generated client lives in `dist/`; consumers import from `@workspace/db`, never from `@prisma/client` directly. The boundary is enforced by `check-prisma-boundary.js`.

### 46.3 `packages/data-access`

The React Query hook layer. Internal layout:

- `core/` — `useApiQuery`, `useApiQueryValidated`, `useApiMutation`, `stale-time.ts`. The validated variant pipes responses through Zod before handing them to React Query, catching API/contract drift at the client edge.
- `provider/` — `DataAccessProvider`, `context.ts`, `useDataAccessContext()`. The app wires the actual fetcher + clinicId + tier guard at the provider boundary (`apps/app/src/providers/react-query-provider.tsx`); the package itself is environment-agnostic.
- `hooks/` — one file per domain (~35 files: appointments, patients, billing, prescriptions, …). Each file exports both queries and mutations and owns its query-key prefix.
- `types/` — shared response shapes.
- `lib/` — small utilities (URL builders, error mappers).
- `internal/` — exports for `apps/internal/` that should not be consumed by `apps/app/`.

### 46.4 `packages/ui`

The presentational primitive layer. Internal grouping under `components/`:

| Group | Examples |
| --- | --- |
| `form/` | `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `FormField` |
| `overlay/` | `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Sheet` |
| `layout/` | `Card`, `Section`, `Stack`, `Grid`, `AppPageScaffold`, `PageHeader` |
| `feedback/` | `DataState`, `Skeleton`, `Toast`, `Alert`, `EmptyState` |
| `data-display/` | `Table`, `DataTable`, `Badge`, `Avatar`, `DescriptionList` |
| `navigation/` | `Tabs`, `Breadcrumb`, `CommandPalette`, `Pagination` |
| `indicators/` | `Spinner`, `Progress`, `StatusDot`, `Tag` |

`design-tokens.ts` defines the token contract (colors, spacing, radii, typography). `styles/` carries the global stylesheet split into layers (`@layer base, components, utilities`).

`check-feature-boundaries.mjs` blocks app-local re-implementations: if a primitive needs a variant, it goes into `packages/ui`, not into the consuming feature.

### 46.5 `packages/auth`

Tiny — just shared session semantics (`session-semantics.ts`) used by both `apps/api` (token issuance/refresh logic) and `apps/app` (browser-side session validation). Keeping it in its own package prevents a circular import between api and app shared libs.

### 46.6 `packages/hooks` and `packages/utils`

Framework-agnostic primitives — **no imports from other workspace packages** (enforced by package boundaries). Apps and API import these for shared math, formatting, and small React utilities.

#### `packages/hooks` (~18 modules)

| Module | Use |
| --- | --- |
| `use-debounce`, `use-throttle` | Input/search debouncing |
| `use-media-query`, `use-breakpoint` | Responsive layout |
| `use-event-listener`, `use-on-click-outside` | DOM listeners without boilerplate |
| `use-local-storage` | Generic persisted state (prefer app allowlisted keys) |
| `use-medical-calculations` | BMI and related UI calculators |
| `use-clipboard`, `use-toggle`, `use-previous` | Small UX helpers |

Do not add Next.js or `react-query` imports here — those belong in `apps/app` or `packages/data-access`.

#### `packages/utils` (domain-heavy)

| Area | Examples | Consumers |
| --- | --- | --- |
| `billing/` | `tier-rules.ts`, tax helpers | API + app tier displays |
| `medical/` | `medical-calculations.ts`, date-of-birth age | Vitals, consultation forms |
| `date-formatting/`, `date-config/` | Clinic timezone, wall↔UTC | Scheduling, PDFs |
| `monitoring/phi-scrubber.ts` | Canonical Sentry scrubber | All apps (parity check §56 item 45) |
| `http/upstream-api-proxy.ts` | Hono proxy-Worker header/cookie rewrite | `apps/app`, `apps/internal` |
| `async/map-with-concurrency.ts` | Bounded parallelism | Imports, OCR batches |

**Rule:** If a helper encodes a **canonical data point** (patient full name, currency format, plan tier label), it must align with [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md) — do not fork a second formatter in app `shared/lib`.

### 46.7 `packages/eslint-config` and `packages/typescript-config`

Shared toolchain configs. The TS config exposes three presets: `base.json`, `nextjs.json`, `nestjs.json`. The ESLint config exposes presets per app type, including the parent-relative-import ban and the `process.env` rule.

---

## 47. CI/CD pipeline in depth

[`.github/workflows/`](../../.github/workflows/) has eleven workflows:

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | push/PR | Scope detection + repository standards + scoped app jobs |
| `api-e2e.yml` | scoped API changes | NestJS e2e against Postgres |
| `frontend-critical-e2e.yml` | scoped frontend changes | Playwright critical-path suite |
| `design-system-check.yml` | design-system changes | Contrast, token, and primitive checks |
| `db-migrations.yml` | Prisma migration changes | Migration validation |
| `db-migrations-staging.yml` | staging changes | Apply migrations to staging DB |
| `staging-smoke.yml` | staging changes / dispatch | End-to-end smoke against staging URLs |
| `sync-staging-after-promotion.yml` | push to `main` / dispatch | Update `staging` to the exact `main` commit |
| `synthetic-monitoring.yml` | schedule / dispatch | Production synthetic probes |
| `deploy.yml` | scoped push to `main` | Production Fly API + worker deploy; `deploy-app` / `deploy-internal` / `deploy-landing` jobs for Cloudflare (gated on the `gate` job's credential check) |

### 47.1 Scope detection in CI

`ci.yml`'s first job (`changes`) runs [`scripts/workflow/detect-workflow-scope.mjs`](../../scripts/workflow/detect-workflow-scope.mjs) and emits per-app booleans (`api`, `app`, `internal`, `landing`, `worker`, `db`, `dependencies`). Downstream jobs gate on these so a typo fix in `apps/landing/src/index.astro` does not rebuild `apps/api`.

The trade-off: scope detection itself must stay fast and correct. The script has its own unit tests in `scripts/workflow/`.

### 47.2 Turbo remote cache

Where configured, `TURBO_TOKEN` and `TURBO_TEAM` enable Turborepo remote caching. This is build-cache infrastructure, not an application deployment target. The cache key includes the resolved dependency graph, so dependency changes invalidate affected tasks.

### 47.3 Migration safety in CI

`db-migrations.yml` does three things every PR that touches Prisma:

1. **Reversibility check** — `check-migration-reversibility.mjs` rejects destructive operations (drop column, drop table, narrow type) without an explicit override comment.
2. **Shadow apply** — applies the migration to a throwaway DB created from main's schema; failure means the migration would fail in staging.
3. **Prefix collision** — `check-migration-prefix-collision.mjs` blocks two PRs each adding a migration with the same timestamp prefix.

### 47.4 Promotion model

```
feature branch → PR into main
  → merge/push to main
    → deploy.yml selectively deploys API / worker
    → deploy.yml deploy-app / deploy-internal / deploy-landing jobs (gated on
      the Cloudflare credential check) selectively deploy app / internal / landing
    → sync-staging-after-promotion.yml updates the staging ref to the exact main SHA
```

AGENTS.md states that `staging` is an exact replica of `main` maintained automatically. The workflow uses the GitHub ref API so it does not create integration commits or sync PRs.

---

## 48. Local development

### 48.1 `docker-compose.yml`

The local stack is **dev-only**: Postgres, Redis (optional), and the apps. Production does **not** use this compose file. Current deploy automation targets Fly.io, Cloudflare, and an AWS RDS snapshot integration before production migrations; keep provider detail in operations docs rather than inferring it from local compose.

### 48.2 Ports

| Port | Service |
| --- | --- |
| 3000 | `apps/app` (Vite dev) |
| 3001 | `apps/api` (Nest dev) |
| 3002 | `apps/internal` |
| 3003 | `apps/landing` (Astro) |
| 5432 | Postgres (compose) |
| 6379 | Redis (compose, optional) |

`scripts/kill-ports.js` frees these on `pnpm dev` if a previous run hung.

### 48.3 `.env.example`

Sets the contract for what env vars the apps need. `scripts/checks/check-process-env.mjs` keeps `.env.example` in sync with actual usage — adding a `process.env.NEW_THING` without adding it to `.env.example` fails CI.

### 48.4 `.gitleaks.toml`

Secret-scanning config. The accompanying `.gitleaks-envtest.json` is the test fixture that proves the scanner catches the patterns we care about (DB URLs with passwords, Razorpay keys, OpenAI keys, JWT secrets).

### 48.5 Tesseract language data

The OCR pipeline (§20, §34) uses `tesseract.js` via [`apps/api/src/shared/modules/imports/text-extractor.service.ts`](../../apps/api/src/shared/modules/imports/text-extractor.service.ts) (`createWorker('eng')`). [`apps/api/Dockerfile`](../../apps/api/Dockerfile) downloads English trained data into `/app/.tesseract/eng.traineddata` and sets `TESSDATA_PREFIX` for the runtime image. Local `*.traineddata` files are ignored by git; do not describe the root file as a checked-in or air-gapped-CI asset.

---

## 49. Load and performance testing

[`loadtest/k6/`](../../loadtest/k6/) holds the k6 scenarios:

| Scenario | Tests |
| --- | --- |
| `auth-login.js` | Token issuance under sustained login load (catches refresh-rotation deadlocks) |
| `patients-list.js` | Pagination + filter latency at realistic dataset sizes |
| `appointments-create.js` | Write fan-out + exclusion-constraint contention (§9) |
| `webhook-flood.js` | Webhook signature verify + idempotency under burst |
| `whatsapp-send.js` | Tenant rate-limit behavior under multi-tenant load |
| `proxy-route.js` | `/api/v1/*` edge-proxy route forwarding and prefix safety |

`run-all.sh` orchestrates all six scenarios, including `proxy-route.js`. Run the suite **manually before significant infra changes** (pool sizing, Fly region change, queue substrate change) — not on every PR. The load-test target is a dedicated staging environment with a seeded multi-tenant dataset.

---

## 50. `scripts/` subfolders not yet detailed

| Folder | Highlights |
| --- | --- |
| `scripts/lib/` | Shared check metadata and structure helpers: `controller-cqs-allowlist.mjs`, `documented-facade-services.mjs`, `duplicate-path-pairs.mjs`, `json-column-allowlist.mjs`, `perf-metrics.mjs`, `structure-audit.mjs`. |
| `scripts/db/` | `db-check.mjs`, timestamptz annotation/migration helpers, appointment-instant repair, ICD import. |
| `scripts/perf/` | Performance and accessibility baselines, route budgets, responsive/mobile smokes. |
| `scripts/ui/` | `check-contrast.mjs` and `detect-hardcoded-colors.js`. |
| `scripts/deploy/` | API startup smoke, security-header verifiers, DB schema-sync verification, Cloudflare credential verification, and Cloudflare/Astro patch guards. |
| `scripts/workflow/` | `detect-workflow-scope.mjs`, `check-repo-hygiene.mjs`, `verify-package-contracts.mjs`, `verify-turborepo-structure.mjs`. |

---

## 51. Sentry and monitoring

### 51.1 Runtime-specific Sentry configs

- `apps/app/src/lib/monitoring/` initializes the clinician app's browser Sentry runtime.
- App and internal shared monitoring folders carry client configuration appropriate to their boot paths.
- `packages/utils/src/monitoring/phi-scrubber.ts` is the canonical shared scrubber; parity checks protect early-boot variants.

The split exists because browser environments initialize differently. PHI redaction must remain semantically aligned even where boot files differ.

### 51.2 Browser-only Sentry bootstrap

Both Vite apps initialize Sentry in the browser entry (`src/main.tsx` via `@sentry/react`); there is no server runtime to initialize. The scrubber ships from `packages/utils`, and parity checks (`check-sentry-scrubber-parity`) keep the app and internal configurations aligned.

### 51.3 Frontend ingestion boundary

The checked-in repository does not define a Next `/api/monitoring/sentry` tunnel route. Treat Sentry SDK transport and `/api/v1/monitoring/web-vitals` as separate paths: both require non-blocking behavior and PHI scrubbing, but only the API telemetry route uses the application proxy Worker.

---

## 52. The Prisma schema, in depth

`packages/db/prisma/schema.prisma` is the canonical Prisma source and is roughly 4,200 lines. The former hand-maintained decomposition under `prisma/schema/` was retired because drift was more dangerous than the navigation benefit (§46.2). A few observations:

### 52.1 Canonical navigation

Use model and enum search directly against `schema.prisma`. [`prisma/schema/README.md`](../../packages/db/prisma/schema/README.md) records why the topic snapshots were removed and prevents reviewers from treating a secondary tree as authoritative.

### 52.2 Enum-vs-table choice

Enums remain co-located in canonical `schema.prisma`. Changing an enum value has wider blast radius than changing a model, so review the shared Zod contracts and migrations together with the schema edit.

### 52.3 Why the topic snapshots were retired

The topic-oriented files were manually synchronized and could silently become wrong. The repository now retains one consumed schema plus a retirement README. If navigation pressure returns, generate summaries from `schema.prisma`; do not restore hand-maintained copies.

### 52.4 Schema-locked posture (2026-03-22)

AGENTS.md §9.4 defines the existing-user compatibility posture: avoid destructive rollout steps in a single release. Renames and newly required state go through expand → backfill → prompt where necessary → enforce → contract sequences.

### 52.5 What lives in `Json` columns

`Json` columns are tolerated for genuinely polymorphic payloads (audit event payloads, AI suggestion outputs, OCR raw data) but each one must:

1. Have a Zod schema in `packages/types` co-located with the model.
2. Be parsed at the repository boundary with `safeParse`.

`check-json-column-zod.mjs` enforces (1); `check-json-parse-guarded.mjs` enforces (2). Raw `JSON.parse` outside guarded helpers is banned.

---

## 53. Repo root files reference

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Normative rules (the spec). Read first. |
| `CLAUDE.md` | Shorthand for Claude Code; defers to AGENTS.md. |
| `CONTRIBUTING.md` | Human-contributor onboarding. |
| `README.md` | Public-facing overview. |
| `pnpm-workspace.yaml` | Two-line workspace declaration (`apps/*`, `packages/*`). |
| `pnpm-lock.yaml` | Lockfile — sole source of dep truth. Manual edits are blocked by CI. |
| `turbo.json` | Task graph: `build` depends on `^build + check-types + lint`; `globalEnv` lists every env var that should bust the cache. |
| `knip.json` | Per-workspace entry points + custom rules. `apps/worker` is `ignoreWorkspaces` because its Nest module graph is reachable transitively from `apps/api`. |
| `package.json` | Root scripts (`pnpm dev`, `pnpm build`, `pnpm verify:standard`, etc.) and workspace-wide dev deps. |
| `tsconfig.json` | Two-line root TS config; per-app configs extend it. |
| `fly.toml` | API Fly app config. Worker has its own under `apps/worker/`. |
| `.github/workflows/deploy.yml` | Path-filtered deploy workflow: Fly API/worker jobs plus the credential-gated `deploy-app` / `deploy-internal` / `deploy-landing` Cloudflare jobs. |
| `docker-compose.yml` | Local dev only. Not used in production. |
| `eng.traineddata` | Optional ignored local Tesseract data; production image downloads its own copy (§48.5). |
| `.env.example` | Authoritative env var contract. |
| `.gitleaks.toml` / `.gitleaks-envtest.json` | Secret scanning. |
| `.node-version` | Pinned Node (≥22.12.0 per AGENTS.md). |

---

## 54. Cross-cutting interaction map

For new readers, the interactions between the cross-cutting layers are best understood as concentric rings around a request:

```
                ┌──────────────────────────────────────────┐
                │ HTTP edge (middleware BFF → NestJS)      │
                │ ┌──────────────────────────────────────┐ │
                │ │ Guard chain (auth, tenant, RBAC,    │ │
                │ │ subscription, rate limits)          │ │
                │ │ ┌──────────────────────────────────┐ │ │
                │ │ │ Interceptor chain (CSRF, ID,    │ │ │
                │ │ │ context, idempotency, cache,    │ │ │
                │ │ │ tenant context, audit)          │ │ │
                │ │ │ ┌──────────────────────────────┐ │ │ │
                │ │ │ │ Controller (thin)            │ │ │ │
                │ │ │ │ Use case / Application svc   │ │ │ │
                │ │ │ │ Domain rules (pure)          │ │ │ │
                │ │ │ │ Repository                   │ │ │ │
                │ │ │ │ ┌──────────────────────────┐ │ │ │ │
                │ │ │ │ │ Prisma extensions:       │ │ │ │ │
                │ │ │ │ │  tenant, encryption,     │ │ │ │ │
                │ │ │ │ │  audit-immutability,     │ │ │ │ │
                │ │ │ │ │  logging                 │ │ │ │ │
                │ │ │ │ └──────────────────────────┘ │ │ │ │
                │ │ │ └──────────────────────────────┘ │ │ │
                │ │ └──────────────────────────────────┘ │ │
                │ └──────────────────────────────────────┘ │
                └──────────────────────────────────────────┘
```

The further "in" a concern lives, the more universally it applies. The Prisma extensions (innermost) apply to background jobs and schedulers too, not just HTTP requests — that's why tenant scoping must live there, not in interceptors.

---

## 55. Glossary

- **ALS** — AsyncLocalStorage. Node's request-scoped context store (§41).
- **Anti-corruption layer** — translation boundary where infrastructure errors (Prisma `P2002`) become domain exceptions (§3.14, §31.1).
- **Application service** — orchestrator between use cases and infrastructure; lives in `domains/<x>/application/services/`.
- **Aggregate** — DDD term for a consistency boundary; one repository per aggregate.
- **Boundary file** — a TS module that defines the safe shape for crossing a layer (e.g., `repository-domain-item.boundary.ts`, `encryption-patient-fields.boundary.ts`). Reviewing it is reviewing the contract.
- **CQS** — Command/Query Separation. `-command.service.ts` writes, `-query.service.ts` reads, facade composes (§3.2).
- **DataState** — `@workspace/ui` primitive for loading/error/empty handling. Page-level requirement.
- **DDD layout** — the four-folder split (`core`, `application`, `infrastructure`, `presentation`) enforced by `check-api-domain-layout.mjs`.
- **DLQ** — Dead-letter queue (§14.1).
- **DPDP** — India's Digital Personal Data Protection Act (§29).
- **DSR** — Data Subject Request (§29.2).
- **Versioned field encryption** — selected patient PII values encrypted with authenticated AES-GCM and a key-version prefix (§27.2, §30.2).
- **Facade service** — composes command + query services, exposed to controllers (§3.3).
- **Idempotency key** — natural or supplied key paired with a unique ledger row to make retries safe (§14.3, §5.4).
- **Hono proxy Worker** — `apps/<app>/api/index.ts`. Routes same-origin `/api/v1/*` (and `/socket.io/*` upgrades) to the upstream API in Cloudflare builds (§21.2, §45).
- **Outbox** — transactional event table + cron relay to EventEmitter2 (§60); full multi-region/queue retry still pending (§28.2 items 11–12).
- **PHI** — Protected Health Information. Centralized definition (§27.1).
- **Port / Adapter** — DIP pair. Ports in `core/repositories/` or `application/ports/`; adapters in `infrastructure/`.
- **RLS** — Row-level security (Postgres). Application-layer rollout incomplete (§4.7, §28.1).
- **Strategy registry** — keyed dispatch (`(entityType, mode)` → strategy). Used by search (§19) and imports (§34.2).
- **Tenant** — clinic. The unit of multi-tenant isolation.
- **Use case** — single-purpose application class in `domains/<x>/application/use-cases/`.
- **Verify bundle** — `pnpm verify:standard` — the production guardrail script set (§11, §25.3).

---

## 56. Additional improvement opportunities (final pass)

Not in §28 but worth flagging after the deeper walkthrough:

42. ~~**Dual deploy targets (Vercel + Cloudflare/OpenNext)**~~ — **resolved**. Vercel is retired; both `vercel.json` files have been deleted. §21.1 (Cloudflare static assets + Hono proxy Worker only) is now accurate.
43. ~~**Canonical `schema.prisma` plus documentation decomposition**~~ — **resolved**. The hand-maintained secondary snapshots were retired; [`packages/db/prisma/schema/README.md`](../../packages/db/prisma/schema/README.md) points to the only consumed schema (§52.3).
44. ~~**`route-meta.ts` hand-maintained**~~ — **resolved (advisory)**. `scripts/checks/check-route-meta-coverage.mjs` flags routes missing from the map.
45. ~~**Two Sentry configs (server + client) per app × 2 apps = 4 places**~~ — **resolved**. Canonical scrubber lives in [`packages/utils/src/monitoring/phi-scrubber.ts`](../../packages/utils/src/monitoring/phi-scrubber.ts); `scripts/checks/check-sentry-scrubber-parity.mjs` enforces parity with the per-app early-boot scrubbers.
46. ~~**The `/api/v1/*` edge proxy has no dedicated stress test**~~ — **resolved**. See [`loadtest/k6/scenarios/proxy-route.js`](../../loadtest/k6/scenarios/proxy-route.js), now wired into `run-all.sh`. The production implementation is middleware-backed (§45).
47. ~~**`packages/data-access` query-key prefixes are conventional, not enforced**~~ — **resolved**. `scripts/checks/check-query-key-factory.mjs` blocks raw array literals.
48. ~~**Validation duplication between `packages/types/forms/` and API DTOs**~~ — **resolved (advisory)**. `scripts/checks/check-form-schema-extends.mjs` flags FormSchemas without a base.
49. ~~**`apps/worker` is `ignoreWorkspaces` in knip.json**~~ — **resolved**. `knip.json` now carries an inline comment explaining the path-mapping gap.
50. ~~**`scripts/checks/` has 60+ files**~~ — **resolved**. See [`scripts/checks/README.md`](../../scripts/checks/README.md).
51. ~~**Turbo's `globalEnv` and `.env.example` can drift**~~ — **resolved**. `scripts/checks/check-env-vs-globalenv.mjs`.
52. ~~**Per-package CHANGELOG.md is absent**~~ — **mostly resolved**. Runtime/shared-code packages carry changelogs; config-only packages (`eslint-config`, `typescript-config`) do not.
53. ~~**No checked-in public OpenAPI snapshot**~~ — **resolved by policy**. [`apps/api/scripts/generate-openapi.ts`](../../apps/api/scripts/generate-openapi.ts) writes `docs/api/openapi.json` as a release artifact; [`docs/api/README.md`](../api/README.md) records that the generated snapshot is intentionally ignored rather than committed.
54. ~~**The `(tools)/` route group is feature-flag gated, not build-time**~~ — **resolved**. The Vite `ToolsLayout` (in the `src/App.tsx` route tree) is gated by the tools-route gate; `scripts/checks/check-tools-route-gate.mjs` enforces.
55. ~~**`apps/landing` E2E is uncovered**~~ — **resolved**. See [`apps/landing/e2e/booking-redirect.spec.ts`](../../apps/landing/e2e/booking-redirect.spec.ts).
56. ~~**Daily-thought ownership was unclear**~~ — **resolved**. It is API-owned public data under `/api/v1/public/*`, reached through the same-origin proxy.

---

## 57. Audit method and evidence levels

This document is a repository snapshot, not an aspirational architecture brochure. Read statements with these evidence levels in mind:

| Label | Meaning |
| --- | --- |
| **Implemented** | Concrete runtime code or migration exists and is linked |
| **Checked** | A repository script mechanically enforces at least part of the invariant |
| **Feature-gated** | Code exists, but environment configuration or rollout proof determines whether it is active |
| **Scaffolded / partial** | The boundary or infrastructure exists, but important producers, consumers, or operations steps are still pending |
| **Recommended** | Useful next pattern only if the named failure mode appears; not current behavior |

The 2026-06 pass verified local Markdown links, checked representative runtime files for each major boundary, and moved live pending items into §65. It also avoids using provider-specific runtime claims where the repository cannot prove deployed state.

---

## 58. Frontend client state and real-time (summary)

See §6.2.1–6.2.2 for implementation detail. Design rules:

1. **React Query** owns server-fetched entities; effective prefix defaults live in [`packages/data-access/src/core/stale-time.ts`](../../packages/data-access/src/core/stale-time.ts).
2. **Zustand** only for cross-route client concerns (permissions cache, theme) — not for patients, appointments, or invoices.
3. **Sockets** invalidate queries; they do not write entity snapshots into stores.
4. **Billing display** must use server `currentPlanTier` / subscription payload, not `permissionStore.currentTier` alone ([`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md) §B).

---

## 59. Authorization policy engine (backend + frontend)

§3.16 documents the pattern. Operational checklist when adding a sensitive route:

1. Declare controller posture (`@Roles`, `@RequireFeature`, or `@Public`) — [`check-controller-rbac.mjs`](../../scripts/checks/check-controller-rbac.mjs).
2. Add `policyEngine.assertCan` (or equivalent guard) for resource-level actions.
3. Mirror route visibility in [`access-policy.ts`](../../apps/app/src/lib/access-control/access-policy.ts) and command palette / sidebar config (`nav-config.ts`).
4. Front Desk: use `shouldDenyAccessForFrontDeskTier` / `FRONT_DESK_BLOCKED_ACCESS_TARGETS` from `@workspace/types` — not legacy workspace-profile symbols.

Internal app (`apps/internal`) uses a reduced policy surface; staff JWT audience is separate (§22).

---

## 60. Transactional outbox (current implementation)

**Status:** durable table + append service + relay scheduler exist. The first critical producer, Razorpay invoice payment capture, appends its event inside the invoice-update transaction. Continue migrating durable command fan-out as those paths are touched. ADR: [`decisions/0010-transactional-outbox.md`](decisions/0010-transactional-outbox.md).

### 60.1 Components

| Piece | Path |
| --- | --- |
| `OutboxEvent` table | Canonical [`schema.prisma`](../../packages/db/prisma/schema.prisma) |
| Enqueue API | [`outbox.service.ts`](../../apps/api/src/shared/modules/outbox/outbox.service.ts), [`outbox.interface.ts`](../../apps/api/src/shared/modules/outbox/outbox.interface.ts) |
| Relay | [`outbox-relay.scheduler.ts`](../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts) — cron drains rows, republishes to `EventEmitter2`, sets `processedAt` |
| Enforcement | [`check-event-emit-via-outbox.mjs`](../../scripts/checks/check-event-emit-via-outbox.mjs) — documents and limits direct emits while migration proceeds |

### 60.2 Relay semantics

- Batch size 200; max 8 attempts with exponential backoff (`BACKOFF_BASE_MS` → cap 5 min).
- Claim uses `UPDATE … RETURNING` with attempt/backoff filters — safe for multiple API replicas (`SKIP LOCKED`-style semantics via CTE).
- In-process `running` flag prevents overlapping ticks on one pod; **cross-pod leader election** is future work (advisory lock noted in file header).

### 60.3 What is not done yet

- Listener retry via dedicated queue processor (§28.2 items 11–12, §28.4 item 31).
- Migrate additional durable command fan-out to `outbox.append(tx, ...)` as paths are touched; [`check-event-emit-via-outbox.mjs`](../../scripts/checks/check-event-emit-via-outbox.mjs) currently reports no direct command-path emits.
- Multi-region relay / external message bus.

### 60.4 When to use outbox vs in-transaction queue

| Mechanism | Use when |
| --- | --- |
| Queue enqueue | Async job with its own idempotency key; current port is a separate write |
| Outbox row + relay | Handoff must commit atomically with the aggregate mutation; cross-module fan-out |
| Direct `EventEmitter2` | Read-model updates inside same request where loss on crash is acceptable — **blocked in command services** by check |

---

## 61. Shared NestJS modules catalog (`apps/api/src/shared/modules`)

Flat modules used across domains. Prefer importing the module, not reaching into deep paths from domains.

| Module | Responsibility |
| --- | --- |
| `auth` | JWT, refresh, MFA, guards, decorators, policy engine, rate limits |
| `audit` | Audit log writers, event listeners |
| `cache` | Optional Redis / in-memory cache-manager (module removed 2026-08-08 — superseded by `apps/api/src/cache/`, `CacheConfigModule`) |
| `compliance` | Consent, DSR, retention, archival, PHI definitions |
| `config` | Zod-validated env (`AppConfigService`) |
| `database` / `prisma` | Prisma module wiring |
| `document-generation` | PDF template method, layout |
| `ephemeral-store` | Short-lived rows + cleanup cron |
| `error-handling` | HTTP filters, Prisma error registry |
| `feature-flags` | DB-backed flags + % rollout |
| `fhir` | FHIR builders/export |
| `idempotency` | HTTP idempotency interceptor + repository |
| `imports` | Bulk import strategies, OCR text extract |
| `messaging` | Email/WhatsApp/SMS channels, orchestrator, admin alerts |
| `monitoring` / `observability` | Metrics, Pino, PHI redactor |
| `outbox` | Transactional outbox + relay |
| `performance` | RUM ingestion helpers |
| `public` | Unauthenticated booking/contact |
| `queue` | Postgres queue, PDF jobs, DLQ |
| `rls` | RLS rollout helpers |
| `schedule` | Shared cron schedules, heartbeat decorator |
| `search` | Strategy registry + FTS |
| `support-whatsapp` | Inbound support bot |
| `tenant-rate-limit` | Per-tenant throttling |
| `time` | Clock bindings |
| `webhooks` | Replay dedupe |
| `whatsapp-broadcast` | Template broadcast quotas |
| `ai` | OCR + clinical AI orchestration |
| `internal` | Staff-only utilities |
| `contact` | Contact/lead capture |
| `clinic-workspace` | Workspace-level clinic helpers |

When adding a cross-cutting concern, create a `shared/modules/<name>/` module with `*.module.ts` rather than dropping services into `shared/services/`.

---

## 62. `packages/utils` and `packages/hooks` (quick index)

Full layout: §46.6. Import rules:

- API domain code may import `@workspace/utils` for pure functions; **not** `@workspace/hooks`.
- Frontend may import both; hooks must not import NestJS or Prisma.
- Medical/billing display helpers that define product meaning belong in utils **and** be listed in SSOT when they become canonical.

---

## 63. Single source of truth cross-reference

[`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md) is the authoritative registry of **data points** (one canonical source per fact). This document describes **how code is shaped** (patterns, layers, checks). Use both:

| Question | Read |
| --- | --- |
| Where should "current plan" come from? | SSOT §B — active `Subscription`, not `Clinic.tier` alone |
| Where should GSTIN be read? | SSOT §C — `Clinic.settings.gstin` |
| How do I add a repository? | This doc §3.1, §2.1 |
| How do I gate a feature in UI? | This doc §6.4, §15; SSOT for tier vs plan distinction |

The SSOT consolidation checklist is currently complete. Keep it enforced through
the registered guardrails, including `check-patient-name-ssot.mjs`, and add new
data-point ownership decisions to [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md)
before introducing another store or derivation.

---

## 64. Enterprise patterns — intentional posture

Docita is a **modular monolith** (API + worker + static frontends), not microservices. The table below states what we **do not** adopt globally and what we use instead.

| Pattern | Posture | Docita alternative |
| --- | --- | --- |
| Microservices per domain | No | DDD folders + `shared/modules` + EventEmitter/outbox |
| Event sourcing | No | Postgres rows + audit log + outbox events |
| CQRS read models / projections | Partial | Read/write repos + query services; no separate event-built stores |
| Saga orchestrator | No | Prisma transactions + compensating manual flows |
| Specification pattern | No | Typed list DTOs + repository `where` builders |
| Circuit breaker library | No | Timeouts, rate limits, backoff (§3.22) |
| API versioning beyond `/v1` | No formal policy | Breaking changes ship with coordinated client deploy |
| OpenTelemetry everywhere | Partial | Correlation ID in ALS (§41); Sentry for errors |
| GraphQL | No | REST + Zod + OpenAPI (`openapi:generate`) |

Adopt new enterprise machinery only when a **concrete** failure mode appears (multi-region active-active, payment sagas across providers, etc.) and document an ADR first.

---

## 65. Pending work register (2026-06)

Consolidates §28, §56, SSOT 🚧 items, and codebase references. **Not a commitment schedule** — use for sprint planning.

### 65.1 Security and compliance (from §28.1)

| ID | Item | State |
| --- | --- | --- |
| S2 | RLS operational enablement | Code ready; ops: `RLS_ENABLED`, `docita_app` role |
| S3 | PDF signed URL session binding | Advisory `check-pdf-bearer-cap.mjs`; harden per `AUTH_HARDENING.md` |
| S4–S5 | Refresh token hash migration complete; WebAuthn MFA | Tracked in `AUTH_HARDENING.md` |
| S8–S9 | KEK rotation cadence; webhook secret rotation | ADR 0007 + hardening doc |
| — | PDF delivery hardening | PDF/status branches use `private, no-store`; generated PDFs use one 15-minute TTL constant. Still classify 4-hour generic signed-URL consumers |

### 65.2 Architecture

| ID | Item | State |
| --- | --- | --- |
| A11–A12 | Outbox relay + no direct emit in commands | Relay live; Razorpay invoice payment capture migrated; guard reports no direct command-path emits. Listener→queue retry pending |
| A14 | Feature folder client/server mix | Deferred |
| A17 | `packages/types` per-domain barrels | Resolved: the package root re-exports per-domain barrels |
| A20 | Richer capability matrix | Partial via `FEATURE_TIER_MAP` |
| A21 | API dead-route detector | `check-api-dead-routes.mjs` advisory |
| A24 | i18n | Plan in `docs/UpcomingPlans/I18N_PLAN.md` |
| A33 | Query-budget extension registration | Resolved: wired into `PrismaService` with request-scoped counters and structured over-budget warnings |
| — | Repository cast boundary tightening | `repository-domain-item.boundary.ts` is a pragmatic cast; prefer aggregate mappers and narrow future usage |
| — | Prisma extension-order documentation parity | Resolved: `PrismaService` chaining comments, extensions README, and chain-length spec describe the six-extension order |
| — | Error-filter consolidation | Resolved: removed the legacy module filter; bootstrap `AllExceptionsFilter` owns the envelope |
| — | PHI boundary registry | Partially resolved: encryption-to-redactor parity and Sentry scrubber parity are checked; audit classification remains an explicit reviewed boundary |
| — | Partner API-key hardening | Partially resolved: typed creation/rotation DTOs, bounded overlap-window rotation, route-level scope decorator/guard enforcement, and optional IP allowlists exist. The first explicit partner surface remains pending |

### 65.3 SSOT consolidation (from `SINGLE_SOURCE_OF_TRUTH.md`)

| Data point | Action |
| --- | --- |
| Patient full name | Resolved: display routes through `getPatientFullName()`; `check-patient-name-ssot.mjs` blocks inline recomposition |
| BMI / vitals labels | Resolved: calculators and labels route through types/utils |
| Current plan vs access tier | Resolved: sidebar/header use billing `currentPlanTier` |
| GSTIN | Resolved: `getClinicGstin()` is canonical; PDF DTO reads are already-derived values |
| Invoice totals | Resolved: one calculator with client/server parity coverage |
| Timezone / slot duration | Resolved: defaults route through canonical date config |
| API URL / public booking URL | Resolved: compatibility modules re-export canonical config |

### 65.4 Operability

| ID | Item | State |
| --- | --- | --- |
| O35 | DLQ auto-replay | Transient-error classifier, durable `QueueJob.replayCount` / `lastReplayedAt`, and regression tests exist; automatic replay remains intentionally disabled until each queue's replay policy is reviewed |
| O36b | `CronHeartbeat` Prisma persistence | Resolved: decorator records success/failure through the worker-scoped Prisma recorder |
| — | Cross-origin telemetry guard script | Resolved: `check-browser-telemetry-same-origin.mjs` is wired into repository standards |
| — | WebSocket horizontal scale / sticky sessions | Decision boundary documented in `docs/operations/WEBSOCKET_SCALING.md`; add pub/sub before multi-replica fan-out requires it |

### 65.5 Data, time, and edge consistency

| Item | State |
| --- | --- |
| React Query stale-time registry | Resolved: `packages/data-access/src/core/stale-time.ts` is canonical; dead package/app tables were removed and prefix behavior is tested |
| Landing BFF parity | Resolved baseline: Astro proxy remains intentionally separate; helper contract tests cover URL/query handling, traversal rejection, request forwarding, and response-header filtering |
| Appointment instant repair | Dry-run/apply scripts exist; execute against restored production-like data before timezone-sensitive releases |
| Required-setting rollouts | Resolved: `docs/operations/REQUIRED_SETTING_ROLLOUT_CHECKLIST.md` standardizes expand → backfill → targeted prompt → enforce → contract |

### 65.6 Documentation and configuration reconciliation

| Item | State |
| --- | --- |
| `staging` mirror semantics | Resolved: workflow updates the `staging` ref to the exact `main` SHA |
| Cloudflare deployment ownership | Resolved: the `gate` + `deploy-app` / `deploy-internal` / `deploy-landing` jobs in `deploy.yml` own Cloudflare deploys (credential-gated; Cloudflare Git integration is the documented fallback) |
| Postgres provider references | Resolved in current architecture/operations docs: production migration safety is AWS RDS snapshot-aware; staging-specific provider notes remain scoped to staging |
| Prisma topic decomposition | Resolved: retired the manual `prisma/schema/` snapshots and retained one canonical schema |
| OpenAPI artifact policy | Resolved: generated release artifact, intentionally ignored; see `docs/api/README.md` |
| Outbox comments and ADR | Resolved: comments and ADR point to `OutboxRelayScheduler`; producer migration remains a runtime architecture item (§60.3) |

### 65.7 Documentation hygiene

- Keep **outbox relay path** comments aligned with `outbox-relay.scheduler.ts` (§60.3).
- Keep `loadtest/k6/scenarios/proxy-route.js` in `run-all.sh` when the edge proxy contract changes.
- When a §28 item ships, move it to "resolved" in §28.7 and trim §65.
- Regenerate OpenAPI after route changes: `pnpm --filter @docita/api run openapi:generate`.

---

## 66. Pattern maturity matrix

The catalog above is intentionally broad. This matrix is the quicker engineering view: what is established, what is partial, and where the next failure mode is likely to appear.

| Pattern | State | Canonical implementation | Next pressure point |
| --- | --- | --- | --- |
| Modular monolith with DDD folders | Implemented + checked | `apps/api/src/domains/*`, `check-api-domain-layout.mjs` | Keep cross-domain imports behind ports |
| Repository + mapper boundary | Implemented + checked | Domain repositories, mappers, `check-prisma-boundary.js` | Keep Prisma types out of services/controllers |
| Zod-first HTTP contracts | Implemented + checked | `packages/types`, DTO wrappers, validated clients | Eliminate remaining form/API shape duplication |
| Thin controllers + CQS facades | Implemented + checked | Command/query/facade services, route-thinness checks | Split services before use cases become workflow containers |
| ALS tenant isolation | Implemented | Tenant middleware/context + Prisma extension | Prove detached work always crosses a queue/outbox boundary |
| PostgreSQL RLS | Feature-gated | `RlsService`, routing extension, Fly env | Verify live role provisioning and staging soak |
| Query-budget extension | Implemented | `query-budget.extension.ts`, request-context ALS, `PrismaService` | Calibrate route-specific budgets from observed hot paths |
| DB constraints as race backstop | Implemented | Appointment overlap exclusion migration | Apply the same pattern to future check-then-write races |
| Transaction runner port | Implemented | [`transaction-runner.port.ts`](../../apps/api/src/shared/common/ports/transaction-runner.port.ts) | Prefer it over importing Prisma into application services |
| Transactional outbox | Partial | `OutboxEvent`, `OutboxService`, `OutboxRelayScheduler`, Razorpay invoice capture producer | Migrate future durable fan-out; define listener retry policy |
| Postgres queue | Implemented | `queue.interface.ts`, `postgres-queue.service.ts` | Keep enqueue atomicity claims honest; rely on idempotency or outbox |
| UTC instant storage | Implemented | `@db.Timestamptz(3)`, UTC pool config | Rehearse repair script against restored data |
| Existing-user compatibility migration | Implemented example | Onboarding backfill + trigger + auth fallback | Reuse as rollout template for required settings |
| React Query server-state ownership | Implemented | `@workspace/data-access`, provider bridge, canonical stale-time registry | Expand prefix tests when new live-state domains appear |
| Same-origin edge BFF | Implemented | Next middleware + shared proxy helper; Astro landing BFF helper contract tests | Keep the adapter matrix aligned when edge behavior changes |
| Feature capability map | Implemented, evolving | `FEATURE_TIER_MAP`, guard checks | Move beyond tier ladder only when packaging requires it |
| Socket invalidation | Implemented | Socket context + React Query invalidation | Introduce pub/sub only when horizontal fan-out demands it |

---

## 67. Datetime, timezone, and clock pattern

Scheduling is a correctness boundary, not a formatting concern. The repository uses four complementary rules.

### 67.1 Store instants, preserve wall-clock schedules

All Prisma `DateTime` fields represent UTC instants and use `@db.Timestamptz(3)`. Recurring clinic hours remain wall-clock strings (`HH:mm`) interpreted with `Clinic.timezone`. See [`packages/db/README.md`](../../packages/db/README.md).

| Data | Representation | Why |
| --- | --- | --- |
| Appointment start/end, audit timestamp, token expiry | UTC instant in `timestamptz(3)` | Stable comparison, ordering, and cross-region behavior |
| Doctor weekly schedule | `HH:mm` + clinic timezone | A 09:00 clinic opening remains 09:00 when interpreted for a date |
| UI datetime-local input | Clinic-wall `yyyy-MM-dd'T'HH:mm` | Matches what staff type and see |

### 67.2 Convert at boundaries

Frontend helpers convert clinic-wall form values to UTC ISO before POST. API handlers re-normalize scheduling writes with `normalizeAppointmentInstant`; storage never accepts ambiguous clinic-local digits as if they were UTC.

### 67.3 Force UTC database sessions

[`packages/db/src/index.ts`](../../packages/db/src/index.ts) exposes `createUtcPoolConfig()` / `withUtcSessionTimezone()` and adds `-c TimeZone=UTC` to PostgreSQL pool options. The API Prisma service and seed tooling reuse that helper. This protects reads, writes, scripts, and migrations from machine-local timezone differences.

### 67.4 Inject clocks in business logic

Domain/application logic uses `IClock` instead of scattering `new Date()`. [`check-new-date-in-domain-infrastructure.mjs`](../../scripts/checks/check-new-date-in-domain-infrastructure.mjs) makes time-dependent rules deterministic in tests.

### 67.5 Repair path

[`scripts/db/repair-appointment-instants.mjs`](../../scripts/db/repair-appointment-instants.mjs) supports dry-run and apply modes for appointments previously saved with wall digits treated as UTC. Run dry-run first against a restored production-like snapshot and review candidates before applying changes.

---

## 68. Existing-user compatibility and additive evolution

Every release is a migration for existing clinics. A new default, enum, consent, required setting, or onboarding step must preserve the behavior of accounts created before the feature existed.

### 68.1 Concrete implemented example: onboarding completion

[`20260601120000_preserve_existing_user_onboarding_completion/migration.sql`](../../packages/db/prisma/migrations/20260601120000_preserve_existing_user_onboarding_completion/migration.sql) treats `User.clinicId` as the durable workspace boundary:

1. Backfill clinic-associated users to `onboardingStep = COMPLETED`.
2. Set `onboardingCompletedAt` when missing.
3. Install a database trigger so future writes cannot reset a clinic-associated user to initial onboarding.
4. Keep a defensive API compatibility fallback in [`onboarding-state.ts`](../../apps/api/src/shared/modules/auth/auth/onboarding-state.ts) while migrations roll out.

### 68.2 Concrete implemented example: repeat-customer Essential checkout

The Essential onboarding plan includes a free trial for eligible accounts, but
repeat customers must stay on the selected Essential tier and complete checkout.
The UI must not silently downgrade or wait until final submission to reveal the
payment requirement.

The contract is enforced across the shared contract, API, and UI boundaries:

1. [`packages/types/src/contracts/onboarding.ts`](../../packages/types/src/contracts/onboarding.ts) defines `onboardingTrialEligibilityResponseSchema`.
2. [`onboarding.controller.ts`](../../apps/api/src/domains/clinics/presentation/controllers/onboarding.controller.ts) exposes `POST /api/v1/onboarding/:onboardingId/trial-eligibility` for the authenticated pre-clinic owner.
3. [`onboarding.service.ts`](../../apps/api/src/domains/clinics/application/services/onboarding/onboarding.service.ts) validates the onboarding session and evaluates prior subscriptions through `hasPriorSubscriptionForEmail`.
4. [`use-clinic-registration-flow.ts`](../../apps/app/src/features/setup/hooks/use-clinic-registration-flow.ts) skips checkout only when the response is eligible. Repeat customers continue into the same-tier Razorpay flow with explicit user-facing copy.
5. Final onboarding submission repeats the server-side prior-subscription check, so the early UI check is a usability improvement rather than the only enforcement point.

### 68.3 Standard rollout template

Use this sequence for newly required state:

1. **Expand**: add nullable/defaulted storage and code that understands old + new rows.
2. **Backfill**: populate derivable historical values with a migration or reviewed job.
3. **Prompt**: when user choice is required, show a targeted in-app prompt for that choice only.
4. **Enforce**: add application and, where appropriate, database invariants after compatibility is proven.
5. **Contract**: remove legacy branches only after audit evidence shows old states are gone.

Do not send an existing clinic user through the entire onboarding wizard to collect one new setting. Do not make a clean-install seed the only proof that an upgrade is safe.

### 68.4 Where this applies next

Apply the same pattern to consent changes, tier migrations, new required clinic settings, auth-routing changes, and enum/state-machine transitions. Add tests for both a new account and a pre-change clinic-associated account.

---

## 69. Edge BFF, CSP, and runtime split

There are three browser-facing runtimes with two related BFF implementations.

| Surface | Runtime | Same-origin API boundary | Additional responsibility |
| --- | --- | --- | --- |
| `apps/app` | Vite SPA | Hono proxy Worker (`api/index.ts`) → shared proxy helper | Security headers via `public/_headers` |
| `apps/internal` | Vite SPA | Hono proxy Worker (`api/index.ts`) → shared proxy helper | Headers, portal-route redirect handling |
| `apps/landing` | Astro | `pages/api/[...path].ts` local BFF | Public-flow proxy with separate cookie assumptions |

### 69.1 Why the proxy Worker matters

The Vite apps intentionally ship a Hono proxy Worker (`apps/<app>/api/index.ts`). In Cloudflare builds it detects `/api/v1/*` (and `/socket.io/*` upgrades) and calls `proxyUpstreamApiRequest`; in local development, the dev-server proxy provides equivalent routing. Security headers live in static `public/_headers`, so changing them requires a Cloudflare artifact build and route smoke.

### 69.2 What the shared proxy helper guarantees

[`upstream-api-proxy.ts`](../../packages/utils/src/http/upstream-api-proxy.ts) normalizes the target URL, strips hop-by-hop and upstream CORS response headers, rewrites cookie domains, and streams responses. Tests for this utility are the contract for clinician/internal proxy behavior.

### 69.3 Landing is similar, not identical

The Astro proxy strips hop-by-hop headers and streams the body, but it is a separate implementation. Consolidate only shared semantics that are truly common; public marketing flows should not accidentally inherit clinician-session assumptions.

---

## 70. Reliability mechanism selection guide

Use the smallest mechanism that closes the actual failure mode.

| Failure mode | Mechanism | Notes |
| --- | --- | --- |
| Concurrent requests violate an invariant | Database `UNIQUE`, `CHECK`, or `EXCLUDE` constraint | Add repository translation for a user-facing error (§9) |
| One request performs multiple database writes | `ITransactionRunner` | Keep external I/O outside the transaction |
| HTTP retry could duplicate a mutation | Idempotency key + unique ledger row | Return the stored result on replay |
| Async job may run twice | Queue job idempotency key + side-effect ledger | Assume at-least-once processing |
| Domain event must commit with aggregate mutation | Transactional outbox append | Relay after commit; listener retry policy still pending |
| UI needs fresh server data after a socket event | React Query invalidation | Do not maintain a second entity store in Zustand |
| External HTTP may hang | Bounded timeout + explicit retry/backoff where safe | Do not add a global circuit breaker without evidence |
| Multi-replica scheduler may overlap | `SKIP LOCKED`, idempotency, and eventually lease/advisory lock where required | In-process `running` flags only protect one process |

---

## 71. Additional patterns worth adding

These are recommendations, not claims about current implementation. Add them only where the described pressure exists.

| Priority | Pattern | Use when | First scoped slice |
| --- | --- | --- | --- |
| P0 | Outbox producer migration | A command mutation triggers side effects that must not disappear after commit | Repeat the Razorpay invoice-capture pattern for future durable fan-out and add crash-window tests |
| P0 | Required-setting rollout checklist | A release introduces new mandatory clinic/user state | Apply `docs/operations/REQUIRED_SETTING_ROLLOUT_CHECKLIST.md` and add old-account regression coverage |
| P1 | Canonical query-cache policy registry | More stale-time tables appear or cache behavior diverges | Extend `core/stale-time.ts` and its hot-prefix tests; do not add app-local tables |
| P1 | Proxy contract matrix | Edge changes repeatedly break cookies, CSRF, streaming, or `/api/v1` prefixes | Run the same method/header/cookie/binary cases against app, internal, and landing adapters |
| P1 | Generated schema navigation artifact | Direct model search becomes insufficient for schema review | Generate summaries from canonical `schema.prisma`; do not restore manual snapshots |
| P1 | Scheduler lease/advisory-lock helper | More than one worker replica runs the same cron and duplicate work is costly | Wrap the first non-idempotent scheduler; keep idempotency as backstop |
| P2 | Capability matrix beyond tier ladder | Packaging gains clinic-specific overrides or non-monotonic bundles | Evolve `FEATURE_TIER_MAP` without reintroducing numeric tier comparisons |
| P2 | WebSocket pub/sub adapter | Horizontal API replicas must broadcast socket events consistently | Introduce an adapter only after measuring missed cross-replica invalidations |
| P2 | OpenTelemetry trace propagation | Correlation IDs are insufficient for cross-process latency diagnosis | Start with API → queue → worker spans on one expensive workflow |
| P2 | API compatibility/deprecation policy | External clients or independently deployed consumers appear | Define additive `/v1` change rules and a removal window before a `/v2` exists |

---

## 72. Recommended adoption sequence

The highest-value next work is not a broad rewrite.

1. Define outbox listener retry semantics and add crash-window integration coverage beyond the migrated Razorpay invoice-capture producer.
2. Rehearse timestamptz repair, migration safety, and RLS effective-role behavior against a restored production-like database.
3. Classify generic stored-file signed-URL consumers and decide whether any PHI-bearing surface needs a shorter TTL or application-streamed download.
4. Extend the landing BFF contract matrix when edge behavior adds cookie, streaming, or binary-response requirements.
5. Require old-account regression tests for onboarding, auth, tier, and newly required settings.
6. Add scheduler leases, WebSocket pub/sub, tracing, or richer capability machinery only when production topology or measured failures justify them.

---

## 73. Reading order for a new contributor

If you're new to the repo and reading this document end to end is intimidating, here is the recommended sequence:

1. **AGENTS.md** — the normative spec. Skim once.
2. **[SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md)** — canonical data points (5 min).
3. **§1 (HLD), §2 (Backend LLD), §6 (Frontend)** — the shape of the thing.
4. **§3 (Patterns catalog)** — vocabulary you'll see in every file.
5. **§4 (Database), §52 (Schema in depth)** — the data the app is about.
6. **§7 (Auth), §30 (Prisma extensions), §41 (ALS context)** — the implicit machinery.
7. **§11 (Automation map), §11.1 (full check list)** — which scripts catch which mistakes.
8. **§44 (Vite route tree), §45 (Proxy), §46 (Packages)** — where new code goes.
9. **§58–§60** — client state, policies, outbox (common foot-guns).
10. **§13 (Pointers)** — the cheat-sheet to start writing.
11. **§28, §56, §65–§72 (Improvements / pending / adoption)** — context for why some things look the way they do.

Sections §14–§43 and §61–§64 are subsystem reference material — read them when you touch the relevant area.

---

*This document is descriptive and snapshots the codebase as it stands. When it disagrees with the code, the code wins; update the doc. When it disagrees with `AGENTS.md`, `AGENTS.md` wins.*

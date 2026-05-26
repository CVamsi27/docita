# System Design and Patterns

Authoritative design reference for the Docita monorepo. Covers the high-level architecture, low-level layering, design patterns in use with concrete file references, database design, API surface, frontend architecture (with attention to token handling, memoization, and render strategy), security posture (auth tokens, PDF signed URLs, PHI, audit), and performance measurement.

This document is descriptive — it explains what the codebase actually does today, with file:line citations so claims can be verified or fixed. For *prescriptive* rules (what new code MUST follow), see [`AGENTS.md`](../../AGENTS.md). For UI/UX rules, see [`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md).

---

## 1. System overview (HLD)

### 1.1 Apps

| App | Runtime | Role | Deploy target |
| --- | --- | --- | --- |
| `apps/api` | NestJS (Node ≥22) | Public HTTP API, controllers, business logic, Prisma writes | Fly.io (`fly.toml`) |
| `apps/worker` | NestJS | Background jobs: PDF generation, scheduled reminders, exports | Fly.io (`apps/worker/fly.toml`) |
| `apps/app` | Next.js (App Router) | Clinician web app | Cloudflare via OpenNext |
| `apps/internal` | Next.js (App Router) | Internal admin/dashboard | Cloudflare via OpenNext |
| `apps/landing` | Astro | Marketing site | Cloudflare Pages |

The two NestJS apps share most of `apps/api/src/shared/*` and the same Prisma client from `@workspace/db`. The frontend apps share `@workspace/ui` primitives, `@workspace/types` Zod schemas, and `@workspace/data-access` React Query hooks.

### 1.2 Request topology

```
Browser (apps/app or apps/internal)
   │
   │ same-origin fetch to /api/v1/* (Next route proxy)
   ▼
Cloudflare edge (OpenNext) → Next route handler
   │
   │ cross-region fetch to api.docita.work
   ▼
NestJS API (apps/api) on Fly.io
   │
   ├─► Prisma → Postgres (Render managed)
   ├─► R2 (Cloudflare) for blob storage
   ├─► EventEmitter2 → in-process listeners
   └─► Postgres-backed job queue ──► apps/worker
```

The browser never talks to `api.docita.work` directly (see AGENTS.md §4): all browser traffic goes same-origin through a Next route handler that proxies to the API. This keeps cookies, CORS, and CSRF stable.

### 1.3 Stack constraints

- Node ≥ 22.12.0, pnpm 10.30.3 only (workspace-wide, see [`package.json`](../../package.json)).
- Postgres is the single source of truth; Redis is optional and gated (`scripts/checks/check-cache-redis-required.mjs`).
- Zod schemas in `packages/types` are the single source of truth for both API DTOs (`nestjs-zod` `createZodDto`) and frontend forms (`zodResolver`). Type duplication is blocked by `scripts/checks/check-type-duplicates.mjs`.

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
- [`apps/api/src/domains/prescriptions/infrastructure/listeners/prescription-events.listener.ts`](../../apps/api/src/domains/prescriptions/infrastructure/listeners/prescription-events.listener.ts)
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
| `@ClinicType(...)` | [`clinic-type.decorator.ts`](../../apps/api/src/shared/modules/auth/auth/clinic-type.decorator.ts) | `ClinicTypeGuard` |
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
   ```54:65:apps/app/shared/lib/api/api-client.ts
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

---

## 4. Database design

### 4.1 Schema layout

Prisma's monolithic `schema.prisma` is split across topic files under [`packages/db/prisma/schema/`](../../packages/db/prisma/schema/):

| File | Domain |
| --- | --- |
| `core-domain-enums.prisma` | Cross-cutting enums (Role, AppointmentStatus, AppointmentPriority, ClinicTier, …) |
| `clinic-management-models.prisma` | `Clinic`, `ClinicWeeklySchedule`, `DoctorClinic`, `ClinicSettings` |
| `clinic-config-models.prisma` | `ClinicSettings` shapes, `ReminderSettings` |
| `patient-core-models.prisma` | `Patient`, `PatientPhone`, `EmergencyAccessLog`, `PatientAccessLog` |
| `provider-workforce-models.prisma` | `User` (incl. doctors), `Leave`, `DoctorSchedule`, `DoctorTimeOff` |
| `appointment-vitals-models.prisma` | `Appointment`, `VitalSign`, `QueueToken`, `Diagnosis` |
| `prescription-billing-models.prisma` | `Prescription`, `Invoice`, `Payment`, `InvoiceItem` |
| `subscription-growth-models.prisma` | `Subscription`, `SubscriptionPlan`, `SubscriptionPayment`, `UsageEvent` |
| `medical-coding-models.prisma` / `medical-history-enums.prisma` | ICD/CPT models, encounter coding |
| `communication-session-models.prisma` | `WhatsappLog`, `Session`-style auth ephemera |
| `operations-lab-models.prisma` | `LabTest`, inventory |
| `monitoring-import-models.prisma` | `ErrorLog`, `PdfJob`, audit/import staging |
| `auth-archive-models.prisma` | `RefreshToken`, archive tables (`AuditLogArchive`, `AppointmentArchive`, `WhatsappLogArchive`) |

### 4.2 Core models worth knowing

**Appointment** ([`appointment-vitals-models.prisma:1-71`](../../packages/db/prisma/schema/appointment-vitals-models.prisma)) carries the bulk of clinical data alongside scheduling. Key columns:

- `version Int @default(1)` — optimistic concurrency on updates.
- `status AppointmentStatus` — `SCHEDULED | CONFIRMED | RESCHEDULING | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW`.
- Domain-specific exam JSON columns (`dentalChart`, `ophthalmologyExam`, `cardiologyExam`, `gynecologyExam`, `dermatologyExam`, `psychiatryExam`, `growthData`) — parsed via Zod schemas in the mapper to keep typing honest.
- Indexes: `@@index([clinicId, status, startTime])` is the hot composite for calendar queries; per-doctor and per-patient indexes for filtered lookups.

**RefreshToken** ([`auth-archive-models.prisma:1-16`](../../packages/db/prisma/schema/auth-archive-models.prisma)) post-2026-05-24 hashing migration:
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

**Layer 4 — Postgres RLS (scaffolded, inert)**. The supporting machinery exists but `RLS_ENABLED=false` everywhere. Flipping the flag is an ops action gated on provisioning the `docita_app` role per [`docs/compliance/RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md):

- `RlsService` and SQL `tenant_isolation` policies — already wired but inert.
- [`check-rls-rollout-readiness.mjs`](../../scripts/checks/check-rls-rollout-readiness.mjs) — readiness gate.
- [`check-rls-bypass-annotation.mjs`](../../scripts/checks/check-rls-bypass-annotation.mjs) — every Prisma call that bypasses the tenant extension (and, post-flip, RLS) must be annotated.
- `prisma.runUnrestricted(fn)` — the controlled bypass used by auth resolution (before clinic context exists) and background workers. Every site is annotated `// RLS-BYPASS:` with a reason, e.g. [`pdf-job.service.ts:85`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts), [`auth-session.service.ts:57`](../../apps/api/src/shared/modules/auth/auth/auth-session.service.ts).

### 4.8 Archives

Long-retention but cold data (audit logs, old appointments, WhatsApp logs) move to `*Archive` tables under [`auth-archive-models.prisma`](../../packages/db/prisma/schema/auth-archive-models.prisma) via scheduled jobs in [`apps/api/src/shared/modules/compliance/data-retention.scheduler.ts`](../../apps/api/src/shared/modules/compliance/data-retention.scheduler.ts). The archive tables drop foreign keys (the archived row no longer needs to reference live records) and add `archivedAt`.

---

## 5. API design

### 5.1 Routing and base URL

All routes are mounted under `/api/v1/*`. The browser hits a same-origin Next route in `apps/app/app/api/**` which proxies to `api.docita.work/api/v1/*`. Telemetry endpoints (Sentry, web vitals) also use same-origin proxies — see [`apps/app/shared/lib/api/upstream-api-proxy.ts`](../../apps/app/shared/lib/api/upstream-api-proxy.ts).

### 5.2 Validation

Every request body, query, and param is parsed through a `createZodDto`-derived class. There are no hand-written `class-validator` decorators in new code. Response shapes are validated client-side via `client.validate(route, schema, ...)`.

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

All errors flow through the global filter ([`apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts`](../../apps/api/src/shared/modules/error-handling/filters/http-exception.filter.ts)). Prisma errors are mapped via [`prisma-error.registry.ts`](../../apps/api/src/shared/modules/error-handling/filters/prisma-error.registry.ts). The response shape is consistent: `{ statusCode, message, error, details? }` so clients can render user-facing strings without parsing free-form text.

### 5.7 Health checks

[`apps/api/src/shared/common/controllers/health-check.controller.ts`](../../apps/api/src/shared/common/controllers/health-check.controller.ts) exposes liveness/readiness probes. The readiness probe checks Prisma connectivity and (when configured) Redis.

---

## 6. Frontend design

### 6.1 Feature architecture

Each feature owns its surface inside `apps/app/features/<feature>/`:

```
features/appointments/
├── components/          # presentational + container components
├── hooks/               # use-* hooks combining data-access + local state
├── rules/               # business rules (with *.spec.ts colocated)
├── lib/                 # feature-local helpers
├── types/               # feature-local types (NOT shared types)
└── index.ts             # public surface; barrel export
```

Cross-feature imports are blocked by [`check-feature-boundaries.mjs`](../../scripts/checks/check-feature-boundaries.mjs). Shared code lives in `apps/app/shared/{components,hooks,lib}` (reached via `@/components`, `@/hooks`, `@/lib`) until ≥2 apps need it, at which point it promotes to `packages/*`.

### 6.2 Providers

[`apps/app/providers/`](../../apps/app/providers/) wires the React Query client, navigation, theme, and the data-access bridge:

- The data-access bridge (`data-access-bridge.tsx`) injects the session-aware fetcher into `@workspace/data-access` so domain hooks don't need to know about cookies or CSRF.

### 6.3 Data fetching: `@workspace/data-access` + React Query

The pattern is: domain hooks live in `packages/data-access/src/hooks/` (e.g. `useAppointments`, `usePatients`, `useBillingHistory`) and consume `useDataAccessContext()` for the fetcher, clinic id, and tier guard. App-level composition (auth, locale, toasts) lives in `apps/app/features/<feature>/hooks/`. The legacy `apps/app/shared/hooks/api/` directory is forbidden ([`check-legacy-app-api-hooks.mjs`](../../scripts/checks/check-legacy-app-api-hooks.mjs)).

Inline `fetch()` in features is blocked by [`check-frontend-fetch.mjs`](../../scripts/checks/check-frontend-fetch.mjs).

Stale/GC time configuration ([`apps/app/shared/lib/api/react-query-config.ts`](../../apps/app/shared/lib/api/react-query-config.ts)):

```1:27:apps/app/shared/lib/api/react-query-config.ts
export const QUERY_STALE_TIMES = {
  APPOINTMENT_QUEUE: 15 * 1000,
  CLINIC_QUEUE: 15 * 1000,
  IPD_CENSUS: 15 * 1000,
  IPD_BEDS: 15 * 1000,
  PAYMENT_STATUS: 10 * 1000,
  DASHBOARD: 30 * 1000,
  ANALYTICS: 30 * 1000,
  TODAY_APPOINTMENTS: 30 * 1000,
  PATIENT_LIST: 60 * 1000,
  APPOINTMENTS_LIST: 60 * 1000,
  INVOICES_LIST: 60 * 1000,
  PRESCRIPTIONS_LIST: 60 * 1000,
  CLINIC_SETTINGS: 5 * 60 * 1000,
  DOCTORS_LIST: 5 * 60 * 1000,
  REFERENCE_DATA: 5 * 60 * 1000,
  CURRENT_USER: 5 * 60 * 1000,
  USER_PERMISSIONS: 5 * 60 * 1000,
  USER_PREFERENCES: 5 * 60 * 1000,
} as const;
```

Stale time is intentionally **short** for queue/live-state data and **longer** (5min) for reference data. Refetch on window focus and on mount are off by default to avoid spurious load.

### 6.4 Tier and feature gating (frontend mirror of API)

The single source of truth is `FEATURE_TIER_MAP` in `packages/types`. Same map drives:

- Backend: `@RequireFeature(Feature.X)` and `assertClinicHasFeatureOrThrow(clinic, Feature.X)`.
- Frontend: `<FeatureGate feature={Feature.X}>...</FeatureGate>` ([`apps/app/shared/components/auth/feature-gate.tsx`](../../apps/app/shared/components/auth/feature-gate.tsx)) and `hasFeatureAccess(clinic, Feature.X)` ([`apps/app/shared/hooks/use-tier-access.ts`](../../apps/app/shared/hooks/use-tier-access.ts)).

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
- Server components are used in `apps/app/app/layout.tsx` and the root-level shells.
- Lazy-loading via `next/dynamic` for heavy panels (PDF viewer, charts, settings sub-pages). Dynamic-import budgets are checked by [`check-dynamic-import-budget.mjs`](../../scripts/checks/check-dynamic-import-budget.mjs).
- Suspense + error boundary pairs are enforced by [`check-suspense-error-boundary-pair.mjs`](../../scripts/checks/check-suspense-error-boundary-pair.mjs) — any Suspense boundary must have a sibling error boundary so the page never gets stuck.

### 6.7 Forms

React Hook Form + Zod resolver. Example pattern is repeated across `apps/app/features/onboarding/`, `apps/app/features/patients/`, `apps/app/features/appointments/`. The resolver schema is always the same Zod object that the API DTO uses, so form errors mirror server errors and there's no drift.

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

[`apps/app/shared/lib/auth/session.ts`](../../apps/app/shared/lib/auth/session.ts) creates a session manager keyed `docita_token` over the data-access factory:

```9:23:apps/app/shared/lib/auth/session.ts
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

- The **access token in `localStorage`** under `tokenStorageKey` (with in-memory mirror for performance):
  ```55:75:packages/data-access/src/lib/browser-session.ts
  const readPersistedToken = (): string | null => {
    if (!isBrowser()) return null;
    const persistedToken = localStorage.getItem(tokenStorageKey);
    return persistedToken && persistedToken.length > 0 ? persistedToken : null;
  };
  let inMemoryToken: string | null = readPersistedToken();
  // ...
  const syncTokenStorage = (token: string | null): void => {
    if (!isBrowser()) return;
    if (token) {
      localStorage.setItem(tokenStorageKey, token);
    } else {
      localStorage.removeItem(tokenStorageKey);
    }
  };
  ```
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

Request attach pattern ([`fetch-with-session.ts`](../../apps/app/shared/lib/auth/fetch-with-session.ts)):

```27:55:apps/app/shared/lib/auth/fetch-with-session.ts
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

### 7.5 CSRF (double-submit)

- Cookie `XSRF-TOKEN` (readable from JS) + header `X-XSRF-TOKEN` on every mutating method (POST/PUT/PATCH/DELETE).
- Names are imported from `@workspace/auth` (no string literals) — that's the contract.
- Server issues a fresh token via the `X-CSRF-Token` response header which the client captures into in-memory CSRF and keeps using until the next response refreshes it.

### 7.6 MFA (TOTP + hashed backup codes)

[`MfaService`](../../apps/api/src/shared/modules/auth/auth/mfa.service.ts) implements optional second-factor for staff accounts:

- **TOTP** via `otplib` (`generateSecret` / `verify`) with a QR code rendered by `qrcode`. The TOTP secret is **encrypted at rest** via `EncryptionService` before being stored on the user row.
- **Backup codes**: 10 single-use codes are generated with `nanoid`, **bcrypt-hashed** (`bcrypt.hash(code, 10)`) and stored as a JSON column validated by `mfaHashedBackupCodesSchema` from `@workspace/types`. The plaintext codes are returned to the user **once** at enrollment.
- Verifying a backup code at login does a bcrypt compare across the stored hashes and then **removes** the matched hash so the code cannot be reused.
- Disabling MFA requires a valid current TOTP code — there is no admin override path that skips verification.

### 7.7 Known posture observation (track-and-fix)

Storing the access JWT in `localStorage` exposes it to XSS exfiltration. The infrastructure to move to a cookie-only model is already in place — the API sets the access token as an `HttpOnly` cookie, and the same-origin proxy means cookies travel with every request via `credentials: include`. Removing the `localStorage` mirror plus the `Authorization: Bearer` header path is a follow-up that the JWT auth guard supports (the guard accepts both header and cookie via `jwt.strategy.ts`). Track this as security debt; do not regress further.

---

## 8. Security

### 8.1 PHI handling and audit

- **No PHI in app logs.** Operational logs include only counts/tenancy ids — see the comment in [`create-appointment.use-case.ts:62-72`](../../apps/api/src/domains/appointments/application/use-cases/create-appointment.use-case.ts). Patient ids, names, emails, phone numbers, diagnoses, notes are off-limits to general loggers. Enforced by [`check-sensitive-logging.mjs`](../../scripts/checks/check-sensitive-logging.mjs).
- **Audit trail** for sensitive writes via `PatientDataAuditInterceptor` (§2.2). Coverage enforced by [`check-audit-logging.mjs`](../../scripts/checks/check-audit-logging.mjs), [`check-audit-coverage.mjs`](../../scripts/checks/check-audit-coverage.mjs), [`check-phi-read-audit.mjs`](../../scripts/checks/check-phi-read-audit.mjs).
- **Emergency access** is recorded via [`apps/api/src/shared/common/interceptors/emergency-access.interceptor.ts`](../../apps/api/src/shared/common/interceptors/emergency-access.interceptor.ts) with break-glass justification.
- **Sentry PHI scrubbing** in the frontend ([`apps/app/shared/lib/monitoring/sentry-phi-redactor.ts`](../../apps/app/shared/lib/monitoring/sentry-phi-redactor.ts)) and equivalent on the backend ([`check-sentry-scrubbing.mjs`](../../scripts/checks/check-sentry-scrubbing.mjs)).

### 8.2 Encryption

- **Refresh tokens at rest**: SHA-256 hashed (§7.1).
- **Field-level encryption** for sensitive columns via `EncryptionService` ([`apps/api/src/shared/common/encryption.service.ts`](../../apps/api/src/shared/common/encryption.service.ts)) using `ENCRYPTION_KEY`. Coverage tracked by [`check-phi-encryption-coverage.mjs`](../../scripts/checks/check-phi-encryption-coverage.mjs).
- **Secrets rotation** procedure: [`docs/operations/SECRET_ROTATION_CHECKLIST.md`](../operations/SECRET_ROTATION_CHECKLIST.md).
- **Critical env vars** (per AGENTS.md §6): `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `ENCRYPTION_KEY` (64-char hex), `NEXT_PUBLIC_API_URL`. Process-env access patterns checked by [`check-process-env.mjs`](../../scripts/checks/check-process-env.mjs).

### 8.3 Webhook security

Covered in §5.5. The combination is:

1. Signature verification on every inbound webhook ([`check-webhook-signatures.mjs`](../../scripts/checks/check-webhook-signatures.mjs)).
2. Replay-dedupe table keyed on provider event id ([`webhook-replay-dedupe.repository.ts`](../../apps/api/src/shared/modules/webhooks/webhook-replay-dedupe.repository.ts), [`check-webhook-replay-protection.mjs`](../../scripts/checks/check-webhook-replay-protection.mjs)).
3. Idempotent application — `P2002` on the provider payment-id unique is treated as "already processed".

### 8.4 PDF security: signed URLs

This is the section the original question called out specifically.

**How a PDF is created and served**:

1. **Enqueue**: a write-side path (invoice paid, prescription signed) calls `pdfJobService.enqueue(documentId, documentType, clinicId)`. The job is persisted in `PdfJob`, keyed uniquely on `(clinicId, documentType, documentId)`. If a duplicate enqueue happens, `P2002` is caught and the existing job id is returned ([`pdf-job.service.ts:97-112`](../../apps/api/src/shared/modules/queue/pdf-job.service.ts)).
2. **Render**: the worker picks up the job, the renderer (template-method §3.8) produces a `Buffer`, and `storageProvider.uploadBuffer(buffer, objectKey, 'application/pdf')` writes it to R2 ([`r2-storage.provider.ts:153-171`](../../apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts)). The **`objectKey` is what gets persisted** in `Invoice.pdfUrl` / `Prescription.pdfUrl` — not a URL.
3. **Serve**: when a client asks for the PDF URL, the query service calls `storageProvider.generateSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS)`:
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
- **PHI PDFs (invoices, prescriptions)**: `PDF_SIGNED_URL_TTL_SECONDS = 15 * 60` (**15 minutes**) — declared **once** in the port file alongside the bounds, imported by [`invoices-helpers.ts`](../../apps/api/src/domains/billing/application/services/invoices-helpers.ts) (re-export for backward compat), [`invoices-query.service.ts`](../../apps/api/src/domains/billing/application/services/invoices-query.service.ts), [`invoice-pdf.processor.ts`](../../apps/api/src/domains/billing/application/services/invoice-pdf.processor.ts), [`prescription-pdf-orchestrator.service.ts`](../../apps/api/src/domains/prescriptions/application/services/prescription-pdf-orchestrator.service.ts), and [`prescription-pdf.processor.ts`](../../apps/api/src/domains/prescriptions/application/services/prescription-pdf.processor.ts). Pinned by a regression test at [`storage-provider.spec.ts`](../../apps/api/src/domains/documents/infrastructure/storage-provider.spec.ts).
- **Generic stored files** (clinic logos, doctor signatures, uploaded attachments): `SIGNED_URL_TTL_SECONDS = 4 * 60 * 60` (**4 hours**) in [`stored-file-url-resolver.service.ts:10`](../../apps/api/src/domains/documents/application/services/stored-file-url-resolver.service.ts). The longer TTL is acceptable because these assets do not contain PHI.

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

- Object keys are random (`nanoid()` suffix) and never exposed without a signature.
- Presigned URLs are time-limited and signed against the R2 account credentials.
- The endpoint that issues the URL is itself behind auth and tier guards (`@RequireFeature(Feature.INVOICING)` on `GET /invoices/:id/pdf`, see [`invoices.controller.ts`](../../apps/api/src/domains/billing/presentation/controllers/invoices.controller.ts)) — the caller must be authorized for the underlying invoice/prescription record, which is tenant-filtered (`clinicId`) inside the query service before the URL is generated.
- **Every URL issuance writes a `PatientAccessLog` row** via `logPatientPhiRead(auditService, req, invoice.patientId, 'VIEW_PROFILE')` *before* the URL is returned — so the trail "user X retrieved invoice Y for patient Z at time T" is captured even if the user never opens the URL.
- TTL is clamped server-side; a client cannot ask for a 7-day URL.
- **`Cache-Control: no-store`** is set on every PDF response (`GET /invoices/:id/pdf`, `GET /prescriptions/:id/pdf`) before any branch — covering the URL JSON, the raw PDF bytes, and the async-job acknowledgement. Stops intermediary proxies and browser disk cache from retaining either the signed URL or the document itself.

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
6. Postgres RLS scaffolded and ready to enable — see §4.7, Layer 4.

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

The frontend collects LCP, FID/INP, CLS, TTFB via a same-origin proxy in `apps/app/app/api/web-vitals/route.ts` (and equivalent for `apps/internal`). The browser POSTs there; the route forwards to the API. This is required by the AGENTS.md §4 rule that browsers may not POST cross-origin to `api.docita.work`.

Failure mode: vitals telemetry must be non-blocking and must not produce console noise. The proxy swallows errors silently and uses `keepalive: true` so it survives page unload.

### 10.3 Backend latency and slow queries

- Every request carries an `x-correlation-id` propagated through `AsyncLocalStorage` (§2.2), allowing log correlation across services and `@OnEvent` listeners.
- Sentry tags every captured exception with the correlation id ([`request-context.interceptor.ts:46-54`](../../apps/api/src/shared/common/interceptors/request-context.interceptor.ts)).
- DB profile scripts: `db:profile-queries`, `db:check-query-plans`, `db:analyze-indexes`. Run before merging hot-path changes per AGENTS.md §10.
- N+1 detection script: [`check-n-plus-1.mjs`](../../scripts/checks/check-n-plus-1.mjs).
- External HTTP timeouts: every outbound fetch must use `fetchWithTimeout` ([`apps/api/src/shared/common/http/fetch-with-timeout.ts`](../../apps/api/src/shared/common/http/fetch-with-timeout.ts)), enforced by [`check-external-http-timeouts.mjs`](../../scripts/checks/check-external-http-timeouts.mjs).

### 10.4 Caching

- React Query owns the client cache (§6.3). Stale times are intentional and per-data-type, not a global default.
- A backend cache module (`apps/api/src/shared/modules/cache/`) wraps an optional Redis. `check-cache-redis-required.mjs` flags any code path that assumes Redis is present without a fallback.
- Cloudflare edge caching is **not** used for authenticated routes — they're marked dynamic. Static assets and the marketing site use long cache TTLs by default.

### 10.5 Bundle and code-splitting controls

- [`check-dynamic-import-budget.mjs`](../../scripts/checks/check-dynamic-import-budget.mjs) — limits the number of dynamic imports per route to keep the chunk graph predictable.
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
| Audit / PHI | `check-audit-logging.mjs`, `check-audit-coverage.mjs`, `check-phi-read-audit.mjs`, `check-phi-encryption-coverage.mjs`, `check-sensitive-logging.mjs` |
| Webhooks | `check-webhook-signatures.mjs`, `check-webhook-replay-protection.mjs` |
| Idempotency | `check-job-idempotency.mjs` |
| Errors | `check-user-facing-errors.mjs`, `check-empty-catches.mjs`, `check-error-tsx-coverage.mjs` |
| Migrations | `check-migration-prefix-collision.mjs`, `check-migration-reversibility.mjs`, `check-multi-write-transaction.mjs` |
| Externals | `check-external-sdk-in-application.mjs`, `check-external-http-timeouts.mjs`, `check-razorpay-adapters.mjs` |
| Sentry / monitoring | `check-sentry-scrubbing.mjs`, `check-no-console-runtime.mjs` |
| Typing discipline | `check-as-cast-density.mjs`, `check-non-null-assertion.mjs`, `check-deep-optional-chain.mjs` |
| Dates | `check-new-date-in-domain-infrastructure.mjs` (must use `IClock`) |
| Cache | `check-ad-hoc-service-cache.mjs`, `check-cache-redis-required.mjs` |
| Workers | `check-worker-size.mjs`, `check-detached-promises.mjs`, `check-cron-schedules.mjs`, `check-promise-all-in-schedulers.mjs` |
| Hygiene | `check-hygiene` (= `scripts/workflow/check-repo-hygiene.mjs`), `check-filename-case.mjs`, `check-process-env.mjs`, `check-native-button-types.mjs` |
| Pipelines | `check-pdf-pipeline.mjs`, `check-upload-validation.mjs`, `check-deployment-contracts.mjs`, `check-suspense-error-boundary-pair.mjs` |
| Size / structure (advisory) | `check-file-size-budget.mjs`, `check-dynamic-import-budget.mjs`, `check-module-scope-config.mjs`, `check-repo-on-module-init-cache.mjs` |
| Tests | `check-domain-rules-tests.mjs`, `check-feature-test-density.mjs`, `check-e2e-nav-routes.mjs` |

**Bundle**: `pnpm verify:standard` runs the production guardrail set. Run before push when touching architecture, auth, data access, or large feature surfaces.

---

## 12. Open posture observations and roadmap

These are not bugs — they're tracked technical debt items worth knowing about when designing new work.

1. **Access token in `localStorage`** (§7.7). Move to cookie-only path. The API already sets the `HttpOnly` cookie; the guard reads either source.
2. **RLS rollout incomplete** (§4.7). Application-layer scoping is comprehensive; DB-layer RLS is the next defense.
3. **Exclusion constraint scope** is `(clinicId, doctorId)` (§9.2). The stricter `(doctorId)` scope (doctor can be in one place period) requires auditing existing data first.
4. **Legacy refresh tokens** (§7.1) still exist in the unhashed `token` column. New writes are hashed; legacy rows cycle out at refresh/revocation/expiry. After 30 days post-2026-05-24 the fallback lookup can be removed.
5. **PDF download endpoint authentication**: the signed URL is the capability. Today there is no additional binding to the requesting user — anyone with the URL within the TTL can fetch the PDF. For higher-sensitivity documents, consider issuing single-use signed URLs or signing the URL request with the user's session.
6. **Same-origin telemetry** must be preserved when routes move; the AGENTS.md rule is enforced manually for now (no `check-cross-origin-telemetry` script). If browser POSTs to `api.docita.work` regress, console noise and CORS failures return.

---

## 13. Pointers for new contributors

- New feature: start with the Zod schema in `packages/types`, then API DTO + domain, then `packages/data-access` hook, then `apps/app/features/<feature>/`. See AGENTS.md §9.1.
- New DB column: schema first, migration, then update mappers and Zod schemas. Run `pnpm db:generate`. See AGENTS.md §9.2.
- New write race? Use the pattern in §9.
- New external provider? Strategy/adapter pattern (§3.5). Don't import the SDK outside `infrastructure/adapters/<provider>/`.
- New webhook? Signature → replay-dedupe → idempotent application (§5.5).
- New PDF? Use the template-method base (§3.8). Store `objectKey`, not URL. Serve via `generateSignedUrl` (§8.4).
- New page? `AppPageScaffold → PageHeader → DataState → Content`. Read [`docs/ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) before writing UI.

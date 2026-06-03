# Complete Implementation Guide

This document covers all 30+ gap fixes applied across three rounds to the Docita codebase. Each section includes the problem, the fix, exact file paths, and verification steps.

---

## Table of Contents

1. [Appointment Double-Booking Prevention](#1-appointment-double-booking-prevention)
2. [Inventory Race Condition (TOCTOU)](#2-inventory-race-condition-toctou)
3. [Webhook Replay Dedupe Race](#3-webhook-replay-dedupe-race)
4. [Cross-Pod Cron Coordination (Advisory Lock)](#4-cross-pod-cron-coordination-advisory-lock)
5. [Business Metrics (Prometheus)](#5-business-metrics-prometheus)
6. [Backup Health Monitoring](#6-backup-health-monitoring)
7. [Cron Backlog Detection](#7-cron-backlog-detection)
8. [Fuzzy Search (pg_trgm)](#8-fuzzy-search-pg_trgm)
9. [Search Relevance Tuning](#9-search-relevance-tuning)
10. [Search Strategy Updates](#10-search-strategy-updates)
11. [Prisma Transient Error Retry](#11-prisma-transient-error-retry)
12. [Cache Stampede Protection](#12-cache-stampede-protection)
13. [XSS Sanitization](#13-xss-sanitization)
14. [Feature Flag Audit Trail](#14-feature-flag-audit-trail)
15. [Entity Test Factories](#15-entity-test-factories)
16. [Circuit Breaker for External APIs](#16-circuit-breaker-for-external-apis)
17. [Encryption at Rest Expansion](#17-encryption-at-rest-expansion)
18. [Outgoing Webhook Delivery Framework](#18-outgoing-webhook-delivery-framework)
19. [Integration Test Database](#19-integration-test-database)
20. [Zero-Downtime Migration Enforcement](#20-zero-downtime-migration-enforcement)
21. [Container Image Scanning](#21-container-image-scanning)
22. [Cache Invalidation Bus](#22-cache-invalidation-bus)
23. [Worker Graceful Shutdown](#23-worker-graceful-shutdown)
24. [Silent Error Handling Fixes](#24-silent-error-handling-fixes)
25. [Missing Database Indexes](#25-missing-database-indexes)
26. [Safe Temp File Cleanup Utility](#26-safe-temp-file-cleanup-utility)
27. [Prisma Boundary Refactor (Domain Services)](#27-prisma-boundary-refactor-domain-services)

---

## 1. Appointment Double-Booking Prevention

### Problem
Two race conditions in appointment booking:
- `RESCHEDULING` status was missing from the Postgres exclusion constraint's `WHERE` clause, creating a race window
- Slot generator (read-side) considered `COMPLETED` appointments as blocking, but the write-side allowed booking over them — inconsistency

### Fix

#### 1a. Add RESCHEDULING to Exclusion Constraint

**New migration file:** `packages/db/prisma/migrations/20260603000000_fix_appointment_overlap_exclusion_include_rescheduling/migration.sql`

```sql
ALTER TABLE "Appointment"
DROP CONSTRAINT IF EXISTS "Appointment_no_active_overlap";

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tsrange("startTime", "endTime") WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULING'));
```

**Steps to deploy:**
```bash
cd packages/db
pnpm run db:migrate:safe
```

#### 1b. Fix COMPLETED Inconsistency

**File:** `apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-read.repository.ts`

**Change (lines 252-258):** Add `PrismaAppointmentStatus.COMPLETED` to the `notIn` filter in `findAppointmentsForSlots()`:

```typescript
status: {
  notIn: [
    PrismaAppointmentStatus.CANCELLED,
    PrismaAppointmentStatus.COMPLETED,    // <-- added
    PrismaAppointmentStatus.NO_SHOW,
  ],
},
```

**Verification:** The slot generator now aligns with the write-side overlap check — both ignore COMPLETED appointments.

---

## 2. Inventory Race Condition (TOCTOU)

### Problem
`InventoryCommandService.addMovement()` read `quantity` in one Prisma query (line 109), then called `addMovementAndUpdateQuantity()` in a separate call (line 129). Between these two, another concurrent request could change the quantity, leading to negative stock.

### Fix

**File:** `apps/api/src/domains/inventory/infrastructure/repositories/prisma-inventory.repository.ts`

**Change in `addMovementAndUpdateQuantity()` (lines 172-196):**

```typescript
async addMovementAndUpdateQuantity(...): Promise<InventoryMovement> {
  return this.prisma.$transaction(async (tx) => {
    const where: Prisma.InventoryItemWhereInput = { id: itemId, clinicId };

    // For outbound movements, enforce non-negative stock atomically
    if (quantityDelta < 0) {
      where.quantity = { gte: Math.abs(quantityDelta) };
    }

    const updateResult = await tx.inventoryItem.updateMany({
      where,
      data: { quantity: { increment: quantityDelta } },
    });

    if (updateResult.count === 0) {
      const existing = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        select: { quantity: true },
      });
      if (!existing) {
        throw new NotFoundException(`Inventory item ${itemId} not found`);
      }
      throw new BadRequestException(
        `Insufficient stock: requested ${Math.abs(quantityDelta)} but only ${existing.quantity} available`,
      );
    }

    return tx.inventoryMovement.create({ ... });
  });
}
```

**File:** `apps/api/src/domains/inventory/application/services/inventory-command.service.ts`

Remove the redundant `findItemByClinic()` read from `addMovement()` (lines 109-113 deleted) — the repository handles existence + stock checking atomically now.

**Verification:** Two concurrent OUT -8 movements on stock of 10: first succeeds (→2), second throws `BadRequestException` "Insufficient stock".

---

## 3. Webhook Replay Dedupe Race

### Problem
`WebhookReplayDedupeRepository.tryClaim()` had a delete-recreate cycle for expired entries. Two concurrent requests could both find the same expired entry, both delete it, and both recreate — both returning `true` for the same dedupe key.

### Fix

**File:** `apps/api/src/shared/modules/webhooks/webhook-replay-dedupe.repository.ts`

Replace the buggy delete-recreate with a safe pattern:

```typescript
async tryClaim(dedupeKeyHash: string, expiresAt: Date): Promise<boolean> {
  const now = this.clock.now();

  // Idempotent cleanup of expired entries — safe if row doesn't exist
  await this.prisma.webhookReplayDedupe.deleteMany({
    where: { dedupeKeyHash, expiresAt: { lte: now } },
  });

  try {
    await this.prisma.webhookReplayDedupe.create({
      data: { dedupeKeyHash, expiresAt },
    });
    return true;  // Successfully claimed
  } catch (error) {
    if (!isPrismaUniqueViolation(error)) throw error;
    return false;  // Another request already claimed it
  }
}
```

**Verification:** Concurrent requests with the same dedupe key — exactly one returns `true`, all others return `false`.

---

## 4. Cross-Pod Cron Coordination (Advisory Lock)

### Problem
With multiple worker replicas, every pod fires every cron tick. No leader election — duplicated work on every tick.

### Fix

#### 4a. Create Advisory Lock Utility

**New file:** `apps/api/src/shared/common/utils/postgres-advisory-lock.ts`

```typescript
import { PrismaService } from '@/prisma/prisma.service';

export async function withAdvisoryLock<T>(
  prisma: PrismaService,
  lockName: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const id = hashLockName(lockName);
  return prisma.$transaction(async (tx) => {
    const [result] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${id}) AS acquired
    `;
    if (!result?.acquired) return null;
    return fn();
  });
}
```

Uses `pg_try_advisory_xact_lock` — transaction-scoped, automatically released on commit/rollback. Safe in pooled environments.

#### 4b. Apply to Outbox Relay

**File:** `apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts`

Wrap the drain logic:

```typescript
const acquired = await withAdvisoryLock(
  this.prisma,
  'outbox-relay-drain',
  async () => {
    // ... existing drain logic ...
  },
);

if (acquired === null) {
  this.logger.warn('[outbox-relay] skipping tick — another replica holds the lock');
}
```

**Steps to deploy:** No migration needed — uses Postgres built-in advisory lock functions.

**Verification:** Deploy with 2+ worker replicas. Only one replica processes each outbox relay tick.

---

## 5. Business Metrics (Prometheus)

### Problem
No domain-specific Prometheus metrics for tracking business operations (appointments, patients, invoices, etc.).

### Fix

**New file:** `apps/api/src/shared/modules/monitoring/monitoring/services/business-metrics.service.ts`

Creates 11 Prometheus metrics:

| Metric | Type | Labels |
|--------|------|--------|
| `business_appointments_created_total` | Counter | clinic_id, type |
| `business_appointments_completed_total` | Counter | clinic_id, doctor_id |
| `business_appointments_cancelled_total` | Counter | clinic_id, reason |
| `business_patients_registered_total` | Counter | clinic_id |
| `business_prescriptions_issued_total` | Counter | clinic_id, doctor_id |
| `business_invoices_generated_total` | Counter | clinic_id, status |
| `business_invoices_paid_total` | Counter | clinic_id, payment_method |
| `business_whatsapp_messages_sent_total` | Counter | clinic_id, message_type |
| `business_medication_doses_logged_total` | Counter | clinic_id |
| `business_api_calls_total` | Counter | clinic_id, method, status_group |
| `business_queue_depth` | Histogram | queue_name |
| `business_appointment_duration_minutes` | Histogram | clinic_id |

**Registration:** Added to `MonitoringModule` providers and exports.

**Verification:** `curl http://localhost:3001/metrics | grep business_`

---

## 6. Backup Health Monitoring

### Problem
`DatabaseBackupService` had no observability — no way to alert if backups stopped working.

### Fix

**File:** `apps/api/src/shared/modules/database/database-backup.service.ts`

Added three Prometheus metrics:
- `db_backup_last_success_timestamp` (Gauge) — unix timestamp of last successful backup
- `db_backup_last_size_bytes` (Gauge) — file size of last backup
- `db_backup_duration_seconds` (Histogram) — backup duration distribution

Recorded in `createFullBackup()` on success.

**Verification:** After a backup runs, check `curl http://localhost:3001/metrics | grep db_backup`.

---

## 7. Cron Backlog Detection

### Problem
No way to detect if a cron job missed its scheduled tick. Heartbeat recorded success/failure but no staleness metric.

### Fix

**File:** `apps/api/src/shared/modules/schedule/cron-heartbeat.ts`

Added:
1. `cron_heartbeat_staleness_seconds` Gauge with `job_name` and `status` labels — set to 0 on each heartbeat
2. `getStaleJobs(thresholdSeconds)` method — queries for heartbeats older than threshold

**Verification:** A failing cron job will show `cron_heartbeat_staleness_seconds{job_name="...", status="FAILURE"} 0` but its value won't increase as time passes (the gauge is set to 0 on each tick). For comprehensive staleness detection, use `getStaleJobs()`.

---

## 8. Fuzzy Search (pg_trgm)

### Problem
Full-text search used `plainto_tsquery('english')` — no typo tolerance. "Jhon" would not match "John". No support for Indian-language names.

### Fix

#### 8a. Create Migration

**New migration:** `packages/db/prisma/migrations/20260603010000_add_pg_trgm_fuzzy_search/migration.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Patient_firstName_trgm_idx"
  ON "Patient" USING gin ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Patient_lastName_trgm_idx"
  ON "Patient" USING gin ("lastName" gin_trgm_ops);

-- Combined name trigram index for "firstname lastname" search
CREATE INDEX IF NOT EXISTS "Patient_fullName_trgm_idx"
  ON "Patient" USING gin (
    coalesce("firstName", '') || ' ' || coalesce("lastName", '') gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS "Patient_phoneNumber_trgm_idx"
  ON "Patient" USING gin ("phoneNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Patient_mrn_trgm_idx"
  ON "Patient" USING gin ("mrn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Appointment_notes_trgm_idx"
  ON "Appointment" USING gin ("notes" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Appointment_chiefComplaint_trgm_idx"
  ON "Appointment" USING gin ("chiefComplaint" gin_trgm_ops);
```

#### 8b. Add Fuzzy Search Methods

**File:** `apps/api/src/shared/modules/search/ports/search-query.repository.port.ts`

Add `searchPatientsFuzzy()` and `searchAppointmentsFuzzy()` to the interface.

**File:** `apps/api/src/shared/modules/search/infrastructure/prisma-search-query.repository.ts`

Implement fuzzy search using `similarity()` with `SIMILARITY_THRESHOLD = 0.2`:

```typescript
async searchPatientsFuzzy(...): Promise<PatientFullTextSearchHit[]> {
  return this.prisma.$queryRaw`
    SELECT p.id, p."firstName", p."lastName", ...,
      GREATEST(
        similarity(p."firstName", ${query}),
        similarity(p."lastName", ${query}),
        similarity(coalesce(p."firstName",'') || ' ' || coalesce(p."lastName",''), ${query})
      ) AS rank
    FROM "Patient" p
    WHERE p."clinicId" = ${clinicId}
      AND (similarity(p."firstName", ${query}) > ${SIMILARITY_THRESHOLD}
        OR similarity(p."lastName", ${query}) > ${SIMILARITY_THRESHOLD}
        OR ...)
    ORDER BY rank DESC
    LIMIT ${Math.min(limit, 100)}
  `;
}
```

**Steps to deploy:**
```bash
cd packages/db
pnpm run db:migrate:safe
```

**Verification:** Search "Jhon" returns patients named "John".

---

## 9. Search Relevance Tuning

### Problem
FTS queries used default `ts_rank` weights (no normalization), making relevance scores less accurate.

### Fix

**File:** `apps/api/src/shared/modules/search/infrastructure/prisma-search-query.repository.ts`

Changed `ts_rank(col, query)` to `ts_rank(col, query, 32)` — the 32 flag applies document length normalization, so shorter matches rank higher.

```sql
ts_rank(p.search_tsvector, plainto_tsquery('english', ${query}), 32) AS rank
```

---

## 10. Search Strategy Updates

### Problem
Search strategies used ILIKE fallback (no ranking, no typo tolerance). Full-text search and fuzzy search were not combined.

### Fix

**File:** `apps/api/src/shared/modules/search/strategies/patient-search.strategy.ts`
**File:** `apps/api/src/shared/modules/search/strategies/appointment-search.strategy.ts`

Both strategies now:
1. Run FTS and fuzzy search in parallel via `Promise.all`
2. De-duplicate results by ID (FTS results first)
3. Fuzzy results scored at 0.5x for relevance ranking
4. Fallback (`searchFallback`) uses trigram fuzzy search instead of ILIKE

---

## 11. Prisma Transient Error Retry

### Problem
Transient Prisma errors (P1000 auth failed, P1001 can't reach DB, P2028 transaction timeout) caused 500 errors with no retry. The retry utility existed but was only used in `auth-session.service.ts`.

### Fix

**New file:** `apps/api/src/shared/common/interceptors/prisma-retry.interceptor.ts`

```typescript
@Injectable()
export class PrismaRetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      retryWhen((errors) =>
        errors.pipe(
          tap((error) => {
            if (!this.isTransientPrismaError(error)) throw error;
          }),
          delay((attempt) => Math.min(100 * Math.pow(2, attempt), 2000)),
          take(3),
        ),
      ),
    );
  }
}
```

**Registration:** Added to `app.module.ts` providers as `APP_INTERCEPTOR`.

```typescript
import { PrismaRetryInterceptor } from './shared/common/interceptors/prisma-retry.interceptor';

// In providers array:
{
  provide: APP_INTERCEPTOR,
  useClass: PrismaRetryInterceptor,
},
```

**Verification:** Simulate a P2028 error — the request is retried up to 3 times with 100ms/200ms/400ms delays before failing.

---

## 12. Cache Stampede Protection

### Problem
Under high concurrency, when a cached value expires, multiple requests could all recompute the same expensive query simultaneously (cache stampede).

### Fix

**File:** `apps/api/src/shared/modules/cache/in-memory-cache.service.ts`

Added XFetch (probabilistic early expiration):

```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  recomputeAt?: number;  // XFetch: early recomputation time
}
```

On `set()`, compute `recomputeAt = expiresAt - |ln(random())| * beta * ttl * 1000`.
On `get()`, if `recomputeAt < now < expiresAt`, delete the entry — the next request recomputes.

The probability of early recomputation increases as the entry approaches its TTL. At high concurrency, only a fraction of requests trigger recomputation (the ones past `recomputeAt`), while the rest get the cached value.

---

## 13. XSS Sanitization

### Problem
No input sanitization for string fields — Zod catches type/shape errors but not XSS vectors.

### Fix

**New file:** `apps/api/src/shared/common/utils/sanitize.ts`

```typescript
export function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')                    // Strip HTML tags
    .replace(/\bon\w+\s*=\s*['"]?[^'"\s]+['"]?/gi, '')  // Strip JS event handlers
    .replace(/javascript\s*:/gi, '');            // Strip javascript: URLs
}

export function sanitizeInput<T>(value: T): T {
  if (typeof value === 'string') return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeInput) as T;
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeInput(val);
    }
    return sanitized as T;
  }
  return value;
}
```

**Usage:** Call `sanitizeInput(req.body)` in controllers or apply as an interceptor/Pipe.

---

## 14. Feature Flag Audit Trail

### Problem
Feature flag changes (who toggled what, when) were not logged — no audit trail.

### Fix

**File:** `apps/api/src/shared/modules/feature-flags/feature-flags.service.ts`

Added `EventEmitter2` injection and audit events:

```typescript
this.events.emit('feature-flag.changed', {
  key: stored.key,
  defaultEnabled: stored.defaultEnabled,
  percentageRollout: stored.percentageRollout,
  clinicOverridesCount: ...,
  userOverridesCount: ...,
  timestamp: new Date().toISOString(),
});
```

Events emitted from both `upsert()` and `kill()`.

---

## 15. Entity Test Factories

### Problem
Test fixtures duplicated across spec files — no centralized `TestFactory` or `FixtureBuilder` pattern.

### Fix

**New file:** `apps/api/src/test-utils/factories.ts`

Provides 6 factory functions using `@faker-js/faker`:

| Factory | Sensible defaults | Override support |
|---------|------------------|------------------|
| `createMockPatient()` | Random name, phone, email, MRN, DOB | Full override |
| `createMockDoctor()` | Random name, email, role=DOCTOR | Full override |
| `createMockAppointment()` | Future start/end, status=SCHEDULED | Full override |
| `createMockInvoice()` | Random subtotal, 18% tax, status=PENDING | Full override |
| `createMockInventoryItem()` | Random product, category, quantity | Full override |

**Usage in tests:**
```typescript
import { createMockPatient } from '@/test-utils/factories';

const patient = createMockPatient({ clinicId: 'test-clinic-1' });
```

---

## 16. Circuit Breaker for External APIs

### Problem
No circuit breaker pattern anywhere — external API failures (WhatsApp, Razorpay, ZeptoMail, OpenAI) could cascade.

### Fix

#### 16a. Create Circuit Breaker

**New file:** `apps/api/src/shared/common/utils/circuit-breaker.ts`

Three-state machine (CLOSED → OPEN → HALF_OPEN → CLOSED) with:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `failureThreshold` | 5 | Consecutive failures to open the circuit |
| `successThreshold` | 2 | Consecutive successes in HALF_OPEN to close |
| `timeoutMs` | 30000 | Time before transitioning OPEN → HALF_OPEN |

Prometheus metrics per breaker instance:
- `cb_state_{name}` — 0=CLOSED, 1=HALF_OPEN, 2=OPEN
- `cb_failures_total_{name}` — total failures
- `cb_successes_total_{name}` — total successes
- `cb_rejections_total_{name}` — requests rejected when OPEN

#### 16b. Create Registry

**New file:** `apps/api/src/shared/common/utils/circuit-breaker.registry.ts`

Named breakers with per-integration config:

```typescript
const DEFAULT_BREAKER_CONFIGS = {
  'whatsapp-meta-api': { failureThreshold: 5, timeoutMs: 30_000 },
  'razorpay-api':      { failureThreshold: 5, timeoutMs: 30_000 },
  'zeptomail-api':     { failureThreshold: 5, timeoutMs: 30_000 },
  'openai-api':        { failureThreshold: 5, timeoutMs: 30_000 },
  'nlm-coding-api':    { failureThreshold: 5, timeoutMs: 30_000 },
  'turnstile-api':     { failureThreshold: 5, timeoutMs: 30_000 },
  'ops-alert-webhook': { failureThreshold: 3, timeoutMs: 10_000 },
};
```

#### 16c. Wire to Integrations

**WhatsApp:** `apps/api/src/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter.ts`
- Inject `@Optional() CircuitBreakerRegistry`
- Wrap `callApi()` with `breaker.call(execute, fallback)`

**Razorpay:** `apps/api/src/domains/payments/infrastructure/adapters/razorpay/razorpay.adapter.ts`
- Inject `@Optional() CircuitBreakerRegistry`
- Wrap `withRazorpayTimeout()` with `breaker.call(execute)`
- All 6 sub-adapters inherit via `BaseRazorpayAdapter`

**ZeptoMail:** `apps/api/src/shared/modules/messaging/email/providers/zeptomail-email.provider.ts`
- Inject `@Optional() CircuitBreakerRegistry`
- Wrap API call with `breaker.call(execute, fallbackResponse)`

**Registration:** `CircuitBreakerRegistry` added to `CommonServicesModule` providers.

---

## 17. Encryption at Rest Expansion

### Problem
Only 7 of ~20 PHI-touching fields were encrypted at rest. `preferredName`, `insuranceProvider`, `insurancePolicyNumber`, `insuranceGroupNumber`, `allergies`, and `abhaAddress` were stored in plaintext.

### Fix

**File:** `apps/api/src/shared/common/encryption-patient-fields.boundary.ts`

Added 6 new fields to the `mapPatientRecordFields` array:

```typescript
const fields = [
  'email', 'phoneNumber', 'address',
  'emergencyContactPhone', 'emergencyContactName',
  'firstName', 'lastName',
  'preferredName',                    // NEW
  'insuranceProvider',                // NEW
  'insurancePolicyNumber',            // NEW
  'insuranceGroupNumber',             // NEW
  'allergies',                        // NEW
  'abhaAddress',                      // NEW
];
```

**File:** `apps/api/src/shared/common/extensions/encryption.extension.ts`

Added 6 new `result` computed field decryptors in the Prisma extension — one per new field, all with null checks.

**File:** `apps/api/src/shared/modules/observability/phi-redactor.ts`

Added new field names to the `PHI_FIELD_NAMES` set: `preferredname`, `insuranceprovider`, `insurancepolicynumber`, `insurancegroupnumber`, `abhaaddress`, `abha`, `allergies`, `medicalhistory`, `race`, `ethnicity`.

**Verification:** Write a patient with insurance data — the DB column shows ciphertext. Read the patient — fields are transparently decrypted.

---

## 18. Outgoing Webhook Delivery Framework

### Problem
No outgoing webhook delivery system — third-party integrations requiring webhook callbacks had no standardized mechanism.

### Fix

#### 18a. Prisma Models

**File:** `packages/db/prisma/schema.prisma`

Added two models:

```prisma
model WebhookSubscription {
  id             String   @id @default(cuid())
  clinicId       String
  eventName      String
  targetUrl      String
  signingSecret  String
  active         Boolean  @default(true)
  description    String?
  @@unique([clinicId, eventName, targetUrl])
}

enum WebhookDeliveryStatus { PENDING, IN_FLIGHT, DELIVERED, FAILED, DEAD_LETTERED }

model OutgoingWebhookDelivery {
  id              String                @id @default(cuid())
  subscriptionId  String
  clinicId        String
  eventName       String
  targetUrl       String
  payload         Json
  status          WebhookDeliveryStatus @default(PENDING)
  attemptCount    Int                   @default(0)
  maxAttempts     Int                   @default(5)
  lastStatusCode  Int?
  lastError       String?
  idempotencyKey  String                @unique
  scheduledAt     DateTime?
  completedAt     DateTime?
  subscription    WebhookSubscription   @relation(...)
}
```

#### 18b. Migration

**New migration:** `packages/db/prisma/migrations/20260603020000_add_outgoing_webhooks/migration.sql`

#### 18c. Repository

**New file:** `apps/api/src/shared/modules/webhooks/outgoing/outgoing-webhook.repository.ts`

Methods: `findActiveSubscriptions()`, `createSubscription()`, `deactivateSubscription()`, `createDelivery()`, `claimPendingDeliveries()`, `markDelivered()`, `markFailed()`, `markDeadLettered()`, `getDeadLetteredDeliveries()`.

#### 18d. Service

**New file:** `apps/api/src/shared/modules/webhooks/outgoing/outgoing-webhook.service.ts`

- `dispatch(event)` — finds active subscriptions, creates delivery records with idempotency key
- `sendDelivery(delivery)` — POSTs to target URL with HMAC-SHA256 signature in `X-Webhook-Signature` header
- `tick()` — claims pending deliveries, sends them, handles success/failure/DLQ with exponential backoff (5s base, 300s cap)

#### 18e. Module

**New files:** `outgoing-webhook.module.ts` — `@Global()` module registered in `WebhooksModule`.

**Steps to deploy:**
```bash
cd packages/db
pnpm run db:migrate:safe
```

---

## 19. Integration Test Database

### Problem
No integration test database — API tests mocked `PrismaService.$transaction` rather than running against a real database.

### Fix

**New file:** `apps/api/src/test-utils/test-database.ts`

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export async function startTestDatabase(): Promise<string> {
  const container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('docita_test')
    .start();
  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  // Run migrations
  execSync(`npx prisma migrate deploy ...`);
  return databaseUrl;
}

export async function cleanTestDatabase(): Promise<void> {
  // TRUNCATE all tables CASCADE (except _prisma_migrations)
}

export async function stopTestDatabase(): Promise<void> {
  await prisma?.$disconnect();
  await container?.stop();
}
```

**Usage in tests:**
```typescript
beforeAll(async () => {
  await startTestDatabase();
  prisma = await getTestPrisma();
});

afterEach(async () => {
  await cleanTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});
```

**Dependencies:** Add `@testcontainers/postgresql` and `testcontainers` to `devDependencies`.

---

## 20. Zero-Downtime Migration Enforcement

### Problem
No automated guard against dangerous migration patterns (DROP COLUMN, RENAME, ALTER TYPE) that require expand/contract phasing.

### Fix

**New file:** `scripts/checks/check-migration-safety.mjs`

Scans the latest migration SQL for dangerous patterns:

| Pattern | Level | Guidance |
|---------|-------|----------|
| `DROP COLUMN` | error | Must be deployed AFTER all readers updated |
| `ALTER COLUMN ... TYPE` | error | May lock table — prefer USING clause or split phases |
| `ADD ... NOT NULL` | warning | Requires DEFAULT or backfill FIRST |
| `RENAME COLUMN / TABLE` | error | Contract phase — deploy AFTER all writers updated |
| `CREATE INDEX` (non-concurrent) | warning | Prefer `CREATE INDEX CONCURRENTLY` for large tables |
| `LOCK TABLE` | error | May cause downtime under load |

**Run:**
```bash
node scripts/checks/check-migration-safety.mjs
```

**CI Integration:** Add to `ci.yml` or `db-migrations.yml` workflow:

```yaml
- name: Check migration safety
  run: node scripts/checks/check-migration-safety.mjs
```

---

## 21. Container Image Scanning

### Problem
No container-layer CVE scanning in CI — `pnpm audit` covers npm deps only.

### Fix

**New file:** `.github/workflows/container-scan.yml`

```yaml
name: Container Security Scan
on:
  pull_request:
    paths:
      - 'apps/api/Dockerfile'
      - 'apps/worker/Dockerfile'
      - 'pnpm-lock.yaml'
  schedule:
    - cron: '0 6 * * 1'   # Weekly Monday scan

jobs:
  scan-api:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@0.29.0
        with:
          scan-type: 'fs'
          scan-ref: 'apps/api'
          format: 'sarif'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
      - uses: github/codeql-action/upload-sarif@v3
```

Uses Trivy to scan `apps/api` and `apps/worker` for HIGH/CRITICAL vulnerabilities and secrets. Results uploaded to GitHub Security tab.

---

## 22. Cache Invalidation Bus

### Problem
No distributed cache invalidation — cache entries stale until TTL expiry. No event-driven targeted invalidation.

### Fix

**New file:** `apps/api/src/shared/modules/cache/cache-invalidation-bus.ts`

```typescript
@Injectable()
export class CacheInvalidationBus {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly events: EventEmitter2,
  ) {
    // Listen for invalidation events (local or cross-pod via Redis pub/sub)
    this.events.on('cache.invalidate', (event) => this.handle(event));
  }

  invalidateKey(key: string): void {
    this.events.emit('cache.invalidate', { key, timestamp: new Date().toISOString() });
  }

  invalidatePattern(pattern: string): void { ... }
  invalidateByTags(tags: string[]): void { ... }
}
```

**Registration:** Added to `CacheModule` — made `@Global()` so available everywhere.

**Usage:**
```typescript
// After updating a patient record:
cacheInvalidationBus.invalidateKey(`patient:${patientId}`);
cacheInvalidationBus.invalidateByTags([`patients:${clinicId}`]);
```

---

## 23. Worker Graceful Shutdown

### Problem
Worker shutdown had no timeout and no Sentry flush — if `app.close()` hung, the process never exited. Telemetry loss on shutdown.

### Fix

**File:** `apps/worker/src/main.ts`

Replaced:
```typescript
const shutdown = () =>
  void app.close().then(() => process.exit(0));
```

With:
```typescript
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 15_000;

const shutdown = (signal: string) => {
  app.get(Logger).log(`Received ${signal}, shutting down...`);
  const timeout = setTimeout(() => {
    process.stderr.write("Shutdown timed out — forcing exit\n");
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  timeout.unref();

  app.close().then(async () => {
    await Sentry.close(5_000);   // Flush pending telemetry
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => { ... });
process.on("uncaughtException", (error) => { ... });
```

---

## 24. Silent Error Handling Fixes

### Problem
Usage tracking in `invoices-command.service.ts` had `.catch(() => {})` — silently discarding all errors.

### Fix

**File:** `apps/api/src/domains/billing/application/services/invoices-command.service.ts`

Changed:
```typescript
this.usageTracking.trackInvoice(...).catch(() => {});
```
To:
```typescript
this.usageTracking.trackInvoice(...).catch((err: unknown) => {
  this.logger.error(
    `Failed to track invoice usage for ${invoice.id}: ${err instanceof Error ? err.message : String(err)}`,
  );
});
```

Added `Logger` import and `private readonly logger = new Logger(InvoicesCommandService.name)`.

---

## 25. Missing Database Indexes

### Problem
High-traffic tables lacked indexes for common query patterns.

### Fix

**File:** `packages/db/prisma/schema.prisma`

| Model | Index Added | Purpose |
|-------|-------------|---------|
| `WhatsappConversation` | `@@index([contactPhone])` | Phone-based conversation lookup |
| `WhatsappMessage` | `@@index([direction])` | Inbox filtering by direction |
| `WhatsappMessage` | `@@index([conversationId, direction])` | Conversation + direction filter |
| `ErrorLog` | `@@index([path, method])` | Endpoint-level error aggregation |

**Migration:** `packages/db/prisma/migrations/20260603030000_add_missing_indexes/migration.sql`

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WhatsappConversation_contactPhone_idx" ON "WhatsappConversation" ("contactPhone");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WhatsappMessage_direction_idx" ON "WhatsappMessage" ("direction");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WhatsappMessage_conversationId_direction_idx" ON "WhatsappMessage" ("conversationId", "direction");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ErrorLog_path_method_idx" ON "ErrorLog" ("path", "method");
```

**Steps to deploy:**
```bash
cd packages/db
pnpm run db:migrate:safe
```

---

## 26. Safe Temp File Cleanup Utility

### Problem
11 locations used `await unlink(file.path).catch(() => {})` — silently swallowing filesystem errors.

### Fix

**New file:** `apps/api/src/shared/common/utils/safe-unlink.ts`

```typescript
export async function safeUnlink(
  filePath: string,
  logger?: Logger,
  context?: string,
): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = context ? `[${context}] ` : '';
    if (logger) {
      logger.warn(`${prefix}Failed to clean up temp file ${filePath}: ${message}`);
    }
  }
}
```

**Usage (migration pattern for existing files):**
```typescript
// Before:
await unlink(file.path).catch(() => {});

// After:
import { safeUnlink } from '@/shared/common/utils/safe-unlink';
await safeUnlink(file.path, this.logger, 'UploadCleanup');
```

---

## 27. Prisma Boundary Refactor (Domain Services)

### Problem
Services in the `core/` layer directly inject `PrismaService` instead of consuming repository interfaces. This violates the architecture rule that `@prisma/client` must never leak outside the repository layer.

### Affected Files
- `apps/api/src/domains/appointments/core/domain-services/appointment-scheduling-rules.service.ts`
- `apps/api/src/domains/billing/core/services/pricing.service.ts`
- `apps/api/src/domains/billing/core/services/usage-tracking-query.service.ts`
- `apps/api/src/domains/billing/core/services/usage-tracking-command.service.ts`
- `apps/api/src/domains/billing/core/services/usage-aggregation.service.ts`
- `apps/api/src/domains/billing/core/services/overage-calculation.service.ts`
- `apps/api/src/domains/billing/core/services/claim-validation.service.ts`
- `apps/api/src/domains/subscriptions/core/services/referral.service.ts`

### Fix Pattern (per service)

**Step 1:** Define a repository interface in the domain's `core/repositories/` or `application/ports/`:

```typescript
// apps/api/src/domains/appointments/core/repositories/appointment-scheduling.repository.interface.ts
export interface IAppointmentSchedulingRepository {
  findConflictingAppointments(
    doctorId: string, clinicId: string,
    startTime: Date, endTime: Date,
    excludeAppointmentId?: string,
    activeStatuses: string[],
  ): Promise<Array<{ id: string; startTime: Date; endTime: Date }>>;
}
```

**Step 2:** Implement in `infrastructure/persistence/`:

```typescript
// apps/api/src/domains/appointments/infrastructure/persistence/prisma-appointment-scheduling.repository.ts
@Injectable()
export class PrismaAppointmentSchedulingRepository implements IAppointmentSchedulingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConflictingAppointments(...) {
    return this.prisma.appointment.findMany({ ... });
  }
}
```

**Step 3:** Inject the interface into the domain service:

```typescript
// In appointment-scheduling-rules.service.ts
constructor(
  @Inject(APPOINTMENT_SCHEDULING_REPOSITORY_TOKEN)
  private readonly schedulingRepo: IAppointmentSchedulingRepository,
) {}
```

**Step 4:** Register in the domain module:

```typescript
{
  provide: APPOINTMENT_SCHEDULING_REPOSITORY_TOKEN,
  useClass: PrismaAppointmentSchedulingRepository,
}
```

**Verification:** `pnpm check:prisma-boundary` should pass for all domains.

---

## Verification Checklist

After deploying all fixes, run:

```bash
pnpm lint
pnpm check:prisma-boundary
pnpm check:circular
pnpm check:hygiene
pnpm verify:standard
pnpm knip
pnpm turbo check-types --continue
pnpm test
pnpm build
```

## Monitoring Verification

```bash
# Prometheus metrics
curl http://localhost:3001/metrics | grep -E "^(business_|cb_|db_backup_|cron_heartbeat_)"

# Search fuzzy matching
curl 'http://localhost:3001/api/v1/search?query=Jhon&clinicId=test-clinic'
# Should return patients named "John"

# Circuit breaker state
curl http://localhost:3001/metrics | grep cb_state
```

# Outbox Reliability Repair Plan

> Execute inline after the four initial repairs in the approved backend plan.

**Goal:** Preserve retryable delivery intent, correct tenant context and
transaction integrity in the existing outbox.

**Architecture:** Keep the current Prisma outbox, advisory lock, EventEmitter2
and retry/DLQ bookkeeping. Use child ALS scopes and existing notification unique
keys; avoid adding delivery providers or changing schemas.

**Tech stack:** NestJS, Jest, Prisma/Postgres, EventEmitter2, AsyncLocalStorage.

## Constraints

- Apply the approved backend design and its durable-delivery decisions.
- No new dependencies, schema changes, external sends or historical replay.
- Identifiers in tests are synthetic. Use a separate disposable database while
  the broader API E2E suite is running.

## Task 1: Reproduce durable transaction and dispatch failures

- [x] Add `apps/api/test/e2e/queue/outbox-delivery.e2e-spec.ts` using the existing
  database setup and real `OutboxService` / `OutboxRelayScheduler`.
- [x] In one transaction append the same idempotency key twice, then execute
  `SELECT 1`. Assert the transaction commits and one event row exists.
- [x] Register no handler on a real emitter, drain a row, and assert it retains
  `processedAt === null` and a future `nextAttemptAt`.
- [x] Register a real async handler, drain rows from different clinics together,
  and assert each handler sees its own persisted clinic before and after await.
- [x] Drain a payload with a conflicting clinic ID and assert no handler runs.
- [x] Run the new spec; record current failures before edits.

## Task 2: Preserve append and dispatch invariants

**Files:** `outbox.service.ts`, `outbox-relay.scheduler.ts` and adjacent relay unit
tests under `apps/api/src/shared/modules/outbox/`.

- [x] Build insertion data once. For keyed events insert with:

```ts
await tx.outboxEvent.createMany({ data, skipDuplicates: true });
```

  Log the existing duplicate diagnostic only when the returned count is zero.
  Unkeyed events retain ordinary `create`; other errors propagate.
- [x] Require `events.hasListeners(row.event_name)` before dispatch.
- [x] Reject payload clinic mismatches, then establish per-row scope:

```ts
runOutsideActiveTx(() => runWithTenant(
  { clinicId: row.clinic_id ?? undefined },
  () => events.emitAsync(row.event_name, payload),
));
```

  Preserve the existing dispatch timeout, metadata, acknowledgments and retries.
- [x] With RLS enabled, open a fresh transaction using `applyRlsScope` and
  `runWithActiveTx` for each clinic row. Verify the live connection GUCs through
  the actual Postgres test and preserve the parent async scope.
- [x] Limit RLS-enabled claims to the canonical pool size minus two connections.
  In development, a 20-row fixture must deliver three and retain 17 with zero
  attempts; reserve connections for the advisory lock and acknowledgment writes.
- [x] Update unit emitter seams to declare matching handlers; add real-emitter
  unit coverage for orphan events and simultaneous clinic contexts.
- [x] Re-run the Postgres regression spec and relay unit suite.

## Task 3: Await and retry idempotent lead delivery

**Files:** `facility-lead-notification.service.ts`, its adjacent spec, and a new
  `facility-lead-notification.integration.spec.ts` in the same folder.

- [x] Build a small Nest application with EventEmitterModule and the real
  facility-lead notification service. Only replace the persistence port.
- [x] Hold the first notification write pending and assert `emitAsync` remains
  pending. Fail the write and assert emission rejects; retry successfully.
- [x] Run the integration spec and observe the current premature acknowledgment
  and swallowed failure.
- [x] Use `{ async: true, promisify: true, suppressErrors: false }` on both
  outbox-only event handlers. After existing FAILED bookkeeping, rethrow the
  original error. Preserve unique `(leadId, kind)` upserts.
- [x] Update obsolete fire-and-forget comments/tests. Re-run integration, unit
  and facility-lead Postgres E2E coverage.

## Task 4: Keep the lock alive through bounded delivery

**Files:** `apps/api/src/shared/common/utils/postgres-advisory-lock.ts`, adjacent
spec, and outbox relay.

- [x] Add a regression asserting a caller's longer requested timeout reaches
  the Prisma transaction while a shorter request preserves shared defaults.
- [x] Pass transaction options derived from `getDefaultTransactionOptions()`:

```ts
timeout: Math.max(defaults.timeout ?? timeoutMs, timeoutMs)
```

- [x] Pass a relay-specific lifetime longer than `DISPATCH_TIMEOUT_MS` to the
  helper. Add a real-Postgres short-timeout characterization test for the helper
  contract, without adding long sleeps.
- [x] Run all advisory-lock callers' tests, relay tests, both backend typechecks,
  unit suites and builds, lint, Knip and repository standards.

## Completion evidence

- [x] Document exact passing results and remaining payment subscriber limits.
- [x] Stop/remove owned disposable database containers after verification.
- [x] Preserve all historical events; document that absent subscribers now
  leave retry/DLQ evidence and that provider delivery remains separately scoped.

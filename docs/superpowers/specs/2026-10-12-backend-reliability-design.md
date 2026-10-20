# Backend reliability and correctness repair design

Status: approved by the user; bounded repairs implemented and verified.

## Goal and scope

Repair verified backend defects before introducing new product behavior. The
first deliverable covers request transaction context, existing notification
queries and dates, and domain-event diagnostics. API contracts, tenant guards,
role gates, clinical writes, billing arithmetic and onboarding semantics remain
authoritative. Subsequent independent work covers durable delivery and then
clinical/payment regression review.

## Approaches considered

1. **Evidence-led repairs, followed by durable-delivery work (recommended).**
   Reproduce defects, repair each with a failing regression, then run API and
   worker checks. Small changes make regression attribution and rollback clear.
2. **Infrastructure replacement first.** Replace event dispatch or the queue
   system before repairing consumers. This broadens migration and duplicate-send
   risk without being necessary for the verified defects.
3. **Add features first.** New automation or admin capabilities increase the
   number of affected paths while existing notification behavior is broken.

## First repair deliverable

### 1. Keep transaction context local to each async branch

`active-tx.storage.ts` and `rls-routing.extension.ts` mutate the shared ALS store's
`tx` while awaiting work. A controlled reproduction using the actual functions
produced `Concurrent second query: outer` and
`Parent transaction retained during side effect: false`.

Use a child `activeTxStorage.run({ tx: null }, ...)` context for routing recursion
guards and deliberately detached side effects. Parent and sibling branches keep
their own transaction. Nested queries retain the existing recursion guard; thrown
errors propagate. No change to tenant filtering, RLS configuration or bypass
authorization. Tests cover overlapping reads, detached work, rejection, and nested
calls using controlled promises rather than timers.

### 2. Repair tenant-qualified notification reads

The synthetic invoice run recorded a rejection because the invoice `findUnique`
query omitted `clinicId`. The same pattern exists in `StaffNotificationListener`,
`InvoiceEventsListener`, `WhatsappEventListener` and `SystemEventsService`.

Keep existing unique lookups, but explicitly include the supplied clinic ID in
each tenant-owned invoice, prescription and appointment lookup. Existing tenant
policy accepts this qualified shape; do not relax that policy. Tests exercise
queries through the real tenant policy, successful notification dispatch,
missing records and a mismatched-clinic fixture. Existing feature/consent checks
continue to run before patient messaging. No real messages are sent during tests.

This fixes rejected reads; it does not assert durable delivery or duplicate-safe
replay. Those are separate concerns below.

### 3. Format notification dates in the clinic timezone

Appointment confirmations and updates call shared date formatters without the
clinic timezone; the formatters consequently use the canonical default. Select
the existing `Clinic.timezone` alongside existing clinic fields and pass it into
the shared formatters. Apply the same rule to payment-confirmation dates where
the clinic relationship is already available. Preserve the canonical fallback
for historical fixtures lacking a timezone. Test a UTC instant crossing the
clinic's local date boundary, daylight-saving cases and the existing default.
UTC persistence and schedule conversion behavior do not change.

### 4. Remove event payloads from diagnostic logs

`DomainEventService.emit/emitAsync` log serialized event payloads;
`AuditEventListener` does so in development. Canonical patient-created payloads
contain names and contact data. Remove payload arguments from diagnostic logs,
retaining event type and correlation ID. Persisted audit records and audit
delivery behavior stay intact. Tests use synthetic PHI markers and verify none
appear in logger arguments while the emitted/persisted event retains its payload.

## Second deliverable: durable event delivery

Investigate these current-code findings with a separate executable integration
design before enabling extra sends or replay:

- The outbox relay republishes rows without establishing the row's clinic ALS
  context. Subscribers cannot rely on request middleware in the worker.
- The worker's messaging module does not register the patient/staff event
  listeners used by the API. An event with no subscribers can resolve emission
  and be marked processed without performing its intended effect.
- Several listeners catch and suppress failures. A resolved `emitAsync` is not
  sufficient evidence of delivery when a subscriber suppresses the failure.
- Outbox retries require per-subscriber idempotency; the relay's own comment
  requires it, but it is not enforced by all current notification consumers.
- The advisory-lock helper retains a Prisma interactive transaction during
  dispatch without explicit transaction options, although dispatch has a 30-second
  timeout. Verify lease lifetime with the actual configured client and database.
- `OutboxService.append` catches a unique-key error inside its caller's
  transaction. Verify duplicate insertion does not leave the Postgres transaction
  aborted before selecting a conflict-safe insertion method.

Acceptance requires actual worker-module wiring, tenant-qualified subscriber
reads, failure propagation, duplicate/retry tests and an isolated database.
Do not replay historical events until duplicate-send and retention behavior are
defined. Preserve existing rows for investigation.

## Third deliverable: clinical and operational improvements

Review existing API E2E coverage for payment/webhook idempotency, invoice settlement,
appointment contention and timezone conversion, queue claim fencing, released lab
results, patient identity and existing-user access. Run the existing tests against
an isolated synthetic database and repair demonstrated failures individually.
Only propose new metrics, retry controls or query indexes when a current consumer
and measured need support them. Each new schema or index receives a separate
compatibility/backfill/rollback decision before implementation.

## Durable-delivery repair decisions

The installed Nest event loader wraps handlers with a normal function returning
a promise. EventEmitter2's `async: true` option does not promisify that wrapper
automatically. Its default Nest error suppression also prevents a rejected
handler from reaching `emitAsync`. The facility-lead subscriber already has
idempotent `(leadId, kind)` upserts and is registered in the worker's shared
subscription providers, so it can safely participate in relay retries.

Implement these bounded repairs after the first deliverable:

1. Establish a fresh per-row tenant scope using the persisted outbox clinic ID,
   without inheriting a request's active transaction. Reject a conflicting
   clinic ID in the payload before invoking subscribers. Deployment enables
   RLS in both API and worker, so a clinic-scoped row also opens a fresh
   RLS transaction, applies parameterized GUCs and publishes that connection
   through the existing transaction-routing storage. Limit RLS-enabled claims
   to the canonical pool capacity minus two connections (lock and acknowledgment)
   so unclaimed rows do not consume retry attempts while waiting for capacity.
2. Fail delivery when the real emitter has no matching subscriber; record the
   ordinary retry/DLQ state instead of acknowledging the row. Do not introduce
   a new payment WhatsApp subscriber with unproven duplicate-send behavior.
3. Await facility-lead subscribers with `promisify: true` and
   `suppressErrors: false`. Persist their existing FAILED diagnostic row and
   then rethrow so the relay retries; successful redelivery uses the same
   unique upsert and produces one notification row.
4. Insert idempotency-keyed outbox records with conflict-safe `createMany` /
   `skipDuplicates`, so a duplicate does not abort its surrounding Postgres
   transaction. Keep ordinary insertion errors fatal.
5. Honor an advisory-lock caller's longer timeout using the shared transaction
   defaults, and give the relay sufficient transaction lifetime beyond its
   bounded dispatch window. Do not change the shared default timeout.

Add real-Postgres regressions for duplicate append/continued transaction work,
orphan delivery, tenant mismatch and concurrent row scopes. Add a small Nest
module test exercising the actual facility-lead decorators, pending completion,
failure propagation and successful retry. No schema migration, provider send or
historical replay is part of these decisions.

## Constraints and validation

- Node.js >=22.22.0; pnpm@10.30.3 only. No added dependencies.
- Canonical Zod contracts remain in `packages/types`; no duplicate DTO shapes.
- Preserve tenant/role gates, consent policy, PHI protection and audit records.
- No production database writes, provider sends, migrations or deployment.
- First deliverable requires no schema changes or historical account backfill.
- API and worker unit suites, relevant typechecks, full lint, backend builds,
  Prisma boundary, UTC-storage checks, standards, hygiene and Knip must pass.
- API E2E uses a disposable synthetic database and mocked/disabled providers;
  document exactly what was run and any uncovered runtime paths.
- Rollback is a focused code revert; do not combine independent concerns in a
  commit. Existing UI work remains preserved on its current branch.

## Review boundaries

The review is a backend correctness/reliability pass, not a claim that every API
route, provider integration or production configuration has been audited. Passing
unit suites are a baseline; the reproduced concurrency and missing-query-scope
defects show why regression additions are necessary.

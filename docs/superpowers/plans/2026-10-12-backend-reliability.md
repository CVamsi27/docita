# Backend Reliability Implementation Plan

> Execute inline using executing-plans, one independent repair at a time. Do not
> dispatch subagents or enable provider delivery during verification.

**Goal:** Repair the verified transaction-context, notification-query,
notification-timezone and diagnostic logging defects.

**Architecture:** Preserve NestJS services, existing persistence ports, tenant
policy and shared date utilities. Isolate async transaction context using child
ALS scopes; qualify existing record reads; retain existing message and audit
contracts.

**Tech Stack:** NestJS, Prisma/Postgres, AsyncLocalStorage, Jest, TypeScript,
pnpm/Turborepo.

## Global constraints

- Node.js >=22.22.0; pnpm@10.30.3 only. No added dependencies.
- Preserve tenant/role gates, consent policy, PHI protection and audit records.
- No production database writes, provider sends, migrations or deployment.
- Follow the reviewed design in `../specs/2026-10-12-backend-reliability-design.md`.
- Tests must reproduce each defect before production edits. Use controlled
  promises for concurrency; keep slow/provider operations behind test doubles.
- Record independent evidence for each repaired behavior; do not infer full
  delivery correctness from a resolved listener promise.

## Task 1: Isolate active transaction detachment

**Modify:**
`apps/api/src/shared/modules/rls/active-tx.storage.ts`
`apps/api/src/shared/common/extensions/rls-routing.extension.ts`

**Tests:** adjacent `active-tx.storage.spec.ts` and
`rls-routing.extension.spec.ts`.

**Interface:** Keep `runOutsideActiveTx<T>(fn: () => Promise<T>): Promise<T>`
and `routeOperationThroughActiveTx<T>(input): Promise<T>` signatures unchanged.

- [x] Add an overlapping-query regression: start the first routed operation,
  block its transaction delegate with a manually released promise, start a
  sibling, and expect both results to come from the transaction delegate.
- [x] Add a detached-side-effect regression that asserts the side effect sees
  `tx === null` while its concurrently running parent still sees the original
  transaction. Cover rejection and nested detachment.
- [x] Run the two specs and record the expected failures against current code.
- [x] Replace mutation/restoration with the child-scope operation:

```ts
return activeTxStorage.run({ tx: null }, fn);
```

  In the routing core, run only the transaction delegate inside the child scope.
  Keep the existing guarded dynamic delegate lookup and return-shape assertion.
  Update comments describing the old mutable-store behavior.
- [x] Re-run the specs, tenant interceptor tests and audit service tests.

## Task 2: Qualify existing notification record lookups

**Modify:**
`apps/api/src/domains/whatsapp/application/listeners/staff-notification.listener.ts`
`apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts`
`apps/api/src/domains/whatsapp/application/services/system-events.service.ts`
`apps/api/src/domains/billing/infrastructure/listeners/invoice-events.listener.ts`

**Tests:** Add adjacent staff and invoice listener specs where absent; extend
existing WhatsApp listener and system event service specs.

**Interface:** Existing event envelopes and send methods retain their signatures.
The event's clinic ID supplies the query qualifier; record ID alone never grants
access.

- [x] Make the test persistence seam enforce the real tenant scope policy for
  each invoice/prescription/appointment lookup and return only matching rows.
- [x] Reproduce rejected same-clinic reads and absent/mismatched-clinic reads;
  verify absent records never reach the provider/inbox boundary.
- [x] Run focused tests and record the failures.
- [x] Qualify each lookup with its existing clinic parameter:

```ts
where: { id: invoiceId, clinicId },
where: { id: prescriptionId, clinicId },
where: { id: appointmentId, clinicId },
```

  Staff listener uses `payload.clinicId`; payment listener uses `event.clinicId`.
  Keep field projections, feature/consent checks and missing-record behavior.
- [x] Run all affected listener/service tests and invoice/WhatsApp API E2E in
  the isolated synthetic database. Provider operations remain mocked.

## Task 3: Use clinic-local notification dates

**Modify/Test:** `system-events.service.ts` / `system-events.service.spec.ts`.

**Interface:** The existing clinic relation adds only `timezone` to its internal
projection; no HTTP response or persistence schema changes.

- [x] Add literal expected date/time assertions for clinic
  `America/New_York` at `2026-04-01T02:00:00Z`: `31 Mar 2026`, `10:00 PM`.
  Cover confirmation, reschedule/cancellation and payment confirmation.
- [x] Add daylight-saving fixtures and the existing canonical-default fallback.
- [x] Run the tests and record timezone failures.
- [x] Select `timezone: true` on the relevant clinic relations and pass it to
  the shared formatters:

```ts
formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
  timezone: appointment.clinic?.timezone,
});
formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
  timezone: appointment.clinic?.timezone,
});
```

  Payment confirmation uses `invoice.appointment?.clinic?.timezone` for its date.
- [x] Re-run all system event service specs and appointment-timezone E2E.

## Task 4: Preserve audit data without payload diagnostic logging

**Modify:** `apps/api/src/shared/common/events/event.service.ts` and
`apps/api/src/shared/modules/audit/audit/audit-event.listener.ts`.

**Tests:** Add or extend adjacent specs, keeping real event emission and audit
listener logic, with only persistence/provider boundaries replaced.

**Interface:** Existing event payloads, audit records and correlation IDs remain
unchanged. Logger output contains type and correlation context only.

- [x] Pass a canonical patient-created event with synthetic names and contact
  markers through `emit`, `emitAsync`, and development audit handling.
- [x] Assert serialized logger arguments contain none of those markers while
  the event/audit persistence boundary still receives the complete payload.
- [x] Run the specs to confirm current logging fails the assertions.
- [x] Remove `JSON.stringify(payload)` / `JSON.stringify(event.payload)` from
  diagnostic logger calls. Retain existing safe context:

```ts
this.logger.debug(`Emitting event: ${type} [${correlationId}]`);
```

- [x] Run event, audit listener/service and PHI audit E2E tests.

## Task 5: Consolidated validation and evidence

- [x] Run `pnpm --filter @docita/api test --runInBand` and
  `pnpm --filter @docita/worker test --runInBand`.
- [x] Run API and worker `check-types`, `pnpm lint`, both backend builds,
  `pnpm check:prisma-boundary`, `pnpm check:utc-instant-storage`,
  `pnpm verify:standard`, `pnpm check:hygiene`, and `pnpm knip`.
- [x] Run API `test:e2e` against disposable synthetic Postgres and document
  results; do not use the repository's real environment credentials.
- [x] Document the passing regression counts, exact reproduction results,
  remaining durable-delivery work and verification limits in a backend QA note.
- [x] Review diff for weakened guards, plaintext PHI, unnecessary DTO/schema
  changes, and unintended UI changes. Keep independent repairs in focused commits
  only when checks pass and commit work is authorized.

## Subsequent independent plans

1. Durable delivery: prove missing-subscriber behavior, worker tenant context,
   suppressed errors, duplicate sends and advisory-lock lifetime before choosing
   a rollout. Add no historical replay in this repair deliverable.
2. Clinical/payment/queue coverage: execute existing critical E2E contracts,
   repair demonstrated failures, and evaluate operational enhancements from
   measured evidence. Schema/index changes require compatibility and rollback
   plans and their own focused changes.

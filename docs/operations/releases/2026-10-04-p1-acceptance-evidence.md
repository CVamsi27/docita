# P1 acceptance evidence — 2026-10-04

Backlog items: **A01, A02, W01, W02, W03, O01, O02, D01, Q02, I01, P01**
(each previously marked *code landed, evidence record pending*) plus the audit of
**U01** and **S02**.

This record exists because those rows claimed code and tests without ever having
run them. Everything below was executed on 2026-10-04 against this checkout and
recorded verbatim. **Two items are closed here — S02** (whose `Done when` clause
is exactly "at most one request consumes a single-use capability" and is covered
by the PostgreSQL race suites below) **and U01** (§5, closed 2026-10-05 after
the reproduction-and-fix runs recorded there). The rest stay open: their
clauses require two workers, real provider callbacks, real browser flows and
production-database roles, none of which a unit or local-database run can
supply.

## 1. Commands and results

### API unit suites (mocked dependencies)

Three batches, each run to completion with jest exit 0:

| # | Pattern | Suites | Tests | Time |
| --- | --- | ---: | ---: | --- |
| 1 | `postgres-queue\|queue-job\|in-memory-queue\|outbox-relay\|period-bucket\|monitoring\|ipd\|insurance-claim\|lab-\|patient-portal\|local-storage.provider\|storage-provider\|analytics` | 41 | 325 | 3.7s |
| 2 | `src/domains/appointments\|src/shared/modules/queue\|uploads\|subscription` | 106 | 746 | 6.7s |
| 3 | `overage-meter\|usage` | 5 | 29 | 1.0s |
| | **total** | **152** | **1100** | |

**0 failures in every batch.**

### Real-PostgreSQL suites (integration)

```
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testPathPatterns "inventory"          -> 1 suite, 13 tests passed (17.7s)
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testPathPatterns "queue-claim-fencing|queue-token-allocation|ipd"
                                            -> 3 suites, 28 tests passed (34.1s)
```

Both run `setupTestDatabase` against the local PostgreSQL test database, so the
concurrency claims are tested against the same unique indexes and conditional
writes production uses.

**Integration total: 4 suites, 41 tests, 0 failures.**

A fifth and sixth suite cover the S02 row (§2):

```
cd apps/api && npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testPathPatterns "patient-portal-otp|uploads"
                                            -> 2 suites, 12 tests passed (19.1s)
```

Each was also run with its single-use predicate removed, to confirm the race
assertions decide the outcome: both runs exited 1 (2/2 OTP race tests failed;
exactly the 2 upload race tests failed while the 8 sequential ones passed), and
the restored run was green again — `12 passed, 12 total, exit 0`.

Combined for this record: **158 suites, 1,153 tests, 0 failures** (plus two
intentionally failing mutation runs).

## 2. What each row can now claim

| Row | Executed evidence | Proven by this run | Still not proven |
| --- | --- | --- | --- |
| **A01** queue claims | `postgres-queue.service.spec.ts`, `in-memory-queue.service.spec.ts` + `test/e2e/queue/queue-claim-fencing.e2e-spec.ts` | claim fencing and lease-expiry logic pass their unit suite; the fencing e2e passes against real PostgreSQL | acceptance asks for **two workers** with crashes *around an effect and an ack* — a single-process suite does not show it |
| **A02** outbox relay | `outbox-relay.scheduler.spec.ts` | durable retryable intent is asserted for listener rejection and replay | process-crash recovery of the relay itself is not exercised |
| **W01** scheduling | `queue-command.service.spec.ts`, `queue-token.helpers.spec.ts`, `queue-contract-parity.spec.ts`, `prisma-queue.repository.spec.ts` + `test/e2e/appointments/queue-token-allocation.e2e-spec.ts` | token uniqueness and conditional allocation pass against real PostgreSQL | parallel booking "one winner" at the *booking* endpoint was not in this suite (the e2e covers token allocation, not full booking contention) — **superseded 2026-10-05, see §6** |
| **W02** IPD beds | `ipd.service.spec.ts`, `prisma-ipd.repository.spec.ts` + `test/e2e/ipd/ipd-bed-allocation.e2e-spec.ts` | concurrent bed allocation passes against real PostgreSQL | transfer/discharge retry semantics are only unit-asserted |
| **W03** inventory | `apps/api/test/e2e/inventory/inventory-ledger.e2e-spec.ts` — 13 tests | no oversell under parallel decrements, one winner per retried operation, ledger reconstruction, drift report, re-unitise refusal | none for this clause; **the earlier annotation claiming `packages/db/scripts/` tooling was false and has been corrected in the backlog** |
| **O01** analytics keys | `period-bucket.util.spec.ts`, the clinical/financial/operational factory specs, `analytics.service.spec.ts`, `prisma-analytics.repository.spec.ts` | weekly-key collisions and bucket boundaries are covered by fixtures | the row already records this changes an API response value — release note still required |
| **O02** telemetry | 9 specs under `monitoring/monitoring/` incl. `telemetry-observation.rules.spec.ts`, `telemetry-capture-recorder.service.spec.ts`, `monitoring.service.spec.ts` | capture health, gap rules and job-outcome recording pass | observation coverage against a **live** dashboard window is unmeasured |
| **D01** documents | `local-storage.provider.spec.ts`, `uploads.service.spec.ts` | local-provider access semantics pass | cross-tenant reads for every provider, and orphan reconciliation, are untested here |
| **Q02** lab | `lab-result-release.service.spec.ts`, `lab-workflow-command.service.spec.ts`, `lab-result-notification-retry.cron.spec.ts`, `lab-order.entity.spec.ts` | unauthorized release rejection and retry-once notification logic pass | delivery to a real mail/SMS provider is untested |
| **I01** insurance | 5 specs: `insurance-claim-submission.command.service.spec.ts`, `insurance-claims-command.service.spec.ts`, submission-retry cron, claim entity, claim repository | optimistic concurrency, retryable submission and transactional events pass | `recordInsurerDecision` still has no route or job (product decision outstanding), and `LEGACY_UNVERIFIED` rows await human reconciliation |
| **P01** portal | 9 specs: auth/command/metrics services, five repositories, response-contract spec | identity linking, resource scoping and session revocation logic pass at unit level | the acceptance clause asks for an **authenticated matrix through the real patient identity** — a browser/e2e run is still required |
| **S02** single-use races — **closed** | unit: `uploads.service.spec.ts` (14 tests, imports `UploadsCommandService` directly) + `patient-portal-auth.service.spec.ts` (7 tests); real PostgreSQL: `patient-portal-otp.e2e-spec.ts` + `uploads.e2e-spec.ts` — **12 tests, 0 failures, jest exit 0 (19.1s)**; **mutation-verified**: deleting `usedAt: null` → 2/2 OTP race tests fail (exit 1), deleting the upload predicates → exactly the 2 race tests fail while the 8 sequential ones pass; restored run green again | **both halves of the clause are proven**: at most one caller consumes the capability, the loser gets a controlled rejection, and the barrier race that holds both requests before the claim still elects one winner while the loser deletes its object exactly once | the HTTP race goes through the real storage provider, but the barrier race stubs `upload`/`delete` **by design** so both requests deterministically reach the conditional UPDATE; no remote object store is exercised, the OTP side is not tested through a browser, and the database is the local test instance, not the production role (S01) |

The S02 evidence above corrects an earlier note in this record that called the
row *half-evidenced* because `uploads-command.service.ts` had no spec file. That
looked for a file named after the class instead of for importers:
`uploads.service.spec.ts` imports and constructs `UploadsCommandService`,
including the conditional-claim branches, and the two race suites cover the
row's own acceptance test ("test concurrent valid submissions against
PostgreSQL").

## 3. The one row that could not be evidenced on 2026-10-04

- **U01 — subscriptions quotas.** Two distinct gaps. `packages/db/scripts/backfill-subscription-quotas.ts`
  has **no automated test** anywhere in the repository and `packages/db`
  declares no `test` script at all; its only verification is the default
  dry-run. And `subscription-overage-meter.service.ts` — the service that
  actually meters usage — has **no spec** either. What *does* pass is the billing
  usage side: `usage-aggregation.service`, `prisma-usage.repository`,
  `billing-usage-aggregation.cron`, `usage-tracking-tier.util` and
  `notify-usage-thresholds.use-case` (5 suites, 29 tests, batch 3). The
  acceptance clause "parallel last-unit consumption has one winner" was
  therefore **unevidenced**, not merely unrecorded. **Superseded 2026-10-05:**
  the gap was reproduced on real PostgreSQL, the admission mechanism was fixed,
  and all three clauses now have mutation-verified evidence — see §5.

## 4. How this changes the rows

Rows A01, A02, W01, W02, W03, U01, O01, O02, D01, Q02, I01, P01 and S02 now
link here instead of saying *evidence record pending* (U01 linked it as the
record of its untested state; §5 supersedes that with proof).

**S02 is closed**; its acceptance clause is a concurrency claim that a local
PostgreSQL run can settle, and the mutations above show the assertions decide
it. **U01 is closed (2026-10-05)** for the same reason: its clauses are rerun
and concurrency claims, settled by the real-PostgreSQL runs and the live
backfill double-run in §5, with the remaining limits recorded in the backlog
row. **Every other row stays open** — the backlog's own rule stands: "a
unit-test count or successful build alone does not close a production-data or
recovery gap."

## 5. U01 closure — executed 2026-10-05

### Reproduction (guard unchanged)

`ai-credit-admission.e2e-spec.ts` against local PostgreSQL: STARTER allotment
100, 99 credits metered, 8 parallel `assertWithinAllotment` calls:

```
● admits exactly one of many parallel claims on the final credit
  Expected length: 1
  Received length: 8
Tests:       3 failed, 1 passed, 4 total
```

Every concurrent caller passed the check-then-allow gate with one credit left —
the "parallel last-unit consumption has one winner" gap, reproduced.

### Fix

- `postgres-advisory-lock.ts` gains `withBlockingAdvisoryLock`, a blocking
  sibling of the try-lock (a try-lock that returns `null` would let waiters
  skip the gate). `pg_advisory_xact_lock` returns `void`, which `$queryRaw`
  cannot deserialize — the naive form failed open for all 8 claims — so the
  call projects an integer.
- `AiCreditGuardService.assertWithinAllotment` checks  `metered + in-flight claims >= allotment` inside the lock and admits by
  writing a zero-quantity `AiCreditAdmission` claim row; `releaseAdmission`
  removes it when the call settles; claims older than 30 minutes are reaped in
  the same lock. All five `ai.controller` endpoints release in a `finally`.
  Fail-open and cost-agnostic semantics are unchanged.
- `extractWithAI` cleanup nesting: the guard used to run before the
  `try/finally` that unlinks multer's temp file, so a 402 (or any guard
  rejection) left the uploaded medical image on disk. An outer `finally` now
  owns file cleanup and an inner one owns claim release.

### Runs (all green)

| Suite | Result |
| --- | --- |
| `ai-credit-guard.service.spec.ts` (unit) | 8 tests |
| `ai-credit-admission.e2e-spec.ts` (PostgreSQL) | 4 tests: one winner of 8 parallel claims, reservation does not move the meter, release re-opens, exhausted denies all |
| `usage-event-idempotency.e2e-spec.ts` (PostgreSQL) | 3 tests: 8 parallel duplicate `eventKey` writes → one row/winner; service rerun idempotent |
| `plan-change-access.e2e-spec.ts` (PostgreSQL) | 3 tests: stale tier not served after `updateTierAndFeatures` |
| `ai-credit-http.e2e-spec.ts` (HTTP, PostgreSQL) | 3 tests: an exhausted ESSENTIAL clinic gets HTTP 402 without billing or claiming, a failed AI call releases the claim, success records 3 credits and releases the claim |
| `subscription-overage-meter.service.spec.ts` | 7 tests |
| `clinic-operations.adapter.spec.ts` | 6 tests |
| `pnpm --filter @workspace/db test` (new script) | 5 tests |

### Mutation runs (each mechanism's assertions decide the outcome)

| Mutation | Failures |
| --- | --- |
| gate ignores in-flight claims (`used + inflight * 0`) | unit one-winner + e2e one-winner and reopen |
| `releaseAdmission` returns before deleting | unit release + e2e release |
| `P2002` dedupe removed (`prisma-usage.repository.ts`) | 2 of 3 eventKey e2e tests |
| eventKey construction dropped (`usage-tracking-command.service.ts`) | service idempotency e2e test |
| meter absolute write changed to `0` | 1 meter test |
| `Promise.allSettled` → `Promise.all` | 6 meter tests |
| adapter cache invalidation removed | 1 unit + 1 plan-change e2e test |
| extract endpoint drops `releaseAdmission` (HTTP) | both HTTP release tests fail |
| extract endpoint drops success-path recording (HTTP) | HTTP success-billing test fails |
| extract endpoint guard flattened back outside the try (skips unlink on 402) | HTTP 402-cleanup test fails |
| backfill plan: no-change skip removed / unmapped-tier stop removed / format changed | 2 + 1 + 1 plan tests |

All mutations were restored and every suite re-run green afterwards.

### Live backfill double-run (`docita_test`)

Two drifted `Subscription` rows plus `TierPricing` seeded → dry-run planned
exactly those two field changes → `--apply` → rerun dry-run reports no changes
→ second `--apply` is a no-op → persisted values match the catalog → seed rows
deleted afterwards.

### Gap found while reproducing

The naive blocking lock failed **open** (the `void` deserialization error hit
the fail-open catch, which would have admitted all 8 claims again); projecting
an integer turns it into serialized admission.

### HTTP reachability finding

The guard sits behind `TierGuard` + `@RequireFeature`. Four of the five
`ai.controller` routes carry `AI_PRESCRIPTION_ASSISTANT` / `AI_DIAGNOSIS_HINTS`,
both of which are in `PLANNED_FEATURES`, so `isFeatureGenerallyAvailable`
403s them for every clinic — their credit-402 path is dormant until those
features launch. `POST /ai/ocr/extract` (`OCR_ADVANCED`, min tier ESSENTIAL) is
the only reachable route, which is why the HTTP evidence runs through it.

## 6. W01 booking contention — executed 2026-10-05

### Reproduction (test DB as the harness built it)

`booking-contention.e2e-spec.ts` raced `POST /appointments` against the local
test database **before any fix**:

```
✕ lets exactly one of many parallel identical bookings win
  Expected length: 1   Received length: 2
✕ lets exactly one of two parallel overlapping windows win
  Expected length: 1   Received length: 2
✓ keeps ordinary sequential bookings working
```

Two of eight parallel identical bookings were accepted, and both halves of an
overlapping pair landed.

### Two root causes, neither in the booking code

1. **The test database was missing production's invariant.** The overlap
   backstop is an `EXCLUDE USING gist` constraint
   (`Appointment_no_active_overlap`, migration `20260603000000`) that
   `prisma db push` cannot express — the harness built the schema from the
   datamodel only. Production has run with the constraint since 2026-05.
2. **The conflict translation was dead under the driver adapter.**
   `isPrismaExclusionViolation` gated on
   `PrismaClientKnown/UnknownRequestError`, but with the production `PrismaPg`
   adapter the error arrives as `DriverAdapterError` with SQLSTATE `23P01` on
   `cause.code` — so even in production a raced loser received HTTP 500 instead
   of the friendly 400 conflict. The util's own spec passed because it only
   ever constructed synthetic classic-client errors.

### Fix

- `apps/api/test/fixtures/migration-only-ddl.sql` (new), applied by
  `setupTestDatabase` after each push: `btree_gist`, the appointment exclusion
  constraint, and the `User` onboarding-completion trigger — every
  migration-only object Prisma cannot express (`pg_trgm` is already covered by
  the datasource `extensions` list).
- `isPrismaExclusionViolation` now accepts the driver-adapter shape via
  `cause.code === '23P01'` while keeping the constraint-name match; the
  classic-client branch is unchanged.
- `factories.appointment` rotates slots so a second factory appointment is
  data that could exist in production (the prescriptions suite had been
  inserting a same-doctor overlap the moment the constraint existed).

### Runs (all green)

| Run | Result |
| --- | --- |
| `booking-contention.e2e-spec.ts` | 3 tests: one winner of 8 parallel identical, one winner of an overlapping pair, sequential sanity |
| `prisma-exclusion-violation.spec.ts` | 8 tests (3 new driver-adapter cases) |
| `prescriptions.e2e-spec.ts` | 19 tests |
| full API e2e, CI-style 2 shards | 56 suites, 448 tests, 0 failures |

### Mutation runs

| Mutation | Failures |
| --- | --- |
| SQLSTATE branch disabled in `isPrismaExclusionViolation` | adapter unit test + tight-race e2e (losers 500 again) |
| exclusion constraint removed from the fixture (SQL kept valid) | both race tests elect multiple winners |

### Limits

The run proves the booking endpoint's one-winner clause against production DDL
on the local database. "Token identities remain unique" is covered by
`queue-token-allocation.e2e-spec.ts`; "stale actions cannot reopen completed
visits" is covered by §7.

## 7. W01 stale actions cannot reopen completed visits — executed 2026-10-05

### Reproduction (before any fix)

`stale-visit-transition.e2e-spec.ts` injected the stale interleaving at the
write boundary — the observed status is handed to the write exactly as a losing
race would supply it — and ran against the local test database:

```
✕ does not reopen a completed appointment         promise resolved instead of rejecting
✕ does not reopen a completed queue token         promise resolved instead of rejecting
✕ refuses to call a patient whose token is already completed
                                                        expected 409 "Conflict", got 201 "Created"
✕ does not reopen a completed appointment through a status patch
                                                        promise resolved instead of rejecting
✓ the other 6 cases (missing-appointment 404, idempotent completion, live
  call/complete walk, post-completion clinical edit, start-then-complete,
  repeated completion)
```

All three stale actions landed: a start decided while the visit was live flipped
a `COMPLETED` appointment back to `IN_PROGRESS`, flipped its `COMPLETED` queue
token back to `IN_PROGRESS`, and a queue "call" on a finished token returned 201.

### Three terminal-transition writes had no precondition

The reads were already conditional; only the writes were blind.

1. `PrismaAppointmentWriteRepository.startConsultationTx` — `updateMany({ where:
   { id, clinicId } })` with no status, and `tx.queueToken.update({ where: { id
   } })` with no status. The `currentStatus` argument existed but was only used
   to skip the write when the visit was already `IN_PROGRESS`, so it never
   guarded anything. `StartConsultationUseCase` validated the status from a
   separate read, then called this.
2. `PrismaQueueRepository.updateToken` — unconditional `update({ where: { id }
   })` behind `QueueCommandService.callPatient` / `completePatient`, guarded only
   by a prior existence check.
3. `PrismaAppointmentWriteRepository.applyPatch` — unconditional `updateMany({
   where: { id, clinicId } })`. The PATCH contract carries `status`
   (`updateAppointmentRequestSchema`), so a request built from an older read
   wrote its status over whatever the row said now.

Separately, `AppointmentSchedulingRulesService.canStatusTransition` already
encodes `COMPLETED: []` and `CANCELLED: []`, but **no write path calls it** — it
is a pure rule covered only by its own spec. Wiring it is out of scope here (see
Limits).

### Fix — one mechanism, three sites

Compare-and-set on the observed status, mirroring the conditional transition
already present in the repository layer (`markReviewed({ expectedStatus })`,
which resolves `null` when it loses):

- `startConsultationTx` writes `where: { id, clinicId, status:
  APPOINTMENT_STATUS_TO_PRISMA[currentStatus] }` and the token `where: { id,
  status: { in: [WAITING, IN_PROGRESS] } }`, both inside the existing
  transaction so a rejected token rolls the appointment back. A `count === 0`
  does one existence read on the failure path only and raises `409 Conflict`
  (row moved on) or `404 Not Found` (row gone) — the previous 404 message is
  preserved.
- `IQueueRepository.updateToken` is replaced by `transitionTokenStatus(id,
  expectedStatuses, data)` (`updateMany` + re-read), returning `null` when the
  token moved on. `callPatient` / `completePatient` return the token unchanged
  when it is already in the target state (idempotent double-click) and raise
  `409` when the conditional update loses.
- `applyPatch` takes an optional `expectedStatus` and applies the precondition
  only when the patch carries a `status`; the observed status comes from the
  server-side `findForUpdate` read (extended with `status`), so no client has to
  send one and the race window stays sub-request.

### Boundary deliberately preserved

Patches **without** a status remain unconditional, so post-completion clinical
edits still return 200. That is the recorded deferral in ADR 0013 §C2.1 ("no
service-layer guard rejects updates to completed/no-show appointments"), whose
pinned oracle row and `NURSE updates a COMPLETED appointment (200)` e2e case
must flip together in the commit that enables the lock. A deliberate status
change by a caller whose read is current also still succeeds — only stale
actions lose. The consultation autosave never sends `status`
(`buildConsultationAppointmentPatch`), so its failure path is untouched.

### Runs

| Run | Result |
| --- | --- |
| `stale-visit-transition.e2e-spec.ts` | 10 tests: 4 stale-reopen clauses, 3 queue semantics, 2 workflow, 1 not-found |
| `queue-command.service.spec.ts` | call/complete/reset incl. 3 new conflict/idempotency cases |
| API unit suite | 509 suites, 3990 tests, 0 failures |
| full API e2e, CI-style 2 shards | 57 suites, 458 tests, 0 failures |

### Mutation runs

Each guard was disabled on its own; every mutation turned exactly one test red
and left the other nine green.

| Mutation | Test that failed |
| --- | --- |
| Drop `status` from the `startConsultationTx` appointment `where` | does not reopen a completed appointment |
| Drop `status` from the `startConsultationTx` token `where` | does not reopen a completed queue token |
| Drop `status` from `transitionTokenStatus`'s `where` | refuses to call a patient whose token is already completed |
| Force `guardsStatus = false` in `applyPatch` | does not reopen a completed appointment through a status patch |
| Remove the existence read (always `409`) | reports a missing appointment as not found rather than a conflict |

Both mutated files were restored from a byte-identical backup (md5 verified)
before the final run.

### Limits

- The stale interleaving is injected at the write boundary rather than by racing
  HTTP requests. That is deterministic and it exercises the production code
  path, but it does not prove the lost race occurs in production traffic —
  only that when it does, the stale action cannot win.
- The guard covers the reopen direction. It is not a status machine: any other
  illegal transition a client sends on a current read is still accepted, and
  `canStatusTransition` remains unwired pending the ADR 0013 §C2.1 product
  decision.
- `callPatient` / `completePatient` move only the queue token; the appointment
  row is untouched by those endpoints, so no cross-resource inconsistency is
  introduced, but they also cannot be made atomic with an appointment status
  change made by a different request.
- `PATCH /appointments/:id` can now answer 409 where it previously answered
  200. The precondition is server-observed, so the window is one request wide
  and no client must change; the wire contract is documented in
  `docs/architecture/API_DOCUMENTATION.md`.

## 8. W02 admission ownership — executed 2026-10-05

### What §4 already proved, and what it did not

The earlier IPD work (`ipd-bed-allocation.e2e-spec.ts`, 16 tests) proved the
**bed** side: a conditional `UPDATE ... WHERE status = <expected>` makes a bed
claim single-winner. Two owners sit next to it and were unproven, so this
section drives the real repository against real PostgreSQL in
`ipd-admission-ownership.e2e-spec.ts`.

### Reproduction (before any fix)

```
✕ admits a patient into at most one bed when admissions race
    Expected length: 1   Received length: 6
✕ leaves every bed free when a losing admission is rejected
✕ performs one transition when two transfers race out of the same bed
✕ does not strand the bed a lost transfer had claimed
    Expected: "AVAILABLE"
✓ the other 5 cases
```

1. **One patient, six beds.** "Does this patient already have an active
   admission" was a read, and a read plus an insert inside one transaction is
   still two statements under READ COMMITTED. Eight parallel admissions of the
   same patient into eight different beds each saw "no active admission" and
   each inserted one: **six ADMITTED rows, six beds occupied by one patient.**
   Nothing in the schema backs the rule — `Admission` has no unique constraint
   (Prisma cannot express a partial index, and no migration creates one).
2. **A stranded bed.** A transfer's ownership gate was `status = 'ADMITTED'`
   only. Two transfers out of the same bed both pass it, so the second
   overwrote the first move: the patient ended in one bed, the other target bed
   stayed OCCUPIED with nobody in it, and the first transition vanished.
3. **A bed freed under another patient.** A discharge decided against bed A,
   arriving after a transfer moved the patient to bed B and a new admission
   took bed A, still matched `status = 'ADMITTED'` — it then freed bed A while
   its new occupant was in it. The existing "does not free a bed the next
   patient has already taken" case only covers the sequential ordering.

### Fix

- `admitPatient` runs its check-and-insert inside
  `withBlockingAdvisoryLock(this.prisma, 'ipd:active-admission:<patientId>', …)`
  — the same blocking-lock helper the AI credit gate uses. Parallel admissions
  of one patient serialise, so the losers re-read and see the winner's
  admission; admissions of different patients never contend.
- `transferPatient` and `dischargePatient` gate on `bedId` as well as `status`
  (`{ id, status: ADMITTED, bedId: admission.bedId }`). The bed an admission
  holds is part of its ownership: a caller decided against a bed the patient
  has since left loses, and because the whole thing is one transaction the
  target-bed claim and source-bed release roll back with it. Both conflicts now
  say the admission is no longer active *in that bed*.

The invariant every test asserts is the one the two owners must agree on: **a
bed is OCCUPIED if and only if exactly one ADMITTED admission points at it.**

### Runs

| Run | Result |
| --- | --- |
| `ipd-admission-ownership.e2e-spec.ts` | 10 tests: 4 patient ownership, 3 transfer ownership, 3 discharge ownership |
| `ipd-bed-allocation.e2e-spec.ts` | 16 tests, unchanged and still green |
| `prisma-ipd.repository.spec.ts` | 13 tests (1 new: the transfer's `bedId` gate) |
| API unit suite | 509 suites, 3991 tests, 0 failures |
| full API e2e, CI-style 2 shards | 58 suites, 468 tests. Shard 1 (29/235) exit 0 on every run. Shard 2 (29/233) was **flaky**: exit 1, exit 1, then exit 0 — see the flake note below |

### Mutation runs

Each guard was disabled on its own; every mutation turned exactly the tests
that depend on it red.

| Mutation | Tests that failed |
| --- | --- |
| `admitPatient` back to a plain `$transaction` (no patient lock) | admits a patient into at most one bed; leaves every bed free when a losing admission is rejected |
| Drop `bedId` from the transfer's ownership gate | performs one transition when two transfers race out of the same bed; does not strand the bed a lost transfer had claimed |
| Drop `bedId` from the discharge's ownership gate | does not free a bed another patient moved into when the discharge loses the race |

The mutated file was restored from a byte-identical backup (md5 verified)
before the final run.

### Limits

- **Shard 2 is intermittently flaky, and this section does not claim it is
  green.** Across three runs it failed twice, each time in a *different* suite
  that passes standalone and passes alongside other suites:
  `clinical/lab-order-abac.e2e-spec.ts` ("unknown order id is a 404" returned
  200) and `referrals/facility-leads.e2e-spec.ts` (concurrent same-facility
  submits, second got 409). Shard 2 without this section's new suite passed
  (28 suites / 223 tests, exit 0); shard 2 with it passed on the third run. Both
  failures are assertions about concurrent or resolution-sensitive behaviour
  evaluated with `Promise.all`, which does not guarantee the requests overlap —
  under the cumulative load of ~29 suites in one process the window moves. The
  failures are not in the IPD domain and are not caused by the fix; the trigger
  is added load. Tracked as **T-F1** in the backlog, which carries the
  reproduction and the fix direction (deterministic overlap, and a policy that a
  shard failure whose suite passes standalone is chased rather than re-run into
  green).
- The reproduction drives the repository directly rather than over HTTP, so the
  guards are proved at the layer that owns them; the wire contract is unchanged
  (both losers were already `409 Conflict`).
- `pg_advisory_xact_lock` waits without a timeout. The critical section is two
  statements, but a stalled holder delays other admissions for the same patient
  rather than failing them — the same trade-off the AI credit gate already
  makes.
- **The rule still has no database invariant.** The advisory lock serialises
  the application write path only; anything else writing `Admission` rows
  directly would not honour it. A partial unique index
  (`Admission(patientId) WHERE status = 'ADMITTED'`) is the durable backstop
  and Prisma cannot express it, so it needs a migration. It is deliberately not
  added here: production may already contain a patient with two ADMITTED rows,
  and a migration that fails on real data stops a deploy. It needs a duplicate
  audit first (recorded as a follow-up in the backlog).
- "Recoverable history" is unchanged: transfers and discharges still append
  prose to `Admission.notes`. A structured movement history is a schema change
  and a separate item.
- Retry ergonomics are unchanged by design: a repeated discharge or a transfer
  already applied answers `409`, not an idempotent success. That is existing,
  evidence-backed behaviour; turning it into idempotent success is a contract
  change for clinical staff to sign off on.

## 9. T-F1 — a flaky e2e race turned out to be a production classification bug — executed 2026-10-05

### What the flake was

Shard 2 failed intermittently in suites unrelated to any open work. One of them,
`referrals/facility-leads.e2e-spec.ts` → *"never creates two real leads for
concurrent same-facility submits"*, failed with `expected 200, received 409` on
the second of two parallel submits. The other,
`clinical/lab-order-abac.e2e-spec.ts` → *"unknown order id is a 404"* returning
200, did **not** reproduce in 5 isolated runs and is **not** explained below.

### The 409 was not a test artifact

`FacilityLeadSubmissionCommandService.submitLead` runs two *separate* reads:
the fingerprint pre-check (step 3) and the same-phone dedupe (step 4). Under a
concurrent submit of the **same facility** those reads can straddle the other
submit's commit:

- step 3 reads before the winner commits → no fingerprint match;
- step 4 reads after → finds a phone match → `DUPLICATE_ENTRY` 409.

So an exact duplicate was classified as "same phone, different facility", and
which of the two classifications the partner saw depended on interleaving. The
documented contract (`REFERRAL_PARTNER_PROGRAM_PLAN.md`) says an exact
fingerprint match is held in `DUPLICATE_REVIEW` and only a genuinely different
facility on the same phone conflicts. The unique index still prevented two real
leads — that part was never broken — but the *classification* was.

### Fix

Step 4 now selects the existing row's `fingerprint` alongside its id and, when
it is identical to the computed one, routes the submission to
`DUPLICATE_REVIEW` through the existing `createDuplicateLead` path instead of
rejecting it. A different facility on the same phone still gets
`DUPLICATE_ENTRY`. The outcome no longer depends on which read wins.

### Runs

| Run | Result |
| --- | --- |
| `facility-lead-submission-command.service.spec.ts` | 10 tests (1 new: concurrent same-facility submit seen only by the phone check) |
| `facility-leads.e2e-spec.ts` with the fix | 4 consecutive runs, 30/30 each, exit 0 |
| `facility-leads.e2e-spec.ts` with the fix reverted | 2 of 4 runs fail on exactly that concurrency test, 2 pass — the e2e detects the race intermittently, as a race should |
| unit spec with the fix reverted | fails deterministically (1 failed / 9 passed), exit 1 |
| API unit suite after the fix | 509 suites, 3992 tests, exit 0 |
| e2e shard 2 after the fix (holds both flake candidates) | 29 suites, 233 tests, exit 0 |
| e2e shard 1 after the fix | 29 suites, 235 tests, exit 1 — `partner-portal` `socket hang up`, clean 3/3 isolated (see Limits) |

### Shard-count change (same day, after the above)

`ci.yml` and `api-e2e.yml` moved from 2 shards to **4**, on the theory that one
process carrying ~29 heavy suites against a single database was the common
factor. Each process now carries 14–15 suites; the totals are unchanged (58
suites / 468 tests, nothing lost or duplicated in the redistribution).

| Run | Result |
| --- | --- |
| 4-shard pass 1 | shards 1–4 exit 0 (15/127, 15/110, 14/96, 14/135) |
| 4-shard pass 2 | shards 1–3 exit 0, **shard 4 exit 1** |

The pass-2 failure is the significant result: `booking-contention.e2e-spec.ts`
— *"lets exactly one of many parallel identical bookings win"* — reported
`Expected: 400, Received: 500`, i.e. a raced loser surfaced as 500 instead of
the 400 conflict. That suite is clean 5/5 standalone. The obvious reading — that
the exclusion-violation translation missed this loser — is an *inference from
the status code*, and the probe below is what actually tested it.

#### The obvious explanation was tested and did not survive

Two throwaway probes (written, run, then deleted — no project junk left behind)
measured the real error shapes through the production `PrismaPg` adapter:

1. A plain `23P01` carries `cause.code = '23P01'` **and** the constraint name in
   both `message` and `cause.message` (`ownKeys: [name, cause, clientVersion]`,
   `ctor: DriverAdapterError`). `isPrismaExclusionViolation` matches that shape,
   so the common path is sound.
2. Driving the actual write path under contention — 25 iterations of an 8-way
   parallel `PrismaAppointmentWriteRepository.save` on one slot (200 attempts)
   — produced **175 rejections, and every one of them was already translated**
   into the friendly `BadRequestException`/400 conflict (25 winners + 175
   rejected = 200, so the slot behaved as the invariant requires). **Zero** raw
   errors escaped the translation.

So there is no unmatched SQLSTATE shape at this concurrency, and the fix
delivered in §6 is not obviously the culprit. The shard increase **did not
eliminate the flakiness and the capacity hypothesis is not confirmed**; the
change stands on its own merits (half the suites per process, lower peak memory
per process, more CI parallelism) and **T-F1 stays open**. The remaining
candidates are resource pressure — the `pg` pool defaults to 10 connections,
and 8 parallel bookings in a process that has already run a dozen heavy suites
is exactly that shape — or a transport/timeout path. An unknown error reaching
a client as 500 is a real defect whatever the cause, so it is not dismissed as
harness noise; classifying it requires capturing the response body **and** the
pool state inside a shard run, and widening the translation util without a
captured failing shape would be guesswork.

### The capacity hypothesis was then tested directly, and refuted

The capacity candidate above is falsifiable rather than merely plausible, so a
throwaway probe (written, run, deleted) drove the **real** `PrismaPg` adapter
against an exhausted pool — `max: 2`, `connectionTimeoutMillis: 400` — with 8
parallel queries, and asked the production classifier for its verdict. The
captured shape:

```json
{
  "ctor": "Error",
  "ownKeys": ["stack", "message", "clientVersion"],
  "message": "timeout exceeded when trying to connect",
  "isKnownRequestError": false,
  "classifiedTransient": true
}
```

Three measurements, each of which cuts against the hypothesis:

1. Pool exhaustion is **not** Prisma `P2024`. It is pg's own plain `Error` with
   no `code` at all. The expected `P2024` never appears, so the hypothesis that
   `TRANSIENT_ERROR_CODES` omits it was wrong about which code fires.
2. It **is** classified transient (`isTransientPrismaError` → `true`, via the
   `'timeout'` message fallback, which pg's message contains), so it is retried
   three times before surfacing. It is not passed through untranslated.
3. In the e2e harness it cannot happen at all: `setupTestDatabase()` builds the
   pool from `createUtcPoolConfig({ connectionString })` with **no**
   `connectionTimeoutMillis`, so pg's default waits indefinitely and an
   exhausted pool **queues** rather than erroring. No `statement_timeout` is
   configured either (`createUtcPoolConfig` only sets the UTC session timezone),
   so a slow query cannot be cancelled into a 57014 either.

So pool exhaustion cannot produce the shard's `Expected: 400, Received: 500`, and
**T-F1's capacity hypothesis is refuted**. What survives is the transport/stall
path, which is consistent with the `socket hang up` in `partner-portal` — the
one observation in this section that was never a status-code mismatch at all.
The instrumentation above is what will classify it.

The probe did surface a genuine production defect on the same code path, fixed
in **§9.1**: the terminal, exhausted-retry branch rethrew the raw driver error,
which `resolveNativeError` turns into a 500 carrying the driver's own message.

### The three shard-only failures now carry their own cause

Every remaining T-F1 observation is rare, appears only inside a packed shard
run, and produced no usable evidence when it fired. Rather than keep paying to
reproduce them, each suite now captures the evidence at the moment of failure,
so the next occurrence classifies itself.

`captureE2ePressureSnapshot()` in
[`setup.ts`](../../../apps/api/test/setup.ts) opens its own `Pool` through
`createUtcPoolConfig` and returns the process heap/rss/uptime plus
`pg_stat_activity` grouped by state for `current_database()`.

| Suite | Signal now carried on failure |
| --- | --- |
| `booking-contention` | every non-400 loser's `{status, body}` plus a pressure snapshot, replacing a bare `Expected: 400, Received: 500` |
| `lab-order-abac` | the observed status **and body** of the unknown-order-id request, so a 200 says which route answered |
| `partner-portal` | transport failures are re-raised with `code`/`errno`/`syscall`/`address`/`port` plus a pressure snapshot; status mismatches keep supertest's own message |

Two constraints shaped the implementation, both found by testing the
instrumentation rather than by reading Jest's API:

- Jest's `expect` takes **one** argument. The Vitest-style
  `expect(value, 'message')` form throws `Expect takes at most one argument`.
- A `toEqual` / `toMatchObject` diff is **minimal**: a key whose expected value
  is `expect.anything()` prints as `Anything`, and `toMatchObject` omits keys
  absent from the expected object entirely. A response body or snapshot parked
  on those keys therefore never appears in the report — the first version of
  this instrumentation was correct TypeScript and printed nothing. Each site
  now raises the mismatch explicitly to carry its payload.

Verified by forcing every failure path, then reverting:

| Probe | Reported |
| --- | --- |
| `lab-order-abac` forced to expect 999 | `observed 404 with body {"message":"Lab order not found","error":"Not Found","statusCode":404}` |
| `booking-contention` losers filtered on `!== 201` | all 7 loser bodies **and** `{"heapUsedMb":463,"rssMb":797,"processUptimeSeconds":17,"dbActivity":{"active":1,"idle":12}}` |
| `partner-portal` pointed at a closed port | `connect ECONNREFUSED 127.0.0.1:1; code=ECONNREFUSED errno=-61 syscall=connect address=127.0.0.1 port=1` plus the snapshot |
| `partner-portal` status assertion forced to 402 | supertest's own `expected 402 "Payment Required", got 401 "Unauthorized"`, unwrapped — a first attempt discriminated on `status`/`response` and wrongly re-wrapped it, since an `.expect` failure carries neither |
| all three suites with mutations reverted | `tsc` exit 0; 3 suites / 29 tests, exit 0 |

**Incidental finding.** The probe surfaced that one overlap condition returns
**two different 400 bodies**, depending on which guard rejects the loser:

```json
{"detail":"Doctor has conflicting appointment","validationErrors":{"startTime":"Overlaps with appointment <id> (<window>)"}}
{"code":"APPOINTMENT_OVERLAP","detail":"Doctor has conflicting appointment"}
```

The first comes from the `CreateAppointmentUseCase` preflight, the second from
the `Appointment_no_active_overlap` exclusion constraint. Both are correct 400s
and both fire within a single run, but a client cannot rely on one shape.
Recorded as follow-up **T-F1-F3**: normalising the body is a client-visible
contract change and is deliberately not made under this row.

### Limits

- The e2e concurrency assertion can only observe a genuine race some of the
  time (2 of 4 runs under the reverted fix); the unit test is the
  deterministic guard for this branch. The e2e is the integration proof that
  the wiring holds, not the primary detector.
- The `lab-order-abac` 404 → 200 observation is **unexplained and unreproduced**
  (5 isolated runs, exit 0 each; it does not reproduce alongside the suites it
  failed with). `ClinicalService.getOrderById` throws `NotFoundException`
  unconditionally when the row is absent, so the 200 is not reachable through
  that handler. It stays open as part of **T-F1** rather than being closed on a
  guess, and the suite now reports the observed body on failure, so a recurrence
  names the answering route instead of only the status.
- A third shard observation appeared in the same sweep and is **not** explained
  by anything in this section: `partner-portal.e2e-spec.ts` → "rejects a wrong
  OTP with 401" failed once with **`socket hang up`** (a transport drop, not an
  assertion mismatch) and passes in 3 isolated runs, 15/15 each. Both suites'
  failures are therefore most consistent with a single Jest process carrying
  ~29 heavy suites against one database rather than with a per-test defect.
  Shard 2 — which holds both original flake candidates — passed exit 0 (29
  suites / 233 tests) in the same sweep. Transport failures there now report
  their connection fields and a pressure snapshot, so a recurrence is
  classifiable without another reproduction run.

### 9.1 Exhausted transient DB retries answered 500 instead of 503 — fixed 2026-10-05

Found by the probe above, on the same code path, and **independent of T-F1's
open question**: this one is reproducible and is fixed, closed here.

`PrismaRetryInterceptor` (registered as a global `APP_INTERCEPTOR`) retries
`P1000/P1001/P1008/P1017/P2028` and message-matched transient errors. When those
retries were exhausted it logged and **rethrew the original error**. The raw
driver error then fell through every resolver in `http-exception-resolution.ts`
to `resolveNativeError`, which answers:

- **500** instead of 503 — telling the client "our defect" when the truth is
  "a dependency was briefly unavailable, retry"; and
- `detail: "timeout exceeded when trying to connect"` — the raw driver message
  in the response body (AGENTS.md §6: no internal detail leakage).

Measured shape is in the probe above; the fix keeps the driver error as the
exception `cause` so logs and Sentry retain the chain while the body carries a
stable `{ message, code: 'DATABASE_UNAVAILABLE' }` contract.

The interceptor had **no test at all** before this. `prisma-retry.interceptor.spec.ts`
now pins four behaviours: retry-then-succeed, no retry on a non-transient error,
503 after exhausted retries (initial attempt + 3 retries = 4 handler runs) with
the raw message absent from the body and preserved on `cause`, and the
classification table including the measured pool-exhaustion message.

| Run | Result |
| --- | --- |
| `prisma-retry.interceptor.spec.ts` | 4/4, exit 0 |
| with the fix reverted | exit 1 — the 503 test fails, the other 3 still pass |
| API unit suite after the fix | 510 suites, 3996 tests (was 509 / 3992), exit 0 |
| e2e slice touching the global interceptor (4 suites) | 32/32, exit 0 |
| `check:as-cast-density` | exit 0 |

Client-visible, and deliberately narrow: it changes only the terminal outcome of
an already-classified transient database failure that survived 3 retries. Every
other error path is untouched.

### 9.2 Pool saturation became measurable, and the capacity hypothesis became testable — 2026-10-05

The refutation above is only possible because pool behaviour can be observed
directly. Before this increment, it could not be — which is why the T-F1
capacity question took this long to answer.

**A defect found while looking:** `GET /operations/database/status` reported
`poolConfig` from `DatabasePoolingService.getOptimalPoolConfig()`, a computed
`min: 10, max: cpuCount * 5 + 10` suggestion that **nothing applies**.
`PrismaService` builds its pool from `DATABASE_CONSTANTS.POOL_MAX_*` (15 in
production, 5 in development), so on any host with `cpuCount != 1` the
operations endpoint reported a pool size the API never used — and no saturation
at all, since a configuration is not a measurement.

`createPoolSaturationProbe` ([`packages/db/src/pool-saturation.ts`](../../../packages/db/src/pool-saturation.ts))
now reports the real counters: `max` (falling back to pg's default of 10),
`total`, `idle`, `waiting`, `saturated`, and `queuedForMs` — how long callers
have been queued for a connection. That last field is the only signal that
distinguishes "PostgreSQL is slow" from "every caller is waiting for a
connection", and it is invisible in query duration. Sampling-based by design: no
per-query cost and it cannot alter the acquire path it observes.

| Surface | Change |
| --- | --- |
| `PrismaService` | keeps the real `Pool`; `getPoolSaturation()` |
| `GET /operations/database/pooling/saturation` | new; live counters |
| `GET /operations/database/status` | `poolConfig` → `poolSaturation`, and `status` becomes `degraded` while callers queue |
| `captureE2ePressureSnapshot` | now reports the shared test pool's saturation next to `pg_stat_activity` |

`poolConfig` had no consumers anywhere in `apps/*` or `packages/*`, so the
response change breaks no client. `/pooling/config` still returns the computed
suggestion, now explicitly labelled: `authoritative: false`,
`appliesToRunningClient: false`, and a `liveEndpoint` pointer, with the same
caveat on the Swagger summary and on `DatabasePoolingService.getOptimalPoolConfig`.
Its startup log line now reads "suggestion (advisory, not applied)" instead of
"Config", which is what an operator reading logs would otherwise trust.

Verified: `pool-saturation.test.ts` 4/4 (idle pool, pg default `max`, queue
timing plus drain-and-reset, backwards clock);
`database-operations.controller.spec.ts` 5/5 (live counters, no `poolConfig` on
`/status`, `degraded` while queued, advisory labelling on `/pooling/config`).
Reverting the probe's queue reset fails 1 of 4; reverting `/status` fails 3 of 5;
removing the advisory labels fails 1 of 5.
API unit **511 suites / 4000 tests**, e2e slice 5 suites / 52 tests,
`check:as-cast-density` exit 0, `pnpm lint` and `verify:standard` exit 0 — all on
the final tree. A live probe through the real HTTP stack confirmed app bootstrap
resolves the new `PrismaService` dependency and the snapshot reports real pool
counters.

### 9.3 Saturation became a trend, not a point sample — 2026-10-05

§9.2 made saturation observable *now*, which is the wrong shape for the question
the P2 item actually asks ("across replicas and deployment overlaps"). A queue
that fills once during a deploy is noise; a queue that never drains is a limit
that must move. A single reading cannot tell those apart.

`PoolSaturationHistoryService` keeps a bounded in-memory window per replica
(120 samples, 30s interval, `unref`'d so it never holds a process open), following
the existing `SlowQueryLoggingService` pattern rather than inventing a second
one. `longestSaturationRunMs` is the signal that distinguishes the two cases, and
`windowMs` says how much of the window is actually covered.

| Surface | Change |
| --- | --- |
| `GET /operations/database/pooling/saturation/history` | new; window, samples, peaks, longest run |
| `POST /operations/database/pooling/saturation/history/clear` | new; mirrors `slow-queries/clear` |
| `CommonModule` | `PoolSaturationHistoryService` as a global provider |
| sustained-saturation alert | warns **once per saturation episode** once the queue passes 60s, re-arming on drain; also pages via the ops-alert webhook since §9.6 |

Deliberately in memory: a restart losing the window beats adding a write path to
the database being measured. Timestamps come from `CLOCK_PORT` rather than
`Date.now()`, so the window is deterministic in tests.

Verified: `pool-saturation-history.service.spec.ts` 11/11 at the time of writing
(sample on init so the window is never empty, peaks and window span, longest
unbroken run, no-run case, bound at 120 samples plus clear, interval firing,
sampler failure not fatal, and four alerting cases) — now **14/14** after §9.6
added the ops-alert emission. Each of the three behaviours that carry weight was
proven load-bearing by its own revert, each failing exactly **1 of 11** at the
time: the once-per-episode guard (the anti-storm case), the re-arm on drain, and
the longest-run calculation. `database-operations.controller.spec.ts` 7/7
including both new endpoints.
API unit **512 suites / 4010 tests**; an e2e slice booting full `AppModule`
(23 tests) confirms the new provider resolves in the real container.
`check:as-cast-density` exit 0; `pnpm lint` and `verify:standard` exit 0.

The alert threshold is two sample intervals (60s) on purpose: a queue that
drains is burst behaviour, and one sample cannot distinguish a brief spike from a
queue that is not moving.

`check:api-conformance` caught the new clear route on the way in: §5 requires an
action POST documenting 200 to declare `@HttpCode(200)`, and the check scans
**downward** from the `@Post` line. `@HttpCode` above `@Post` is invisible to it,
which is why the two sibling action routes in this same controller
(`backups/cleanup`, `slow-queries/clear`) pass only via the tracked allowlist
rather than by conforming. The new route declares `@HttpCode` below `@Post` and
is genuinely conforming — no allowlist entry added, and the check is unchanged.

### 9.4 Five allowlist entries removed; the other twelve need a decision, not a fix — 2026-10-05

The allowlist's own contract is "Fix each by adding `@HttpCode(HttpStatus.OK)`,
then delete its entry — the allowlist must never grow". All 17 entries were
audited. They are **not** one class of debt:

| Class | Count | Nature |
| --- | --- | --- |
| `@HttpCode` present but above `@Post` | 5 (all in `database-operations.controller.ts`) | ordering only — **zero wire change** |
| no `@HttpCode` anywhere | 12 (auth + patient-portal) | adding it changes the wire status **201 → 200** |

The 5 were fixed here: decorator moved below `@Post`, entries deleted, and
`ACTION_POST_ALLOWLIST_CEILING` lowered **17 → 12** so the ratchet now rejects
re-adding them. Proved in both directions:

- Entries deleted with decorators **not** reordered → `check:api-conformance`
  **exit 1**, flagging all five.
- After the reorder → **exit 0**.
- Re-adding one entry → **exit 1** with
  `[allowlist-ratchet] ACTION_POST_ALLOWLIST has 13 entries (ceiling 12)`.

An offline analysis of the 17 initially mis-classified `backup/full` as
already-conforming; the real check disagreed, and the check is authoritative.

**The remaining 12 are not mechanical debt and are deliberately not fixed here.**
The check's prescription would change the wire status on sensitive auth routes,
and existing tests pin the current behaviour: `POST /auth/login` documents 200 in
`@ApiResponse` while `auth.e2e-spec.ts:112` asserts **201**, and
`POST /auth/check-email` is asserted **201** twice in `csrf.e2e-spec.ts`
(lines 77, 88). So the docs and the tests disagree about the same route, and the
two ways to resolve it have opposite client-visible effects — correct the docs to
201, or correct the wire to 200. That is a contract decision, recorded as backlog
item **T-F1-F5** rather than taken unilaterally.

Verified: API unit **512 suites / 4010 tests**; e2e slice including all auth
suites 7 suites / 51 tests; `check:api-conformance` exit 0; `pnpm lint` and
`verify:standard` exit 0.

**Blast radius of T-F1-F5, measured rather than assumed.** The decision is
"is 201 the intended contract for these 12 routes", so the cost of flipping the
wire was measured first:

- Our own clients are unaffected. Every call path gates on `response.ok`
  (`client-factory.ts:224` and `:335`, `browser-session.ts:259`), which is true
  for any 2xx; `api-availability.ts` only special-cases 5xx.
- No committed OpenAPI or golden-response snapshot exists to invalidate.
- `/partner/auth/*` is a **different** controller (`partner-auth.controller.ts`),
  so the partner portal is not in this list despite similar route names.
- The entire in-repo cost of 201 → 200 is **three e2e expectations**:
  `auth.e2e-spec.ts:112` (`/auth/login`), `csrf.e2e-spec.ts:77` and `:88`
  (`/auth/check-email`).

So the decision reduces to a single question with a known, small internal cost,
rather than an open-ended compatibility question.

### 9.5 Cron heartbeats and outbox backlog became readable — 2026-10-05

The remaining Operational capacity clauses turned out to share one root cause:
**both backends were written but never read back.**

- `grep -rn "cronHeartbeat"` outside the decorator returned **nothing**. Every
  `@Cron` method upserts a heartbeat row (enforced by
  `check:cron-heartbeat-coverage`) and exports a Prometheus
  `cron_heartbeat_staleness_seconds` gauge — but no operator surface could answer
  "is this job still running?". A cron that silently stops leaves a `lastRunAt`
  that ages with nobody looking.
- `grep -rn "outboxEvent\."` for counts returned **nothing**. The relay records
  `attempts`, `lastError`, `nextAttemptAt` and `lastAttemptAt`, and nothing
  reported pending or retrying counts.

Queue age was already covered (`GET monitoring/queue-health` returns a rich,
Zod-typed summary with dead-letter, retry and recovery counts), so it was left
alone rather than duplicated.

`GET monitoring/background-jobs` now returns both, following the existing
`MetricsQueryService` pattern (`PrismaService` directly, try/catch degradation,
Zod contract in `packages/types` wrapped by `createZodDto`). It lives in
`BackgroundJobsHealthService`, extracted from `MetricsQueryService` when
`check:file-size-budget` rejected the addition (443 lines against a 400 budget).
The split is a responsibility boundary — durable-job health is a different
question from the HTTP-metrics queries — not a line chase; `MetricsQueryService`
delegates and is byte-identical to before on `getQueueHealthSummary`:

- `schedulers[]`: `{name, lastRunAt, lastStatus, ageMs, lastError}` plus
  `schedulerSummary` (`total`, `failing`, `oldestAgeMs`);
- `outbox`: `{pending, failing, oldestPendingAgeMs, oldestRetryAgeMs}`.

Two deliberate honesty choices:

- **No `stale` verdict.** `@TrackHeartbeat` does not record each job's cadence,
  so a single staleness threshold would be a guess. `ageMs` is reported and the
  reader judges it.
- **Ages are nullable, not zero.** An empty backend has no age, and `0` would
  read as "brand new" rather than "nothing pending". On query failure the
  payload says so explicitly: *"Treat these numbers as unknown, not as zero."*

Verified: `metrics-query.background-jobs.spec.ts` 6/6 (heartbeat mapping and
ages, outbox counts and ages, nullable-empty, future-dated row clamped to 0,
degradation note, and the response parsing against the published Zod contract).
Two behaviours proven load-bearing by separate reverts: replacing the nullable
pending age with `0` fails **2 of 6**; rewording the degradation note fails
**1 of 6**. API unit **513 suites / 4020 tests**; e2e slice booting full
`AppModule` 23/23; `check:prisma-boundary`, `check:inline-response-dto`,
`check:api-conformance`, `check:file-size-budget`, `tsc`, `pnpm lint`,
`verify:standard` all exit 0.

### 9.6 The pool alert now uses the repo's own paging path — 2026-10-05

§9.3's sustained-saturation alert was a bespoke `logger.warn`. That works, but it
is a second, weaker delivery mechanism next to one the repo already had: the
WhatsApp stale-backlog alert goes through `ApplicationEvents` →
`OpsAlertListener` → `OpsAlertService` → `OPS_ALERT_WEBHOOK_URL`. Two operators
reading two alerts would assume they are equally delivered, and a log line during
an incident is exactly the signal most likely to be lost.

Routing the pool alert through the existing path means one pager destination, one
delivery code path, and one env var — no new configuration to document and no new
thing to forget during a deploy.

| Surface | Change |
| --- | --- |
| `ApplicationEvents.POOL_SATURATION_SUSTAINED` | new; `ops.pool-saturation.sustained` |
| `OpsAlertListener.handlePoolSaturationSustained` | new handler, severity `page` |
| `PoolSaturationHistoryService` | emits the event after the existing `logger.warn` |
| `ApplicationEvents.SCHEDULER_STALE` | **reserved, deliberately not emitted** — T-F1-F6 |

Two deliberate choices:

- **`page`, not `warn`.** Raising the pool ceiling is a deploy-time change, and
  the P2 capacity note is explicit that a larger pool is not automatically
  faster. Saturation needs a human to read queue depth and duration, not a
  quieter channel.
- **The `logger.warn` stays, and the emit does not replace it.** `OpsAlertService`
  is a no-op when `OPS_ALERT_WEBHOOK_URL` is unset, so the log line is the only
  always-on signal. A test pins this rather than trusting it.

`SCHEDULER_STALE` was added at the same time and is **not** emitted. §9.5's
deliberate omission — `@TrackHeartbeat` records no per-job cadence, so
`ageMs` is reported for an operator to judge — is unchanged; emitting a staleness
event needs an owner-maintained name→interval table, recorded as **T-F1-F6**
rather than filled in with a guessed threshold. The constant is reserved and
documented so the decision is visible at the point someone would otherwise
re-add a guess.

`OpsAlertListener` had **no spec at all** — the file existed with a working
WhatsApp handler and zero tests — so the new handler needed a home, and the
missing coverage was worth closing on its own.

Verified: `ops-alert.listener.spec.ts` **4/4** — the first tests for this file,
driven through a real `EventEmitter2` by subscribing handlers via their
`@OnEvent` metadata rather than by calling them directly, so a renamed event
constant on either side breaks the tests instead of only surfacing as a missing
page during saturation. Cases: a handler exists for every declared ops-alert
event, the WhatsApp handler still warns with its counts, saturation pages with
the queue detail in `tags`, and the page text names the *connection* queue
rather than the database (the whole operator-facing point: a bigger database is
the wrong lever). Two reverts: severity `page` → `warn` fails **1 of 4**;
subscribing the saturation handler to the wrong event fails **4 of 4**.
`ops-alert.service.spec.ts` 2/2 (existing).

`pool-saturation-history.service.spec.ts` is now **14/14**: the three added cases
assert the emitted payload carries the queue detail, that emission is once per
episode exactly as the log guard is, and that the log line still appears when no
webhook is configured.

API unit **514 suites / 4027 tests**; e2e `monitoring` slice booting full
`AppModule` **20/20**; `tsc` exit 0; `check:application-event-constants`,
`check:as-cast-density`, `pnpm lint`, `verify:standard` all exit 0.

The window itself is still per-replica and in memory (§9.3), so a page fired by
one replica does not tell you which replica was saturated. Correlating that
across replicas needs either shared state or the deploy-time signal the P2 item
asks about; not attempted here.

### 9.7 The runtime version was declared in four places and disagreed in all of them — 2026-10-05

P2's *Documentation drift* row, first clause. The finding was not prose rot: it
was a live deployment defect that the docs were correctly reporting and the
build config was quietly contradicting.

| Source of truth | Node |
| --- | --- |
| `.node-version` (the tracked pin) | `22.22.0` |
| root `package.json` `engines.node` | `>=22.22.0` |
| every `setup-node` job in CI | `22.22.0` |
| **`apps/api/Dockerfile`, `apps/worker/Dockerfile`** | **`node:22.12-alpine`** |
| 7 lines across 5 markdown files | `>=22.12.0` |

Both production containers were building on a Node patch line **below** the range
the repository declared as its minimum. Everything validated in CI on 22.22.0 and
then shipped on 22.12, so no test could have caught it.

Two things were corrected before drawing a conclusion, because both would have
made the fix wrong:

- **The pin file is `.node-version`, not `.nvmrc`.** `.nvmrc` does not exist in
  this repo, and `AGENTS.md`/`SYSTEM_DESIGN_AND_PATTERNS.md` reference
  `.node-version`. An early read conflated the two and would have "fixed" a file
  that was never there.
- **`node:22.22-alpine` was confirmed published on Docker Hub (HTTP 200) before
  being pinned.** Pinning a production base image to a tag that does not exist
  would have broken every build in a way no local check catches.

Fixed: the four `FROM` lines to `node:22.22-alpine` (preserving the existing
floating `major.minor` convention rather than inventing an exact-pin policy),
and the 7 doc claims in `docs/ONBOARDING.md`, `docs/product/ONBOARDING.md`,
`docs/operations/DEPLOYMENT.md`, `docs/testing/TESTING.md` and
`docs/architecture/SYSTEM_DESIGN_AND_PATTERNS.md`. `README.md` was already
correct, which is what confirmed 22.22.0 as the intent rather than 22.12.0.

The fix alone would have decayed again, because nothing tied the four sources
together. `assertRuntimeVersionContract` now lives in the existing
`check:deployment-contracts` rather than a new script, asserting that
`.node-version` satisfies `engines.node`, that each Dockerfile `FROM` sits on the
pinned `major.minor` line, that every workflow `node-version` equals the pin, and
that no markdown file documents a Node below the floor.

The prose rule is deliberately narrow, and it was narrowed twice because it
fired on correct writing. It evaluates a Node-adjacent `X.Y.Z` token only when
the major is >= 16, because a lower number is far more likely to be an unrelated
version in the same breath (a `pnpm` pin) than a Node claim. Scanned across **115
markdown files it matches exactly 7 lines and skips 0** — the same seven this
section fixes — so it is targeted, not broad.

**The false positive it caused, and the fix.** With the rule as first written,
`verify:standard` went red on *this file*: §9.7 quotes `>=22.12.0` while
describing the drift, and the check reported
`2026-10-04-p1-acceptance-evidence.md:1100 documents Node 22.12.0`. The check was
right about the text and wrong about the file. An acceptance-evidence record
quoting the stale version it just fixed is the record working as intended;
flagging it would force the evidence to stop naming the defect it documents.

`docs/audits/` and `docs/operations/releases/` are therefore exempt as historical
records. The exemption is scoped by directory rather than by phrasing, because
"this doc is historical" is not something a regex can determine and guessing at it
would make the rule weaker everywhere. Re-probed in both directions after the
change: a current-requirement doc reverting to `>=22.12.0` still fails with
`docs/testing/TESTING.md:147 documents Node 22.12.0, below the engines.node floor
of >=22.22.0`, and this evidence record naming the old version passes.

Verified: `check:deployment-contracts` exit 0, revert-probes each naming the real
source — Dockerfile back to `22.12-alpine` fails with *"must use the pinned Node
22.22.x line"*; a current-requirement doc back to `>=22.12.0` fails with an exact
`file:line`; CI `node-version: 20.11.0` fails with *"pins Node 20.11.0, but
.node-version pins 22.22.0"*; a historical record naming the old version passes.
Every probe file restored byte-identical (`diff -q`).

The first run of the doc probe reported a pass for the wrong reason — the
replacement string omitted a backtick and the mutation never applied, so the
check was re-run against an unmodified file. Re-probed with the correct string and
it fails as intended. A probe that passes because nothing changed is not evidence.

`test:standards-checks` **242/242**, `check:standard-gate-wiring` exit 0,
`check:hygiene` exit 0, `pnpm lint` exit 0, `verify:standard` exit 0 with the new
contract executing inside it. `pnpm lint` reports the same single pre-existing
prettier warning in the other thread's `billing.module.ts`; no new warnings.

**Staging caveat, stated rather than hidden.** Both Dockerfiles also carry another
thread's unstaged `@workspace/authorization` packaging work, so they were left
unstaged rather than swept into this increment. Consequence, measured rather than
assumed: a tree built from the index alone exits **1** on this check, because the
index still holds `node:22.12-alpine`. The working tree is green and is what CI
runs, but the Dockerfile fix must be staged alongside the check or the commit
will be red on its own terms.

### 9.8 The landing contact form was 503-ing in production; restoring the proxy needed a CSRF fix too — 2026-10-05

D-F1 from the documentation audit. The disabled BFF (§9.7 finding) was restored
on the operator's decision: uncomment the proxy, restore `API_PROXY_TARGET`,
restore the four contract tests. The operator could not recall why it was
disabled, so that rationale is recorded as unrecoverable rather than invented.

**Restoring the proxy alone would not have worked, and would have made the
symptom worse.** The landing form posts `x-xsrf-token` read from
`document.cookie`, but the API sets `XSRF-TOKEN` with `httpOnly: true` on its own
host — so that read always returns `null`, the header is always `""`, and
`CsrfInterceptor`'s double-submit check rejects the POST. The honest sequence is
503 (no proxy) → **403 INVALID_CSRF_TOKEN** (proxy restored, CSRF unchanged) →
works (both restored). Nothing about the form could have been fixed from the
front end.

So the endpoint also got a CSRF exemption, mirroring the existing
`isPublicBookingWrite` precedent for "unauthenticated, may be cross-site, no
session CSRF cookie". The endpoint is `@Public()` with no session, so there is no
victim session for a double-submit to protect, and it is already throttled to
3/min by the controller.

A correction to what I told the operator before starting: `fly.toml`
`CORS_ORIGINS` is `app.docita.work,internal.docita.work` and **does not include
the landing origin**. That is fine, and is in fact the point of the BFF — the
browser calls same-origin and the Worker makes the upstream call server-side, so
CORS never applies. NestJS `enableCors` omits the header for a disallowed origin
rather than rejecting, so the forwarded request is processed normally.

| Change | Detail |
| --- | --- |
| `landing-api-proxy.ts` | restored (hop-by-hop + `access-control-*` stripping, traversal guard, query-preserving URL build) |
| `pages/api/[...path].ts` | restored proxy; no longer returns 503 |
| `wrangler.toml` | `API_PROXY_TARGET = "https://api.docita.work"` |
| `landing-api-proxy.test.ts` | 1 `it.skip` placeholder → **4 real tests** |
| `csrf.interceptor.ts` | `isPublicContactInquiry` exemption, POST-only, anchored to the one path |

**The exemption is deliberately kept out of the existing exemption branch.**
`check:webhook-csrf-exemption` pins that branch's exact contiguous shape
(`web-vitals || booking || webhook`) so `isWebhookIngress` cannot drift out of it.
Folding a fourth term in broke the check. The right fix was to satisfy the check
unchanged — the contact exemption is its own adjacent guard — rather than loosen a
check whose whole purpose is keeping the webhook bypass scoped. **The check was
not modified.**

Verified: `csrf.interceptor.spec.ts` **18/18**, adding two cases — the landing
POST passes without CSRF, and a negative case pinning the exemption to exactly
one POST route (a sibling `/contact/subscribe` and `/contact/inquiry/extra` still
throw `ForbiddenException`). Two revert-probes, each failing exactly **1 of 18**:
deleting the guard fails only the positive test; dropping the regex end-anchor so
`/contact/inquiry/extra` also bypasses fails only the negative test. Both files
restored byte-identical.

`landing-api-proxy.test.ts` **4/4**; landing suite **9 files / 42 tests**
(`1 skipped` is an unrelated file). Proof the route is genuinely wired, not just
type-correct: `build:cloudflare` succeeds and the built `dist/server/entry.mjs`
route table contains the API route, the traversal-guard string is present in
`dist/server/chunks/`, and the old `"API is currently unavailable"` string is
**absent** from the build output.

API unit **514 suites / 4029 tests** (+2); e2e `csrf-webhook-exemption` **4/4**
(the behavioural contract the check names); `tsc` 0; `astro check` 0 errors /
0 warnings over 67 files; `check:webhook-csrf-exempt` 0;
`check:deployment-contracts` 0; `pnpm lint` 0; `verify:standard` 0;
`check:hygiene` 0.

**One related gap found while verifying, recorded not fixed: D-F2.** The landing
Worker has no size gate. `check-worker-size.mjs` resolves bundles by looking for
`worker.js` or `index.js`, which is correct for the Vite SPAs but not for the
Astro landing Worker, which wrangler emits as **`entry.mjs`** — so no landing
wrapper exists and the umbrella `check:worker-size` only chains `app` (CI runs
`internal` separately at `ci.yml:321`, so the two SPAs are covered). Measured
baseline: landing `entry.mjs` is **583.2 KB gzip against the 3072 KB
Workers Free limit** — roughly 2.5 MB of headroom, so this is a missing ratchet
rather than an imminent failure.

## Evidence index

- Unit evidence output: `apps/api` jest batches — 41 + 106 + 5 suites, 1100 tests
- Integration evidence: `apps/api/test/e2e/{inventory,queue,appointments,ipd}/`
- W03 spec: [`inventory-ledger.e2e-spec.ts`](../../../apps/api/test/e2e/inventory/inventory-ledger.e2e-spec.ts)
- A01 spec: [`queue-claim-fencing.e2e-spec.ts`](../../../apps/api/test/e2e/queue/queue-claim-fencing.e2e-spec.ts)
- W01 spec: [`queue-token-allocation.e2e-spec.ts`](../../../apps/api/test/e2e/appointments/queue-token-allocation.e2e-spec.ts), [`booking-contention.e2e-spec.ts`](../../../apps/api/test/e2e/appointments/booking-contention.e2e-spec.ts), [`stale-visit-transition.e2e-spec.ts`](../../../apps/api/test/e2e/appointments/stale-visit-transition.e2e-spec.ts) (§7)
- W02 spec: [`ipd-bed-allocation.e2e-spec.ts`](../../../apps/api/test/e2e/ipd/ipd-bed-allocation.e2e-spec.ts), [`ipd-admission-ownership.e2e-spec.ts`](../../../apps/api/test/e2e/ipd/ipd-admission-ownership.e2e-spec.ts) (§8)
- U01 specs (§5): [`ai-credit-admission.e2e-spec.ts`](../../../apps/api/test/e2e/billing/ai-credit-admission.e2e-spec.ts), [`ai-credit-http.e2e-spec.ts`](../../../apps/api/test/e2e/billing/ai-credit-http.e2e-spec.ts), [`usage-event-idempotency.e2e-spec.ts`](../../../apps/api/test/e2e/billing/usage-event-idempotency.e2e-spec.ts), [`plan-change-access.e2e-spec.ts`](../../../apps/api/test/e2e/tier-gating/plan-change-access.e2e-spec.ts)
- Backlog: [`DOCITA_IMPROVEMENT_BACKLOG.md`](../DOCITA_IMPROVEMENT_BACKLOG.md)
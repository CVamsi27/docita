# P02 evidence — public booking is a candidate, final booking is authorized (2026-10-04)

Dated evidence for the P02 row of
[`docs/operations/DOCITA_IMPROVEMENT_BACKLOG.md`](../DOCITA_IMPROVEMENT_BACKLOG.md)
("Booking/product — practitioner verification and anonymous requests need dated
identity/consent/abuse controls. Keep verification evidence scoped and dated;
test final booking conflicts, enumeration and recovery.").

Acceptance claim under test: **public availability is only a candidate; final
booking is authorized and conflicts are controlled.**

Everything below was executed locally on 2026-10-04 against docker Postgres
(`docita_test`, port 5434) and the unit environment. Items that are not
enforced in code are listed under **Residual limitations** rather than implied
as fixed.

## 1. Where each half of the claim is enforced

| Claim | Enforcement point | Evidence |
| --- | --- | --- |
| A public submission is a candidate | `POST /public/booking/clinics/:referralCode/requests` files a `PENDING` `AppointmentRequest` and creates no `Appointment` | e2e "files a PENDING request and books nothing until the clinic approves" |
| The slot is held while pending | Unique `AppointmentRequest.pendingSlotKey` = sha256(clinic, patient, doctor, slot start); `findPendingBySlotKey` is scoped to `status = PENDING` | migration `20261003080000_appointment_request_pending_slot_hold`; repo spec "looks up a slot hold among pending requests only" |
| Retry/double-tap cannot file a second request | Pre-check by slot key, plus a P2002 recovery that returns the winning row | unit "returns the existing pending request for a retried submission…"; e2e "returns the same request when the same patient retries the same slot" |
| Concurrent identical submissions resolve to one request | Same unique index against Postgres (no application-level lock) | e2e "resolves concurrent identical submissions to a single held request" |
| The hold is identity-scoped, not a global slot lock | Key includes `patientId`, so another patient's request is separate and never returned | e2e "lets another patient request the same slot without exposing the first request" |
| The clinic authorizes the final booking | `approveRequest` claims the request with `markReviewed({ expectedStatus: PENDING })` before creating the appointment; a lost claim is a `ConflictException`, not a second booking | unit "does not book anything when a concurrent reviewer claimed the request first"; e2e "books exactly one appointment when two reviewers approve concurrently" |
| Review settles the hold (recovery) | `markReviewed` clears `pendingSlotKey` | repo spec "clears the slot hold when a review settles the request"; e2e "frees the hold when a review settles the request, so the patient can ask again" |
| Verification evidence is dated | Every verification write stamps `verificationCheckedAt` plus `verificationSource`/`verificationReason`/`verificationRef`; admin overrides also stamp `verifiedByAdminId`/`verifiedByAdminAt` and write an audit row before the user-row mutation | `doctor-verification.service.ts`, `doctor-admin-verification-command.service.ts` (reviewed during this item; unchanged) |
| Verification/registration data is not publicly enumerable | The public doctor payload is `{ id, name, specialization }` only; a departed (inactive `DoctorClinic` link) or soft-deleted doctor is neither listed nor accepted for a slot hold; a doctor of another clinic is not listed and slot probing for them is rejected | e2e "lists only doctors still working at the clinic, with a scoped payload", "refuses to hold a slot for a soft-deleted doctor", "rejects slot probes for a doctor outside the clinic" |

Code moved for this item:

- `packages/db/prisma/schema.prisma` — `AppointmentRequest.pendingSlotKey` + unique index, with the hold semantics documented on the field.
- `apps/api/src/shared/common/prisma/unique-constraint.ts` — shared P2002 helper, now normalizing SQL-quoted field names reported by the Prisma 7 driver adapter (see §6).
- `apps/api/src/shared/common/prisma/doctor-clinic-membership.ts` — one membership predicate (live account with this clinic, or active link to a live account) used by the appointment-request repository and public slot probing.
- `apps/api/src/domains/doctors/application/services/doctors-query.service.ts` — `findAll` now lists only active clinic links to live accounts (this list feeds both staff pickers and public booking).

## 2. Commands and results

| Command | Result |
| --- | --- |
| `npx jest --silent` (`apps/api`) | **506 suites / 3949 tests passed, exit 0** |
| `npx jest --config ./test/jest-e2e.json --runInBand --forceExit --testPathPatterns=public-booking` | **2 suites / 14 tests passed, exit 0** (9 in `public-booking-slot-hold.e2e-spec.ts`, 5 in the existing controller suite) |
| `python3 /tmp/mut-p02.py` (16 mutants) | **16/16 caught, exit 0** — killers per mutant in §3 |
| `node scripts/checks/check-facade-delegation.mjs --enforce` | exit 0 (was failing on three services — see §4) |
| `npx jest --config ./test/jest-e2e.json --runInBand --testPathPatterns='lab-result-release\|insurance-claim-submission\|code-catalog-sync'` | **3 suites / 38 tests passed, exit 0** (refactored services) |
| `pnpm check:duplication` | **0 clones** (the two membership copies were extracted into the shared helper to remove an 11-line clone) |
| `pnpm --filter @docita/api run check-types` | exit 0 |
| `pnpm lint` | exit 0 (no errors; warnings are pre-existing files outside this item) |
| Migration verification | scratch DB `docita_p02_scratch`: `prisma migrate deploy` applied all 174 migrations, then `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → `No difference detected.` (exit 0) |

### Identity, consent and abuse controls (existing suites, reviewed for this item)

The anonymous-request half of the P02 row is already enforced and unit-covered;
no new work was needed here, so these suites are cited rather than modified:

- `public-booking-submit.service.spec.ts` — DPDP consent is required for a new
  patient, a stale notice version is rejected, date of birth is required, and a
  booking verification token must match the resolved clinic, patient and phone.
- `public-booking-creation.service.spec.ts` — an OTP is never issued for a
  number that is not on file (privacy-preserving answer), OTPs are hashed with
  a 10-minute expiry, the atomic attempt cap is enforced, and the response is
  generic even when the WhatsApp send fails.
- `public-booking-token.service.spec.ts` — signing/verifying is bound to the
  `public_booking` purpose, the public-booking audience, expiry and the required
  identity claims.

Re-run the item evidence with:

```bash
cd apps/api
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testPathPatterns=public-booking
```

### Migration note

`pendingSlotKey` is nullable, so every pre-existing row starts `NULL`. `NULL`
never conflicts under a unique index, so no historical row is reclassified as
holding a slot and no backfill was required (contrast with the I01 backfill).
The index is created in
`packages/db/prisma/migrations/20261003080000_appointment_request_pending_slot_hold/migration.sql`.

## 3. Mutation sweep (P02 predicates)

Baseline for the seven focused suites: 80 passed. All 16 mutants were caught
(`/tmp/mut-p02.py`, `/tmp/mut-p02.log`).

| Mutant | Killed by |
| --- | --- |
| M1 drop pending pre-check | command spec: retried submission / stored key / P2002 winner |
| M2 drop P2002 recovery | command spec: P2002 recovery returns the winner |
| M3 drop `pendingSlotKey` from create | command spec: stores a slot hold key |
| M4 widen key to clinic-only | command spec: does not dedupe another patient, doctor, or time |
| M5 key without doctor | command spec: skips the hold when the request names no doctor |
| M6 key without slot start | command spec: skips the hold when the request names no slot |
| M7 `markReviewed` keeps the hold | repo spec: clears the slot hold on review |
| M8 `findPendingBySlotKey` ignores status | repo spec: pending-only lookup |
| M9 `findPendingBySlotKey` ignores the key | repo spec: pending-only lookup |
| M10 `findAll` ignores inactive link | doctors-query spec: active links and live accounts |
| M11 `findAll` ignores link's `deletedAt` | doctors-query spec: active links and live accounts |
| M12 `findAll` ignores user `deletedAt` | doctors-query spec: active links and live accounts |
| M13 membership ignores user `deletedAt` | slots spec: rejects a doctor that neither works at nor is linked to the clinic |
| M14 membership ignores inactive link | slots spec: same |
| M15 membership ignores link's `deletedAt` | slots spec: same |
| M16 P2002 helper keeps SQL quotes | unique-constraint spec: normalizes SQL-quoted field names |

## 4. Standards gate: facade-delegation failures fixed

Running `pnpm verify:standard` on this change set failed
`check:facade-delegation` on three services that are business logic rather than
facades:

| Service | Was | Fix |
| --- | --- | --- |
| `medical-code-sync.service.ts` | 255 lines, system wiring mixed with the run engine | split into a per-system facade + `MedicalCodeSyncRunnerService` (run ledger, stream orchestration) + pure `medical-code-sync-batch.helpers.ts` (dedupe, change selection, batching) |
| `lab-result-release.service.ts` | 302 lines, release authorization mixed with notification delivery | split into `LabResultReleaseService` (claim, 404 semantics, retry sweep) + `LabResultNotificationService` (claim, send, settle, terminal outcomes) |
| `insurance-claim-submission.service.ts` | 334 lines, filing mixed with insurer-decision recording | split into `InsuranceClaimSubmissionCommandService` (file + retry) and `InsuranceClaimDecisionCommandService` (record an insurer decision with its reference) |

All six resulting `*.service.ts` files are below the 200-line threshold (or are
recognized command services), the pre-existing unit and e2e suites for all three
flows pass unchanged in behaviour (38/38 e2e, full unit suite in section 2), and
`check:facade-delegation` passes.

## 5. Unreachable recovery paths found and wired

While splitting the services, a real gap surfaced: **the retry sweeps and the
insurer-decision recording existed but nothing in production called them.**
Only the e2e specs invoked `retryPendingNotifications()`,
`retryPendingSubmissions()` and `recordInsurerDecision()`, so a crashed or
timed-out delivery would have stayed permanently outstanding — the recovery
these capabilities claim to provide was unreachable.

Fixed by wiring the two delivery sweeps to worker crons (the API process does
not enable schedulers; the worker does):

| Job | Schedule constant | Cron class | Heartbeat |
| --- | --- | --- | --- |
| Lab result notification retry | `LAB_RESULT_NOTIFICATION_RETRY` (`*/5 * * * *`) | `LabResultNotificationRetryCron` in `ClinicalSchedulerModule` | `clinical.lab-result-notification-retry` |
| Insurance claim submission retry | `CLAIM_SUBMISSION_RETRY` (`*/15 * * * *`) | `InsuranceClaimSubmissionRetryCron` in the new `InsuranceClaimsSchedulerModule` | `insurance.claim-submission-retry` |

Cadence is deliberately wider than each claim lease (5 min / 10 min) so a sweep
does not re-claim a row another worker is still holding. Each cron has a spec
proving it delegates to the sweep and propagates failures to the heartbeat.

`recordInsurerDecision` is still not reachable from a route or job. Exposing it
is an API/product decision (which role may record an insurer decision, and on
which endpoint), so it is reported rather than invented here; the method stays
unit- and e2e-covered so the contract is ready when the route is agreed.

## 6. Defect found and fixed while producing this evidence

The e2e suite caught a real production bug: Prisma 7 against Postgres reports
the constrained column as `"pendingSlotKey"` **including SQL quotes**, so the
P2002 recovery never matched and a concurrent duplicate submission surfaced as
a 500 instead of returning the winning request. The shared helper now strips
surrounding quotes from reported field names; the unit spec covers both the
classic `meta.target` and driver-adapter `cause.constraint.fields` shapes with
quoted values. This is the class of bug the e2e layer exists to find — the
unit-level mutant sweep alone could not have caught it, because the quoted
shape only appears against the real database.

## 7. Residual limitations (not fixed here)

- **Unverified doctors are still listed publicly.** The public list is not
  filtered by `verificationStatus`; the compensating controls are the clinic's
  explicit approval of every request and the fact that prescribing requires
  `VERIFIED` plus a stored signature. Hiding unverified practitioners from
  public booking would be a product decision (default `verificationStatus` is
  `UNVERIFIED`, so filtering would empty the page for clinics that have not
  completed NMC/HPR verification). Flagged for product sign-off, not assumed.
- **`doctorId: 'any'` slot listing** still walks existing `DoctorSchedule` rows
  for the clinic without re-checking the doctor's liveness; a departed doctor's
  stale schedule row can therefore still show slots in the unassigned view.
  Naming that doctor explicitly is rejected, and the public list omits them. A
  schedule-level join is the follow-up fix if product wants it.
- **Rate-limit counters are per replica** (unchanged from earlier phases), and
  NestJS throttling is skipped when `NODE_ENV=test`.
- **No real insurer/registry round-trip** is exercised here: NMC/HPR
  verification is stubbed at the provider boundary in tests; the dated stamps
  are asserted from code review, not from a live registry response.
- The backlog row itself is owned by the Phase 6 documentation pass and is not
  edited by this record.
- The insurer-decision recording path (`recordInsurerDecision`) has no route or
  job yet, so a real insurer denial/settlement cannot be entered in production
  until that API decision is made.

## 8. Standards-gate remediation completed 2026-10-04

`pnpm verify:standard` now passes end-to-end (128/128 checks, exit 0). The
final pass beyond the P02 fixes above closed these findings:

| Finding | Fix |
| --- | --- |
| `check:file-size-budget`: `postgres-queue.service.ts` 524 lines | extracted claim acknowledgment, stale recovery and execution-history recording into `queue-job-lifecycle.ts` (177 lines); the service is now 375 lines |
| `check:as-cast-density`: `as Prisma.QueueTokenUncheckedCreateInput` | the cast hid a wrong contract: `allocateToken` assigns `tokenNumber` and `tokenDay` itself inside the advisory-locked transaction. New `QueueTokenAllocationInput = Omit<..., 'tokenNumber' \| 'tokenDay'>` states what callers actually own |
| `check:as-cast-density`: `outcome.status as LabResultNotificationStatus` | removed: the outcome union is a subset of the Prisma enum, so the assertion was redundant |
| `check:as-cast-density`: `request.headers as Record<string, unknown>` | `readCorrelationHeader` accepts `unknown` and narrows with `isRecord` |
| `check:auth-tenant-safety`: non-async `runUnrestricted(() => ...)` callbacks | wrapped in `async` in the telemetry recorder; the queue-job repository helper now calls `runUnrestricted(async () => query())` so the lazy Prisma promise is created inside the bypass context |
| `check:rls-bypass-annotation`: unannotated calls in a `Promise.all` | each bypass now carries its own `// RLS-BYPASS: platform telemetry health` attribution |
| `check:audit-logging`: `payment-capture-reconciliation.service.ts` | marked `// AuditLogged:` because every recovery persists the provider payload on the session through the shared atomic capture path |
| `check:jsx-literal-density`: +18 literals | all drift came from one rewritten English-only internal admin page (`system-monitoring-page.tsx`, 25 → 43). `apps/internal` has no i18n bundle by design, so `t()` is unavailable; baseline regenerated (867 → 885) after confirming this was the only changed per-file count |

Verification for this pass: `pnpm verify:standard` exit 0; API unit 506 suites /
3949 tests; queue e2e 2 suites / 14 tests; telemetry e2e 1 suite / 20 tests;
`pnpm lint` exit 0; `pnpm check:duplication` 0 clones;
`pnpm check:circular:enforce` pass.

## Evidence index

- e2e: [`apps/api/test/e2e/public-booking/public-booking-slot-hold.e2e-spec.ts`](../../../apps/api/test/e2e/public-booking/public-booking-slot-hold.e2e-spec.ts)
- Unit: [`appointment-request-command.service.spec.ts`](../../../apps/api/src/domains/appointments/application/services/appointment-request-command.service.spec.ts),
  [`prisma-appointment-request.repository.spec.ts`](../../../apps/api/src/domains/appointments/infrastructure/repositories/prisma-appointment-request.repository.spec.ts),
  [`doctors-query.service.spec.ts`](../../../apps/api/src/domains/doctors/application/services/doctors-query.service.spec.ts),
  [`public-booking-slots.service.spec.ts`](../../../apps/api/src/domains/public-booking/application/services/public-booking-slots.service.spec.ts),
  [`unique-constraint.spec.ts`](../../../apps/api/src/shared/common/prisma/unique-constraint.spec.ts)
- Migration: [`20261003080000_appointment_request_pending_slot_hold`](../../../packages/db/prisma/migrations/20261003080000_appointment_request_pending_slot_hold/migration.sql)
- Harness: `/tmp/mut-p02.py` (16 mutants, `--anchors` validates all anchors before a run); raw logs `/tmp/mut-p02.log`, `/tmp/api-unit-p02.txt`

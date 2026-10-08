# Appointment overlap contract acceptance — 8 October 2026

Status: **verified locally; deployment not performed**. Scope: T-F1-F3 in the
[backlog](../DOCITA_IMPROVEMENT_BACKLOG.md), implemented from the approved roadmap
and [file-level plan](../2026-10-08-appointment-conflict-plan.md).

## Behavior and regression evidence

Doctor/time overlaps now return HTTP 400 with `APPOINTMENT_OVERLAP`, the existing
friendly detail and a required keyed `validationErrors.startTime` map. Both the
preflight and PostgreSQL exclusion paths use one schema-validated exception
factory. The production filter recognizes this specific 400 payload and retains
its fields; previously it discarded the detail/map. Shared data-access parses the
canonical RFC response, while preserving the existing fallback for legacy and
unrelated errors. A recognized payload's unknown extra properties are stripped.

The preflight's conflicting appointment ID/window is replaced with the same
friendly guidance used for a database loser. The status code, successful booking,
terminal-state behavior, retry semantics, idempotency, auth and tenant constraints
are preserved. No database schema or data backfill is needed.

Before implementation, the regression run failed six unit assertions across three
suites: missing preflight code/consistent guidance, missing repository field maps,
and the actual filter dropping fields. The real-database HTTP suite failed four
of five cases, while ordinary sequential bookings remained green. Schema tests
failed because the shared contract was absent; the client normalization test failed
because unknown response properties were not stripped.

The deterministic database loser test executes the real scheduling read, inserts
a real competing row with its exact UTC bounds, then returns that original read
result. The subsequent request loses to PostgreSQL's exclusion constraint. The
spy is restored in `finally`. This proves the database race path without depending
on which parallel request happens to win. The HTTP suite mounts the real
`AllExceptionsFilter`, unlike the previous Nest-default test bootstrap.

## Checks

| Check                                                  | Result                                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Full API Jest suite                                    | PASS: 514 suites, 4,033 tests                                                                               |
| Focused API regressions                                | PASS: 3 suites, 17 tests                                                                                    |
| Shared types Vitest                                    | PASS: 23 files, 151 tests                                                                                   |
| Shared data-access Vitest                              | PASS: 14 files, 130 tests, including existing partner error handling                                        |
| Booking-contention PostgreSQL E2E, Node 22.22.0 / 4 GB | PASS: 5/5, including preflight, deterministic race, parallel winners/losers and ordinary sequential booking |
| All-workspace typechecks                               | PASS: 29/29 tasks, seven cached                                                                             |
| Lint                                                   | PASS: 11/11 tasks, six cached                                                                               |
| Standards                                              | PASS, including 68 check regressions; the optional missing-latency-baseline skip remains explicit           |
| Knip                                                   | PASS: no findings                                                                                           |
| Prisma boundary                                        | PASS; five already tracked legacy service uses remain, no new violation                                     |
| Shared types/data-access and API builds                | PASS                                                                                                        |
| Whole-repository build                                 | PASS: 35/35 tasks, 30 cached                                                                                |

The initial post-edit data-access run read stale built schema exports and failed
five cases with `undefined.safeParse`; rebuilding `@workspace/types` before its
consumer resolved them. No test assertion or parser fallback was disabled.

The database tests wrote only into the newly owned disposable PostgreSQL 16
container `docita-codex-overlap-20261008` on localhost port 5547. No production
credentials or PHI were used. The owned fixture was retained for the subsequent auth compatibility checks,
then stopped and removed after those checks.
No UI markup changed, so this batch does not refresh the clinician accessibility
matrix or claim the earlier authenticated clinician audit gaps are closed.

## Remaining boundaries

The prior [stabilization release blockers](2026-10-08-stabilization-validation.md)
remain: three dependency advisories, production credentials, required staging
latency evidence and provider/production-role release proof. Dependencies were
not changed in this slice; the prior audit is a dated result, not a rerun claim.
This focused booking run does not repeat the previous 59-suite API E2E sweep or
close the separate intermittent transport/stall investigation T-F1.

Appointment terminal transitions/retry policy, IPD production duplicate
reconciliation, structured movement history, finance/retention/provider choices
and the broader clinician UI/feature roadmap remain open. No push, merge or
production deployment is part of this local batch.

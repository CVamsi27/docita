# Auth status documentation acceptance — 8 October 2026

Status: **verified locally; deployment not performed**. Scope: T-F1-F5 in the
[backlog](../DOCITA_IMPROVEMENT_BACKLOG.md), implemented from the approved roadmap
and [file-level plan](../2026-10-08-auth-status-plan.md).

## Compatibility decision

The twelve existing auth POSTs retain their actual HTTP 201 success behavior.
Only their Swagger success metadata changes from 200 to 201; bodies, cookies,
HTTP errors, auth/CSRF/tenant guards and onboarding are unchanged. The session
validation GET remains 200. Nest's installed `RouterResponseController` confirms
POST defaults to 201, and the six affected controllers have no explicit status
or manual response override on these handlers. The [API reference](../../architecture/API_DOCUMENTATION.md#existing-auth-success-statuses)
lists all twelve routes; [API design §5](../../architecture/API_DESIGN_STANDARD.md#5-status-code-rules)
records the narrow compatibility exception. New action POSTs still require
explicit HTTP 200. A future auth wire-status change requires separate review.

The conformance allowlist and its ceiling shrink from twelve to **zero**. The
first standards run caught an existing test fixture expecting the old portal OTP
allowance. That fixture now requires the mismatch to fail and accurate HTTP 201
metadata to pass; gate enforcement is strengthened rather than suppressed.

## Checks

| Command / check                                  | Result                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `pnpm check:api-conformance`                     | PASS: no allowances                                        |
| `pnpm verify:standard`                           | PASS: 68 check regressions; optional latency baseline skip |
| `pnpm --filter @docita/api run check-types`      | PASS: source and spec typechecks                           |
| `pnpm --filter @docita/api run build`            | PASS, including shared prerequisites                       |
| `pnpm lint`                                      | PASS: 11/11 tasks, ten cached                              |
| `pnpm knip`                                      | PASS: no findings                                          |
| Focused real-PostgreSQL E2E, Node 22.22.0 / 4 GB | PASS: 3 suites, 11 tests                                   |

The E2E command was `pnpm --filter @docita/api exec jest --config test/jest-e2e.json
--runInBand --detectOpenHandles --forceExit --runTestsByPath
 test/e2e/auth/auth.e2e-spec.ts test/e2e/auth/csrf.e2e-spec.ts
 test/e2e/patient-portal/patient-portal-otp.e2e-spec.ts`. It used the owned
PostgreSQL 16 fixture on localhost 5547. Login/check-email HTTP 201 assertions and
negative auth/CSRF checks pass unchanged. The portal OTP suite exercises real
service/repository single-use claims; it does not separately verify every portal
HTTP status or live delivery provider.

The preceding appointment slice passed all 4,033 API unit tests and the 35-task
repository build before this Swagger metadata batch. Those results are recorded
in its [acceptance record](2026-10-08-appointment-conflict-validation.md), not
claimed as a fresh whole-repository test/build run here. This batch changes no
UI markup, dependencies or database schema.

## Remaining boundaries

The prior [release blockers](2026-10-08-stabilization-validation.md) remain:
three dependency advisories, production credentials, required staging latency
and provider/production-role proof. The optional latency baseline skip remains
explicit; it is not deployment evidence. No push, merge or deployment occurred.
Broader clinical/financial policy decisions and clinician UI/feature work remain
in the [roadmap](../2026-10-07-improvement-roadmap.md).

The owned `docita-codex-overlap-20261008` container was stopped and removed after
these tests. The user's PostgreSQL on port 5432 was untouched.

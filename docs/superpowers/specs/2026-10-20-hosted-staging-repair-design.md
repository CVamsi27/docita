# Hosted staging transaction and latency-capture repair proposal

**Status:** proposed for approval; no implementation change or production release
is included. This follows the
[hosted validation record](../../audits/2026-10-20-hosted-staging-continuation.md).

## Observed failures

The reviewed staging API accepts one real Turnstile verification and the owned
synthetic clinician's sign-in. Today, Consultation and Patients render expected
empty states, and an internal-only API endpoint rejects that clinician with 403.
Appointments instead displays request-loading errors. Sequential authenticated
API reads pass, but a separate eight-request patient-list burst has zero
successes: one 503, one 403 and six client timeouts after 15 seconds. During the
burst, all five API database connections are idle in transactions. Readiness
later recovers without a provider restart.

The source trace points to awaited audit work acquiring another connection from
the same pool while the enclosing tenant transaction holds one. The synchronous
`AuditService` unconditionally leaves the active transaction; genuine background
audit paths also need to leave an expired request transaction. These two
lifetimes need explicit handling rather than a larger pool or weaker auditing.

The latency producer requests a ten-minute, 30/minute capture but schedules its
last request at 106 seconds, including 264 requests in one 60-second window.
The hosted run finishes in 185.72 seconds with two throttle observations, then
reports its rate using the requested 600 seconds. Its `complete: true` result is
not accepted as a ten-minute release baseline. No baseline is committed.

## Constraints and intended behavior

- Keep the existing Free staging service, restricted database role, RLS,
  authorization, audit persistence and current SLO thresholds.
- Preserve the stopped/cordoned production API, stopped worker, disabled
  production deployment paths and disabled backups.
- Keep synthetic fixtures isolated. Do not copy production PHI, print tokens,
  send live alerts, replay signed payment events or access the offline identity.
- Complete source changes on the existing main-based feature branch and review
  through its PR. Do not create a third feature branch or deploy an unreviewed
  runtime correction.

## Approaches

The recommended approach reuses the live tenant transaction for awaited audits,
retains explicit detachment at asynchronous audit boundaries, and repairs the
existing latency producer. It keeps connection ownership and measurement
provenance in the components already responsible for them.

An alternative is a dedicated audit connection pool plus an external load
runner. This separates resource contention and pacing, but adds another pool,
another measurement implementation and more memory requirements on the same Free
instance. It would need additional lifecycle, monitoring and dependency work.

## Recommended design

### Awaited audit work

Keep synchronous audit validation and persistence on the current request's
RLS-scoped transaction when one exists. Keep normal client behavior for callers
without an active transaction. Retain the audit service's existing authorization
and tenant constraints; do not add a bypass or swallow audit errors.

Move detachment responsibility to genuine fire-and-forget boundaries, including
the sensitive-write audit interceptor. The domain-event audit listener already
has an explicit detached boundary. Check all callers before changing the
default, so work that outlives a response never uses an expired transaction.

Regression evidence must show concurrent audited reads finish with a small
bounded pool, failed audited writes roll back with their transaction, detached
audits survive request completion, and denied tenant/role cases stay denied.

### Latency capture

Apply the global rate cap when producing the request schedule, alongside each
route's minimum interval. Enforce pacing at actual dispatch as well, including
retries and late wakeups, so concurrency cannot create a catch-up burst.

Record actual start/end times and elapsed duration, and calculate the observed
rate from that duration. Honor the requested observation window; a shortened or
under-sampled run must not claim a complete soak. Preserve class coverage,
warmups, timeout/throttle reporting, no-body/no-credential evidence and refusal
to convert incomplete captures. Do not change budgets to make a run pass.

Regression evidence must cover rolling rate limits, per-route intervals,
concurrency, delayed workers, retry pacing, observation-window coverage and
reported elapsed time/rate. Use a controlled clock for deterministic tests.

## Validation and rollout

Write reproducing regressions before each implementation change. Run the
focused API/audit/RLS and capture tests, relevant typechecks and repository
checks, plus the API E2E command required by AGENTS.md before publication.
Retain the provider failures as evidence rather than replacing them with mocks.

After reviewed source acceptance and PR-only staging alignment, release only the
affected Free staging candidate. Repeat real session/role checks, the parallel
read case and an honestly paced capture. Record exact code, configuration,
fixture volume and measured limitations. An empty synthetic clinic cannot prove
production-volume capacity. Production recovery, offline proof, clinical restore,
backup cadence and observation retain their independent gates.

If the runtime correction regresses staging, use the recorded reviewed candidate
or suspend staging; do not weaken tenant/audit checks or upgrade a plan. A
capture-tool regression invalidates its evidence and requires a corrected rerun.

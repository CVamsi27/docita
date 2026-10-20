# Stability, Reliability & Performance Runbook

**20 October hosted continuation:** the reviewed candidate is Live on the existing
Render Free staging service, with seven passing HTTP checks and both frontend
readiness proxies returning 200. Direct Node startup uses a 256 MiB heap.
Real Turnstile/sign-in and basic role checks subsequently pass, but parallel
authenticated reads fail with connection contention. The capture producer's
pacing/duration defect invalidates its attempted ten-minute soak. Full clinical
journeys, capacity and valid performance evidence remain open. Cloudflare
Workers Builds independently deployed the clinician/internal production frontends
from main; both identified automatic build paths are now disabled and verified
after reload. Production API/worker recovery and backup activation remain
gated. The [hosted continuation](../audits/2026-10-20-hosted-staging-continuation.md)
supersedes earlier provider-access and deployment-origin statements below.

**20 October final pass:** the recorded PR revision has 14 successes and three
scope skips; production remains in maintenance and is not certified ready.
The Sentry test monitor and dedicated email rule are disabled after 27 unintended
rule triggers. No additional live test sends are authorized. See the
[current gate record](../audits/2026-10-20-final-stability-pass.md) and
[incident runbook](RUNBOOKS/backup-alert-test.md). Earlier monitoring/billing
blockers below are historical and do not override current gates.

**19 October maintenance override:** the operator requires zero total hosting
spend. The API is stopped/cordoned, the worker remains stopped, and automatic
deployment, daily worker and uptime recovery workflows are disabled. Render
staging remains suspended with Auto-Deploy Off. The operator chose retaining Fly
machines while verifying gross usage below $5 and the personal-org waiver.
Signed-in checks now verify GitHub $0 hard budgets, Cloudflare/Sentry Free plans
and $0 current Cloudflare cost. Fly is at $0.15 gross with historical $0 invoices;
rootfs forecasting and R2 overage containment remain open.
Follow [ZERO_HOSTING_SPEND.md](ZERO_HOSTING_SPEND.md) for current controls and
restart gates. Do not use the historical liveness/monitoring statements below
as evidence of current availability or start a service to satisfy a probe.

**Current assessment, 15 October 2026:** follow the [two-month stability plan](../superpowers/plans/2026-10-13-two-month-stability.md)
for the feature freeze and current readiness status. The custom-domain certificate
and stale DNS ownership records were repaired: repeated direct/public/proxied
liveness and readiness checks return 200. Fly CI secrets were replaced with
verified app-scoped credentials. Synthetic monitoring is enabled and the three
probes pass locally with the repaired monitor credentials. Hosted jobs cannot
start because of GitHub billing/spending restrictions; alert delivery and
recovery/performance release evidence remain incomplete. See the [current repair
evidence](../audits/2026-10-13-stability-repair-evidence.md). Source fixes have not
yet been released, and local gates do not certify production stability. Treat the test counts,
hosting/capacity figures and monitoring claims below as historical until remeasured.
Use [SLOS.md](SLOS.md) for canonical API latency values and
[DEPLOYMENT.md](DEPLOYMENT.md#roll-back-a-bad-release) for rollback policy; verify
schema compatibility and never infer a safe production migration rollback from
the historical `down.sql` guidance here.

Historical baseline: **2026-08-05**, superseded by the dated operating records
above. This doc complements [`RUNBOOKS.md`](RUNBOOKS.md) for incident response
and [`SLOS.md`](SLOS.md) for performance targets. It owns prevention: what we do
_before_ incidents to keep them rare, small, and reversible.

> The Docita production stack is HIPAA-adjacent (PHI). Stability work is
> patient-safety work: a slow consultation page is a clinician waiting; a
> dropped audit log is a compliance gap. This runbook treats both as
> incidents.

---

## 1. SLOs (target: published, budgeted, alerted)

Defined per surface. Violations trigger the alert → runbook chain in §3.

| Surface                    | Metric                                                      | Target (p95, 7-day) | Budget per quarter | Owner    |
| -------------------------- | ----------------------------------------------------------- | ------------------- | ------------------ | -------- |
| API — auth                 | login, refresh, logout latency                              | ≤ 300ms             | 99.5%              | Backend  |
| API — CRUD (single record) | patients, appointments, invoices, prescriptions, lab orders | ≤ 200ms             | 99.5%              | Backend  |
| API — CRUD (paged list)    | paginated ≤ 50 rows                                         | ≤ 400ms             | 99.0%              | Backend  |
| API — search               | full-text patient search                                    | ≤ 600ms             | 99.0%              | Backend  |
| API — reports / PDF        | consultation summary, invoice                               | ≤ 1500ms (async OK) | 99.0%              | Backend  |
| API — webhooks             | signature verify + dedupe                                   | ≤ 100ms             | 99.9%              | Backend  |
| API — availability         | `/api/health/live` 200s                                     | 99.9% / 30-day      | 99.9%              | Backend  |
| Worker — queue drain       | scheduled job latency                                       | ≤ 60s p99           | 99.0%              | Backend  |
| Worker — PDF generation    | end-to-end document                                         | ≤ 30s p95           | 99.0%              | Backend  |
| App — initial load (LCP)   | `apps/app`, `apps/internal`                                 | ≤ 2.5s p75          | 99.0%              | Frontend |
| App — INP                  | any interactive flow                                        | ≤ 200ms p75         | 99.0%              | Frontend |
| App — CLS                  | any page                                                    | ≤ 0.1 p75           | 99.0%              | Frontend |
| App — TTFB                 | first byte from Worker proxy                                | ≤ 800ms p75         | 99.0%              | Frontend |
| App — error rate (Sentry)  | unhandled exceptions                                        | ≤ 0.1% sessions     | 99.9%              | Frontend |
| App — offline / PWA        | static asset hit (Worker cache)                             | 99.5%               | 99.5%              | Frontend |

**Where these are enforced**:

- API latency: `pnpm check:api-latency-budget` (new in P5.9, see
  [`POST_CUTOVER_GAPS.md` §4](../analysis/POST_CUTOVER_GAPS.md))
- Bundle size: `pnpm perf:route-budgets` (Vite-aware, dist/assets scan)
- Worker bundle: `pnpm check:worker-size` (must emit `index.js`, not
  `worker.js`)
- Web Vitals: `pnpm check:web-vitals` (P5.8)
- Uptime sampling: GitHub Actions (`pnpm monitor:synthetic`, three daily runs).
  Minute-level uptime and Datadog alerting are not verified by this runner.

**Quarterly budget burn**: 0.5% of the budget is "spent" per SLO breach
exceeding 5 minutes; breaches shorter than 5 min are noise. If burn rate
exceeds 50% by mid-quarter, page the on-call for triage.

---

## 2. Error budgets

Each SLO has an error budget: `1 - target`. E.g. 99.9% availability allows
~43 minutes of downtime per month. When the budget is exhausted, releases
that don't demonstrably fix the breach are paused.

| SLO class        | Budget per 30 days            | Fast-burn alert (>2x in 1h) | Slow-burn alert (>1x in 24h) |
| ---------------- | ----------------------------- | --------------------------- | ---------------------------- |
| API availability | 43m 50s                       | Yes → page                  | Yes → ticket                 |
| API latency p95  | 50% of 200ms = 100ms headroom | Yes → page                  | Yes → ticket                 |
| App LCP p75      | 0.5s headroom                 | Yes → page                  | Yes → ticket                 |
| App error rate   | 0.1% of sessions              | Yes → page                  | Yes → ticket                 |

**Pause rule**: if a single change burns >10% of any budget in 1h, the
release is paused pending rollback decision (§5). The burn rate is computed
from Datadog and validated against the staging soak.

---

## 3. Alerts → Runbook chain

Every alert has:

1. **Trigger** — the SLO breach threshold.
2. **Severity** — `SEV1` (patient impact, page), `SEV2` (degraded, ticket),
   `SEV3` (cosmetic, ticket).
3. **Primary runbook** — the doc to open first.
4. **Owner** — who gets paged.

| Alert                          | SEV | Runbook                                                                                                      | Owner           |
| ------------------------------ | --- | ------------------------------------------------------------------------------------------------------------ | --------------- |
| API 5xx > 0.5%                 | 1   | [`playbooks/db-connection-exhaustion.md`](../operations/playbooks/db-connection-exhaustion.md) (first guess) | Backend on-call |
| API p95 > 1s for 5m            | 2   | [`RUNBOOKS.md`](../operations/RUNBOOKS.md) §"Slow API"                                                       | Backend         |
| Worker queue lag > 5m          | 2   | [`playbooks/pdf-queue-backlog.md`](../operations/playbooks/pdf-queue-backlog.md)                             | Backend         |
| App LCP p75 > 4s for 30m       | 2   | `RUNBOOKS.md` §"Slow frontend"                                                                               | Frontend        |
| App error rate > 0.5%          | 1   | Sentry project alert → triage in #incident-frontend                                                          | Frontend        |
| Cloudflare 5xx > 1%            | 1   | [`playbooks/cloudflare-upstream-timeout.md`](../operations/playbooks/cloudflare-upstream-timeout.md)         | Release eng     |
| Razorpay webhook failures > 1% | 1   | [`playbooks/razorpay-outage.md`](../operations/playbooks/razorpay-outage.md)                                 | Backend         |
| OpenAI rate limit              | 2   | [`playbooks/openai-rate-limit.md`](../operations/playbooks/openai-rate-limit.md)                             | Backend         |
| Postgres connections > 80%     | 1   | [`playbooks/db-connection-exhaustion.md`](../operations/playbooks/db-connection-exhaustion.md)               | Backend         |
| Sentry scrubber regression     | 1   | `check:sentry-scrubbing` + `check:sentry-scrubber-parity`                                                    | Backend         |
| Audit log write failure        | 1   | `RUNBOOKS.md` §"Audit gap" (PHI implication)                                                                 | Backend         |
| PHI read without audit         | 1   | `check:phi-read-audit` (static) + runtime alert on missing `VIEW_*` event                                    | Compliance      |
| Webhook signature fail > 5%    | 1   | `RUNBOOKS.md` §"Webhook integrity"                                                                           | Backend         |
| RLS policy change              | 1   | [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md)                                                             | Backend         |

---

## 4. Pre-deployment stability gates (mandatory)

A release cannot ship unless **all** of the following are green for the
current `main` HEAD:

1. **Static gates** — `pnpm verify:standard` exits 0. Includes 100+ checks
   (lint, types, tests, contracts, security, accessibility, performance
   budgets, hygiene).
2. **Unit tests** — `pnpm --filter @docita/api test` (3000+), `pnpm --filter
@docita/app test` (697+), `pnpm --filter @docita/internal
test` (48+).
3. **E2E** — `pnpm --filter @docita/api run test:e2e` (23 suites, 143+ tests).
4. **Cloudflare build** — run the production Cloudflare build for each
   touched app (`pnpm --filter @docita/app run build:cloudflare`, or the
   same with `@docita/internal` / `@docita/landing`) before deployment;
   CI enforces the same builds (jobs: §7.8).
5. **Staging smoke** — `pnpm monitor:synthetic` (5 probes).
6. **Dependency audit** — `pnpm audit --audit-level=high` exits 0.
7. **Migration reversibility** — `pnpm check:migration-reversibility` for any
   new `prisma migrate` output.
8. **Suppression ledger** — any new allow-file / ignore entry is added to
   [`SUPPRESSION_LEDGER.md`](../analysis/SUPPRESSION_LEDGER.md) with rationale.

The release evidence index is in
[`RELEASE_EVIDENCE_CHECKLIST.md`](../operations/RELEASE_EVIDENCE_CHECKLIST.md).

---

## 5. Rollback plan (mandatory per release)

Every release PR must include a rollback section:

- **API**: select a known-good recorded image and verify current schema/config
  compatibility, then run `pnpm rollback:fly --config fly.toml --image "$RECORDED_API_IMAGE"`.
- **Worker**: apply the same check to its own image, then run
  `pnpm rollback:fly --config apps/worker/fly.toml --image "$RECORDED_WORKER_IMAGE"`.
  The helper reads app/region, preserves API blue-green versus worker rolling
  strategy, and skips release commands. Config/secrets stay current.
- **Web apps**: select an explicit known-good Worker version using the affected
  workspace's Wrangler config/environment, or use dashboard deployment recovery.
  These are Cloudflare Workers with Static Assets, not Pages. Commands and
  asset/binding checks live in [DEPLOYMENT.md](DEPLOYMENT.md#frontend-cloudflare-workers).
- **Database**: prefer a reviewed additive forward correction. A migration
  reversibility check or historical `down.sql` is not authorization or evidence
  that automatic schema reversal is safe in production.
- **Secrets**: keep values in protected custody; record only variable names
  and version references, following [SECRET_ROTATION_CHECKLIST.md](SECRET_ROTATION_CHECKLIST.md).

The release evidence checklist records SHA, deploy time, executed recovery
command, selected image/Worker version, config revision, compatibility evidence,
health/alert results and on-call contact. Do not close an incident from a deploy
success message alone.

---

## 6. Capacity and spending boundary

Use the verified inventory and spending limits in
[ZERO_HOSTING_SPEND.md](ZERO_HOSTING_SPEND.md). Production uses Neon Free, two
retained stopped Fly machines and Cloudflare/R2. Render staging is suspended.
There is no verified autoscaling or measured live headroom in this maintenance
state. Before restart, measure the reviewed candidate within the operator's
spending constraints; do not apply historical RDS or larger-instance proposals.

R2 storage and operations must remain within included allowances; its budget
alert is not a hard cap. Do not apply an assumed 90-day PHI expiry rule. The
[backup policy](ENCRYPTED_DATABASE_BACKUPS.md) and
[lifecycle decision](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md)
define the approved backup retention and restore quarantine boundary. Clinical
document retention is a separate data-class decision.

---

## 7. Common production failure patterns (and the fix)

### 7.1 N+1 query in list endpoint

**Symptom**: API p95 spikes on `/patients` list once the dataset crosses 10K rows.

**Fix**: `pnpm check:n-plus-1` (already wired). Every list endpoint must
load relations in a single `include` or a batched follow-up; the static
check flags the obvious shape (`for (const x of rows) await fetch(y)`).

**Owner**: Backend. **Detection**: 24h after first dataset crossing.

### 7.2 React Query cache thrash on navigation

**Symptom**: app LCP p75 spikes when clinicians navigate quickly between
patients.

**Fix**: profile with React DevTools and tune `staleTime` / `gcTime` on the
query key factory. Record measured results in the
[release evidence](RELEASE_EVIDENCE_CHECKLIST.md); historical audit claims do not
establish current live performance.

**Owner**: Frontend. **Detection**: post-release monitor.

### 7.3 Webhook signature gap

**Symptom**: a payment provider starts sending unsigned or
incorrectly-signed webhooks; the API 401s and retries pile up at the
provider.

**Fix**: [`playbooks/razorpay-outage.md`](../operations/playbooks/razorpay-outage.md).
The provider has a "replay all failed deliveries" button; we hold the
backoff, drain the queue, then resume normal processing.

**Owner**: Backend. **Detection**: provider outage alert.

### 7.4 Cold-start

**Symptom**: API first-request after idle > 5m is slow (200-800ms p95) due
to Fly.io machine scale-to-zero.

**Fix**: 1-min keepalive ping via `pnpm monitor:synthetic`. The staging
deploy uses the same probe; production adopts it in P5.16.

**Owner**: Release eng. **Detection**: monitor alert.

### 7.5 CSRF double-submit regression

**Symptom**: legitimate POSTs from the app fail with 403. The CSRF
interceptor (in apps/api) requires both the cookie and the header; if a new
proxy strips the header, every request breaks.

**Fix**: `check:webhook-csrf-exemption` (P5.12, live 2026-08-06) and the e2e
spec `csrf-webhook-exemption.e2e-spec.ts`. The interceptor exemption for
`/webhooks/*` POST is locked behind a comment + a `failAlways` static gate
that rejects any widening (unanchored path, non-POST method, or movement
into the auth-bootstrap path), plus a 4-case e2e spec proving signature
checks fire before CSRF and the negative control (non-webhook mutation)
still 403s.

**Owner**: Backend. **Detection**: a/b test or staging smoke.

### 7.6 PHI redaction regression

**Symptom**: a Sentry event contains a patient name, phone, or Aadhaar.

**Fix**: `check:sentry-scrubbing` + `check:sentry-scrubber-parity`. The
scrubber list is updated when new PHI surfaces appear; both checks verify
the scrubber list covers the data-access layer output.

**Owner**: Backend. **Detection**: Sentry alert (sample event review).

### 7.7 RLS policy bypass

**Symptom**: a Prisma query returns rows from another tenant.

**Fix**: [`check:rls-rollout-readiness`](../compliance/RLS_ROLLOUT.md)
enforces the bypass annotation; `check:rls-bypass-annotation` greps the
codebase. Every `prisma.$queryRaw` with `BYPASSRLS` must have a one-line
rationale and a test.

**Owner**: Backend. **Detection**: e2e multi-tenant fixture.

### 7.8 Worker bundle regrowth

**Symptom**: `pnpm check:worker-size` starts failing because a new
dependency bloats the Worker.

**Fix**: `check:worker-size` enforces a 3584 KB gzip budget per Worker
bundle and chains `app` + `internal` + `landing`. The `app-quality` /
`internal-quality` / `landing-quality` jobs are where CI runs all of it:
the `build:cloudflare` builds (§4 item 4) and the per-app caps via
`check:worker-size:app` / `:internal` / `:landing` (not
`verify:standard`). Three known offenders (preact, aws-sdk, sharp) are
documented in
[`worker-bundle-pre-existing-overage.md`](../operations/worker-bundle-pre-existing-overage.md).

**Owner**: Frontend. **Detection**: CI.

---

## 8. Quarterly stability review

Every quarter, refresh:

1. SLOs (§1) — re-baseline from the last 90 days.
2. Error budget burn (§2) — confirm the budget was not exhausted.
3. Alert chain (§3) — add any new alerts, retire any that haven't fired in
   90 days.
4. Pre-deploy gates (§4) — re-run the full set, retire any that haven't
   caught a regression in 90 days.
5. Rollback rehearsals (§5) — do at least one rollback drill per quarter.
6. Capacity review (§6) — re-measure and update the plans.
7. Failure pattern list (§7) — add any new pattern; retire any not seen in
   90 days.

Output: a 2-page report in `docs/audits/<date>-quarterly-stability.md`. The
report is referenced from the [stability plan](../superpowers/plans/2026-10-13-two-month-stability.md)
and updates the corresponding operating gates.

---

## 9. References

- [`RUNBOOKS.md`](../operations/RUNBOOKS.md) — incident response.
- [`DEPLOYMENT.md`](../operations/DEPLOYMENT.md) — release flow.
- [`SYNTHETIC_MONITORING.md`](../operations/SYNTHETIC_MONITORING.md) — uptime
  probes.
- [`RATE_LIMITS.md`](../operations/RATE_LIMITS.md) — API rate limit policy.
- [`WEBSOCKET_SCALING.md`](../operations/WEBSOCKET_SCALING.md) — socket.io
  scaling.
- [`DR_RUNBOOK.md`](../operations/DR_RUNBOOK.md) — disaster recovery.
- [`POST_CUTOVER_GAPS.md` §3-4](../analysis/POST_CUTOVER_GAPS.md) — Web
  Vitals + API latency SLOs (P5.8, P5.9).

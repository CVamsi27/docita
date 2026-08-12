# Stability, Reliability & Performance Runbook

Point-in-time: **2026-08-05**. Owner: this doc complements
[`RUNBOOKS.md`](RUNBOOKS.md) (which owns incident response) and
[`PERFORMANCE_ANALYSIS.md`](../analysis/PERFORMANCE_ANALYSIS.md) (which owns
hot-path inventories). This doc owns the **prevention** side: what we do
*before* incidents to keep them rare, small, and reversible.

> The Docita production stack is HIPAA-adjacent (PHI). Stability work is
> patient-safety work: a slow consultation page is a clinician waiting; a
> dropped audit log is a compliance gap. This runbook treats both as
> incidents.

---

## 1. SLOs (target: published, budgeted, alerted)

Defined per surface. Violations trigger the alert → runbook chain in §3.

| Surface                        | Metric                          | Target (p95, 7-day) | Budget per quarter | Owner        |
| ------------------------------ | ------------------------------- | ------------------- | ------------------ | ------------ |
| API — auth                     | login, refresh, logout latency  | ≤ 300ms             | 99.5%              | Backend      |
| API — CRUD (single record)     | patients, appointments, invoices, prescriptions, lab orders | ≤ 200ms | 99.5% | Backend |
| API — CRUD (paged list)        | paginated ≤ 50 rows             | ≤ 400ms             | 99.0%              | Backend      |
| API — search                   | full-text patient search        | ≤ 600ms             | 99.0%              | Backend      |
| API — reports / PDF            | consultation summary, invoice   | ≤ 1500ms (async OK) | 99.0%              | Backend      |
| API — webhooks                 | signature verify + dedupe       | ≤ 100ms             | 99.9%              | Backend      |
| API — availability             | `/health` 200s                  | 99.9% / 30-day     | 99.9%              | Backend      |
| Worker — queue drain           | scheduled job latency           | ≤ 60s p99          | 99.0%              | Backend      |
| Worker — PDF generation        | end-to-end document            | ≤ 30s p95          | 99.0%              | Backend      |
| App — initial load (LCP)       | `apps/app`, `apps/internal` | ≤ 2.5s p75      | 99.0%              | Frontend     |
| App — INP                      | any interactive flow            | ≤ 200ms p75         | 99.0%              | Frontend     |
| App — CLS                      | any page                        | ≤ 0.1 p75           | 99.0%              | Frontend     |
| App — TTFB                     | first byte from Worker proxy    | ≤ 800ms p75         | 99.0%              | Frontend     |
| App — error rate (Sentry)      | unhandled exceptions            | ≤ 0.1% sessions     | 99.9%              | Frontend     |
| App — offline / PWA            | static asset hit (Worker cache) | 99.5%              | 99.5%              | Frontend     |

**Where these are enforced**:

- API latency: `pnpm check:api-latency-budget` (new in P5.9, see
  [`POST_CUTOVER_GAPS.md` §4](../analysis/POST_CUTOVER_GAPS.md))
- Bundle size: `pnpm check:route-budgets` (Vite-aware, dist/assets scan)
- Worker bundle: `pnpm check:worker-size` (must emit `index.js`, not
  `worker.js`)
- Web Vitals: `pnpm check:web-vitals` (P5.8)
- Uptime: Datadog synthetic monitor (`pnpm monitor:synthetic`)

**Quarterly budget burn**: 0.5% of the budget is "spent" per SLO breach
exceeding 5 minutes; breaches shorter than 5 min are noise. If burn rate
exceeds 50% by mid-quarter, page the on-call for triage.

---

## 2. Error budgets

Each SLO has an error budget: `1 - target`. E.g. 99.9% availability allows
~43 minutes of downtime per month. When the budget is exhausted, releases
that don't demonstrably fix the breach are paused.

| SLO class           | Budget per 30 days | Fast-burn alert (>2x in 1h) | Slow-burn alert (>1x in 24h) |
| ------------------- | ----------------- | -------------------------- | --------------------------- |
| API availability    | 43m 50s           | Yes → page                 | Yes → ticket                |
| API latency p95     | 50% of 200ms = 100ms headroom | Yes → page         | Yes → ticket                |
| App LCP p75         | 0.5s headroom     | Yes → page                 | Yes → ticket                |
| App error rate      | 0.1% of sessions  | Yes → page                 | Yes → ticket                |

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

| Alert                              | SEV | Runbook                                                    | Owner    |
| ---------------------------------- | --- | ---------------------------------------------------------- | -------- |
| API 5xx > 0.5%                     | 1   | [`playbooks/db-connection-exhaustion.md`](../operations/playbooks/db-connection-exhaustion.md) (first guess) | Backend on-call |
| API p95 > 1s for 5m                | 2   | [`RUNBOOKS.md`](../operations/RUNBOOKS.md) §"Slow API"    | Backend  |
| Worker queue lag > 5m              | 2   | [`playbooks/pdf-queue-backlog.md`](../operations/playbooks/pdf-queue-backlog.md) | Backend  |
| App LCP p75 > 4s for 30m           | 2   | `RUNBOOKS.md` §"Slow frontend"                              | Frontend |
| App error rate > 0.5%              | 1   | Sentry project alert → triage in #incident-frontend         | Frontend |
| Cloudflare 5xx > 1%                | 1   | [`playbooks/cloudflare-upstream-timeout.md`](../operations/playbooks/cloudflare-upstream-timeout.md) | Release eng |
| Razorpay webhook failures > 1%     | 1   | [`playbooks/razorpay-outage.md`](../operations/playbooks/razorpay-outage.md) | Backend  |
| OpenAI rate limit                  | 2   | [`playbooks/openai-rate-limit.md`](../operations/playbooks/openai-rate-limit.md) | Backend  |
| Postgres connections > 80%         | 1   | [`playbooks/db-connection-exhaustion.md`](../operations/playbooks/db-connection-exhaustion.md) | Backend  |
| Sentry scrubber regression         | 1   | `check:sentry-scrubbing` + `check:sentry-scrubber-parity`   | Backend  |
| Audit log write failure            | 1   | `RUNBOOKS.md` §"Audit gap" (PHI implication)               | Backend  |
| PHI read without audit             | 1   | `check:phi-read-audit` (static) + runtime alert on missing `VIEW_*` event | Compliance |
| Webhook signature fail > 5%        | 1   | `RUNBOOKS.md` §"Webhook integrity"                          | Backend  |
| RLS policy change                  | 1   | [`RLS_ROLLOUT.md`](../compliance/RLS_ROLLOUT.md)            | Backend  |

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
4. **Cloudflare build** — `pnpm build:cloudflare:production` for the touched
   apps.
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

- **API**: `fly releases rollback` (Fly.io keeps the previous machine
  image). The previous deploy SHA is recorded in the release evidence
  checklist.
- **Worker**: same as API, scoped to `apps/worker/fly.toml`.
- **Web apps**: `wrangler rollback` (Cloudflare Pages) — instant, no
  rebuild. Migrations: `pnpm --filter @workspace/db run db:migrate:down`
  (only for reversible migrations; irreversible migrations require a
  forward fix).
- **DB migration rollback**: every Prisma migration ships with a tested
  `down.sql`. `pnpm check:migration-reversibility` enforces this.

The release evidence checklist records: SHA, deploy time, rollback command,
rollback target, on-call contact.

---

## 6. Capacity & growth

- **DB**: t4g.micro today (~100 connections; ~30% headroom at current
  load). Plan: t4g.small at 2× connection count, RDS proxy at 3×.
  Tracked in [`COST_ANALYSIS.md`](../analysis/COST_ANALYSIS.md).
- **API**: Fly.io 2 GB shared-cpu-1x, scale-out on CPU > 70% for 5m. Current
  baseline: 0.3 vCPU avg. Headroom: ~6×.
- **Worker**: 512 MB, scale-out on queue lag > 60s. Current: 0 idle. Plan:
  2× at 2× queue lag.
- **R2**: pay-as-you-go; no headroom needed; lifecycle rule expires PHI
  uploads at 90 days per DPDP_READINESS.
- **Cloudflare**: no hard cap; the constraint is route-budgets (P5.4c) and
  Worker size (≤ 1 MB compressed, current ~9 KB).

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

**Fix**: profile with React DevTools; tune `staleTime` / `gcTime` on the
query key factory. Already audited in P4.5; the live numbers are in
[`PERFORMANCE_ANALYSIS.md`](../analysis/PERFORMANCE_ANALYSIS.md).

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

**Fix**: `check:worker-size` (10 KB budget) wired to `verify:standard`.
Three known offenders (preact, aws-sdk, sharp) are documented in
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
report is referenced from [`EXECUTION_PLAN.md`](../analysis/EXECUTION_PLAN.md)
and triggers a P5.x refresh.

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

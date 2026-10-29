# Stability, Reliability & Performance Runbook

**28 October documentation refresh:** source checked at base `f3fddffc0`; corrected
API target alignment, event/time error-budget arithmetic, evidence/gate scope and
unsafe automatic recovery assumptions. No provider account, production SQL,
service lifecycle or live alert was changed. The dated operating records below
retain their own dates and do not independently verify today's tier or bill.

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

> Docita handles protected clinical information. Stability work includes
> patient-safety concerns: a slow consultation page is a clinician waiting; a
> dropped audit log is a compliance gap. This runbook treats both as
> incidents.

---

## 1. Define the service and the observation boundary

The dated maintenance records above remain controlling. Source definitions,
proposed thresholds, local tests, deployed collectors and delivered alerts are
separate facts. The 28 October documentation check did not start production,
activate schedules, send a test notification or certify an uptime window.

Use [SLOS.md](SLOS.md) and `scripts/checks/api-latency-slos.mjs` as the canonical
API latency contract rather than maintaining conflicting numbers here:

| Class | Current published P95 target | P99 target when defined | Measurement boundary |
| --- | --- | --- | --- |
| auth | 300 ms | Not specified | Declared authenticated route mix; the soak samples session validation, not every login/refresh path |
| crud | 200 ms | 500 ms | Declared patient/appointment read samples; separate clinical writes need their own tests |
| search | 400 ms | Not specified | Declared paginated search workload and data distribution |
| reports | 1,500 ms | Not specified | Declared report response; asynchronous PDF enqueue-to-artifact completion is a separate metric |
| webhooks | 100 ms | Not specified | Ingress only; the current soak probes invalid-signature rejection, not successful financial processing |

These are targets, not achieved results. Keep window, dataset, traffic mix,
route distribution, sample counts, cache/resource state and capture coverage
with a result. Do not average route or replica percentiles into a platform
percentile. The current source supports no conclusion that every class was
measured by a retained complete baseline.

Define additional service objectives explicitly before using them:

| Objective | Eligible good/bad observations | Missing-data boundary |
| --- | --- | --- |
| User-operation availability | A declared supported operation produces the correct authorized result versus a declared eligible failure/timeout | Successful liveness probes do not establish clinical workflow availability; intentional authorization denials need a stated rule |
| Worker completion | Unique eligible logical jobs complete their intended effect within the stated deadline versus terminal failure or unresolved deadline miss | Current queue depth omits cleaned-up history and is not a completed-job latency distribution |
| Document availability | The correct document is stored and retrievable by its authorized recipient within the declared interval | Metadata marked COMPLETED does not alone prove readable content, object existence or delivery |
| Frontend experience | Declared route/device population for LCP, INP and CLS under current performance-budget definitions | Sampled Web Vitals need coverage/device mix; a build or synthetic fetch is not real-user performance |
| Session reliability | Declared sessions with the intended usable experience versus eligible unhandled/user-blocking failures | Sentry event count is not the total session denominator, and disabled/sampled collection creates uncertainty |

Check source tools according to their actual scope:

- API latency uses `pnpm check:api-latency-budget`; its default and `--enforce`
  modes can skip an absent baseline. A release declaring that budget must use
  `pnpm check:api-latency-budget --require-baseline`. Missing, stale or incomplete
  evidence remains blocked rather than green.
- Route, Worker bundle and Web Vitals tools inspect their configured artifacts
  and budgets: `pnpm perf:route-budgets`, `pnpm check:worker-size` and
  `pnpm check:web-vitals`. Inspect each command's output for absent artifacts or
  skipped data; presence of a package script is not an executed performance test.
- `pnpm monitor:synthetic` defines probe behavior. The historical three-runs/day
  schedule does not give minute-level uptime, measure every request or prove
  that the schedule is currently enabled. The dated production schedules are
  disabled; a probe must not wake stopped services during an audit.
- Datadog collection and paging are not established by this source inspection.
  Treat references to them as design candidates until account configuration,
  coverage and delivered-notification evidence are retained.

---

## 2. Calculate error budgets from eligible events or known time

An error budget is an allowed fraction of **defined bad outcomes**. It is not
latency headroom measured in milliseconds, and one breach does not consume an
arbitrary fixed percentage.

For a chosen evaluation interval `T`, target success fraction `S`, `N(T)` eligible
observations and `B(T)` bad observations:

```text
allowed bad outcomes = N(T) × (1 - S)
observed bad fraction = B(T) / N(T)
budget consumed       = B(T) / [N(T) × (1 - S)]
burn rate in window w = [B(w) / N(w)] / (1 - S)
```

For example, an explicitly hypothetical 99.9% event-success target across 100,000
eligible operations allows 100 bad outcomes. Twenty bad outcomes consume 20% of
that budget, with overall burn 0.2×. A five-minute failure's cost depends on the
eligible work it affected; short incidents are not automatically noise.

A P95 ≤200 ms target describes the upper part of a latency distribution. If an
operator instead adopts an event objective such as at least 95% of defined
operations completing successfully within 200 ms, its slow/failed-event fraction
can have a 5% budget. That is a **proposed event contract**, with explicit timeout,
error, exclusion and instrumentation rules, not an automatically implemented
interpretation of the existing staging percentile ratchet. Successful latency
samples alone cannot hide failed or unobserved operations.

Time-based availability is a different contract. For a continuous, fully
observed 30-day period, 99.9% allows **43 minutes 12 seconds** unavailable:
`30 × 24 × 60 × 0.001 = 43.2 minutes`. A sparse probe schedule cannot identify all
unavailable intervals at that precision. Record measured, inferred and unknown
time separately; never treat the unobserved gap between two successful probes
as verified uptime.

### Proposed multi-window decisions

Choose thresholds from service impact and observed volume before activating an
alert. The following is a review template, not evidence of a deployed rule:

| Decision | Longer window | Confirming shorter window | Required conditions |
| --- | --- | --- | --- |
| Fast-burn investigation/page candidate | 1 hour above a reviewed burn threshold | 5 minutes above the same threshold | Adequate eligible observations, meaningful absolute bad count, usable capture and sustained current impact |
| Slow-burn investigation/ticket candidate | 24 hours above a reviewed burn threshold | 1 hour confirms continued degradation | Matching event definition/target, coverage, volume and an owned corrective action |
| Severe correctness incident | Confirmed tenant isolation breach, duplicate or lost financial effects, or blocked clinical work | Do not wait for a percentile window | Contain scope and invoke the incident owner independently of aggregate budget burn |

A zero denominator produces **unavailable**, not 0% error. Low volume can make
ratios unstable; use an explicitly justified longer observation window or an
appropriate black-box correctness check, and retain raw counts. Missing telemetry
requires investigation rather than an inferred success rate. Evaluate both
windows from equivalent event definitions and sample populations.

Burn rate is a normalized rate, not a fixed debit per incident. With nonuniform
traffic, do not multiply a request-based burn value by elapsed-time share and
assume the result is the fraction of the full budget spent; compare actual bad
counts against the declared evaluation population. Define the release-pause,
rollback review and resumption rules against that measured scope. There is no
verified Datadog feed or automatic error-budget release control established here.

---

## 3. Connect a proposed alert to an operational decision

Every candidate rule needs a metric definition, eligible population/window,
minimum usable observations, threshold, severity, runbook, owner and escalation
route. Record evaluation/deduplication behavior, notification delivery, recovery
condition and the bounded test that verified it. The table is a routing guide;
its existence does not activate alerts or certify delivery.

| Signal to qualify | First investigation | Runbook and owner |
| --- | --- | --- |
| Eligible API failures or slow operations | Route mix, user impact, trace, pool/lock waits, event-loop/memory pressure and dependency outcomes; do not assume the database is the cause | [Incident response](RUNBOOKS.md) and, when supported by evidence, [DB exhaustion](playbooks/db-connection-exhaustion.md); backend |
| Unfinished PDF work or old claims | Worker state/heartbeat, per-name queue outcomes, renderer/storage boundary and old unresolved work | [PDF backlog](playbooks/pdf-queue-backlog.md); backend |
| Frontend degradation | Device/route sample, browser/network work, rendering and proxy response | [Incident response](RUNBOOKS.md); frontend |
| Proxy/upstream failures | Distinguish edge rejection from backend timeout or unavailable process | [Cloudflare upstream](playbooks/cloudflare-upstream-timeout.md); release owner |
| Payment/provider uncertainty | Signature/authentication, provider receipt, merchant identity and existing financial outcome before replay | [Razorpay](playbooks/razorpay-outage.md); backend/billing |
| AI provider quota/failure | Enabled feature, consent, quota, retry budget and user-visible fallback | [OpenAI rate limit](playbooks/openai-rate-limit.md); feature owner |
| Database resource pressure | Actual role, connection/pool wait, locks, storage and CPU/I/O metrics | [DB exhaustion](playbooks/db-connection-exhaustion.md); backend |
| Suspected PHI exposure, audit gap or wrong-tenant result | Contain access, preserve protected evidence and verify the affected authority/audit boundary | [Incident response](RUNBOOKS.md) and [RLS rollout](../compliance/RLS_ROLLOUT.md); backend/compliance |

Static scrubber, signature and audit checks establish their named source
properties; they are not runtime missing-event detectors. Keep proposed runtime
rules separate from actually configured collectors and delivered notifications.
The Sentry test monitor/email rule remains disabled under the dated containment
record; do not send another test merely to populate a green checklist.

---

## 4. Pre-deployment stability evidence

Use the recorded application revision and [release evidence checklist](RELEASE_EVIDENCE_CHECKLIST.md).
A passing focused check cannot replace an unrelated required gate, and a skipped
or credential-blocked check is not a successful verification of its subject.

1. Run `pnpm verify:standard` and record its exact result. This is a chain of
   repository invariants; it does not automatically run every lint, type,
   unit/E2E or live performance check. The 28 October capacity pass stopped at the
   existing stale disabled daily-worker schedule. The final source pass documents
   that intentional maintenance hold in [RB-16](RUNBOOKS.md#rb-16-daily-worker-intentionally-held-during-maintenance); its guard exemption applies only
   while live state is `disabled_manually`, with regression cases for re-enabled
   and unrelated stale workflows. No schedule was enabled to satisfy the check.
2. Run relevant lint, type and unit/component suites separately for affected
   workspaces. Record current counts and scope rather than reusing historical
   hardcoded totals. Test output must distinguish passing, skipped and failed.
3. Use the approved isolated E2E target and read its setup before
   `pnpm --filter @docita/api run test:e2e`. The ordinary E2E setup can change
   schema/data; never point it at an arbitrary environment. A dedicated metrics
   SQL fixture is not full API/E2E evidence.
4. Build each touched Cloudflare app using its canonical `build:cloudflare`
   command, then inspect actual artifacts and relevant bundle/route budgets.
   Source workflow definitions do not prove the enabled hosted pipeline ran.
5. Retain real staging-soak provenance and run the required API-baseline mode.
   As of the 28 October capacity evidence, that baseline is absent. Its SLO target
   values must not be inserted as measurements. A controlled GET soak still
   leaves writes, jobs, providers, failure recovery and deployment limits to test.
6. A live synthetic smoke needs an approved target, provider effect boundary and
   permitted service state. Stopped/cordoned production is not a smoke target to
   wake without an operating decision. Report actual probe outcomes and coverage.
7. Run the applicable dependency, migration compatibility/reversibility and
   suppression-ledger checks. A static migration reverse-file check does not
   establish a safe live rollback or restore.
8. Verify the current maintenance/cost controls, non-owner tenant enforcement,
   backup/object/key custody, complete restore scope, alert delivery and operator
   coverage required for the promised service. Prepared tooling alone leaves its
   operating acceptance incomplete.

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
[ZERO_HOSTING_SPEND.md](ZERO_HOSTING_SPEND.md). The 15 October record identified
Neon Free; the 28 October check reconfirmed Neon
as the temporary provider but did not independently establish its current tier,
compute, storage or bill. Two Fly machines were retained stopped in Singapore.
Render staging remains suspended in the dated maintenance record; reverify its
state before any approved change.
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

### 7.1 Repeated database work in a list endpoint

**Symptom to investigate:** a list slows with data size or request concurrency.
Inspect actual query counts/plans and row/relationship selection before naming
N+1 as the cause. A source loop is one possible mechanism, not the only one.

**Action:** use `pnpm check:n-plus-1` for its static patterns, then measure the
relevant operation. Batch related reads or adjust the query/index/projection
where evidence supports it; a single Prisma `include` does not guarantee one
SQL statement or acceptable query cost. Retain the changed-case result.

**Owner:** backend. **Detection:** measured query/resource/route behavior;
there is no guaranteed 10,000-row threshold or 24-hour detection delay.

### 7.2 React Query cache thrash on navigation

**Symptom**: app LCP p75 spikes when clinicians navigate quickly between
patients.

**Fix**: profile with React DevTools and tune `staleTime` / `gcTime` on the
query key factory. Record measured results in the
[release evidence](RELEASE_EVIDENCE_CHECKLIST.md); historical audit claims do not
establish current live performance.

**Owner**: Frontend. **Detection**: retained browser/profile observations;
collector deployment and coverage require separate verification.

### 7.3 Webhook signature or provider delivery failure

**Symptom to investigate:** rejected provider deliveries or unresolved financial
state. Validate merchant ownership, signature inputs/secrets and the provider's
actual retry/delivery evidence without weakening signature checks.

**Action:** follow [Razorpay investigation](playbooks/razorpay-outage.md), then
reconcile existing captures/local effects before a bounded authorized replay.
Do not assume a provider has a universal replay-all button or that replay is
safe for every event. Retain attempt, accepted-event and financial outcomes.

**Owner:** backend/billing. **Detection:** provider/operation evidence with
usable coverage; a proposed alert alone is not active monitoring.

### 7.4 Slow first operation after idle

**Symptom to investigate:** startup, readiness, cache/database activation or a
first business operation is slower than steady state. Measure each stage; this
runbook establishes no specific 200–800 ms cold-start result.

**Action:** compare cold/warm observations under the actual resource limits.
A three-times-daily probe is not a one-minute keepalive or a zero-cold-start
guarantee. A warm machine or keepalive policy changes runtime/database cost and
needs an approved operating decision; preserve current stop/cordon controls.
A worker without an HTTP wake path needs its own lifecycle policy.

**Owner:** release/operations. **Detection:** retained startup/readiness and
first-operation timing, not inferred uptime between sparse probes.

### 7.5 CSRF double-submit regression

**Symptom to investigate:** legitimate browser mutations fail with 403. Compare
the cookie/header forwarding and trusted-origin behavior at the actual proxy
and backend boundary, while preserving webhook signature requirements.

**Action:** run `check:webhook-csrf-exemption` and relevant
`csrf-webhook-exemption.e2e-spec.ts` cases on an approved isolated target.
Static exemption checks and those executed cases establish their own scope;
do not infer every current proxy/session path from a historical test count.

**Owner:** backend/frontend. **Detection:** retained failed request and a
meaningful positive/negative control.

### 7.6 PHI redaction regression

**Symptom to investigate:** protected information reaches general telemetry.
Contain access and follow the incident data-handling procedure before copying
an event into another system.

**Action:** inspect the affected data flow and run `check:sentry-scrubbing`
and `check:sentry-scrubber-parity` with relevant scrubber tests. Passing source
checks covers their configured rules/fixtures, not every future field or event.
Verify scrubbed output with synthetic data and current capture configuration.

**Owner:** backend/compliance. **Detection:** authorized event/data-flow review;
no enabled Sentry delivery rule is established by this section.

### 7.7 RLS policy or role bypass

**Symptom to investigate:** a query returns or changes another clinic's data.
Contain the affected path immediately and retain protected evidence.

**Action:** inspect the real runtime role, applied policies and transaction-local
tenant context through the chosen pooler. `check:rls-rollout-readiness` and
`check:rls-bypass-annotation` inspect declared source/rollout conditions; neither
executes every tenant denial or repairs a superuser/table-owner bypass. Run the
actual non-owner/pooled-connection matrix in the approved isolated scope and
follow [RLS rollout](../compliance/RLS_ROLLOUT.md).

**Owner:** backend/compliance. **Detection:** confirmed authority boundary and
executed adversarial cases, independent of aggregate error-rate burn.

### 7.8 Worker bundle regrowth

**Symptom**: `pnpm check:worker-size` starts failing because a new
dependency bloats the Worker.

**Fix**: `check:worker-size` uses a repository default 3.5 MiB gzip budget,
with an explicit configured override supported by the script; that internal
budget is not the provider's current deployment limit. The root command chains
`app` + `internal` + `landing`. The configured `app-quality` /
`internal-quality` / `landing-quality` jobs are where CI runs all of it:
the `build:cloudflare` builds (§4 item 4) and the per-app caps via
`check:worker-size:app` / `:internal` / `:landing` (not
`verify:standard`). Historical dependency overages (preact, aws-sdk, sharp) are
documented in
[`worker-bundle-pre-existing-overage.md`](../operations/worker-bundle-pre-existing-overage.md).

**Owner**: Frontend. **Detection**: CI.

---

## 8. Quarterly stability review

Every quarter, refresh:

1. SLOs (§1) — review user requirements and the last 90 days of covered results;
   do not silently loosen a target to match a regression.
2. Error budget burn (§2) — calculate consumption from the declared eligible
   population; record missing coverage as unknown, not a green budget.
3. Alert chain (§3) — review relevance, false positives, capture and delivered
   notification evidence. A quiet rule is not automatically unnecessary.
4. Pre-deploy gates (§4) — run the applicable current set and review coverage,
   cost and redundancy. Lack of a recent caught regression alone does not
   justify removing a safety gate.
5. Rollback rehearsals (§5) — do at least one rollback drill per quarter.
6. Capacity review (§6) — re-measure and update the plans.
7. Failure pattern list (§7) — verify source mechanisms and measured incidents;
   distinguish known failure modes from actually observed causes.

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

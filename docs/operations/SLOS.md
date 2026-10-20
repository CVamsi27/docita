# API Latency SLOs

> **Status**: published 2026-08-06 (P5.9). Machine-readable copy:
> `scripts/checks/api-latency-slos.mjs` — keep this doc and that module in
> lockstep (AGENTS.md §3.1 single-source-of-truth).

## Contract

Latency budgets per endpoint class, measured at **p95** over the staging soak
window (p99 where defined). "Endpoint class" means the routing group, not a
single route — an outlier route can be hidden by a healthy class average, so
the soak records per-class percentiles.

| Endpoint class | Examples                                                      | p95      | p99     |
| -------------- | ------------------------------------------------------------- | -------- | ------- |
| `auth`         | login, refresh, logout                                        | ≤ 300ms  | —       |
| `crud`         | patients / appointments / invoices create, update, read       | ≤ 200ms  | ≤ 500ms |
| `search`       | paginated search / list                                       | ≤ 400ms  | —       |
| `reports`      | reports / PDF generation (async, progress UX)                 | ≤ 1500ms | —       |
| `webhooks`     | ingress: signature verify + dedupe only (processing is async) | ≤ 100ms  | —       |

Webhooks budget is ingress-only: handler work (payment confirmation, event
fan-out) is enqueued, never synchronous with the webhook response.

## Gate semantics (`check:api-latency-budget`)

- Reads the committed staging-soak baseline `artifacts/api-latency-baseline.json`.
- **WARN** — measured p95 above budget but within the **25% exceedance
  tolerance** (budget × 1.25). Printed, exit 0.
- **FAIL** (`--enforce`) — measured p95 above budget × 1.25, or p99 above its
  budget. Exit 1.
- **SKIP** — no baseline file present (exit 0) in the default and `--enforce`
  modes. A fresh checkout cannot fabricate measurements; run the soak first.

The optional modes above are the developer/merge-gate ratchet. A release that
declares an API performance budget must instead run the required mode:

- **REQUIRED** (`--require-baseline`, `pnpm check:api-latency-budget --require-baseline`)
  — implies `--enforce` and additionally fails (exit 1) when the baseline is
  absent, is not valid JSON, lacks `endpoints`, lacks parseable `generatedAt`
  provenance, is older than `--max-age-days` (default 30), or omits a p95
  reading for any endpoint class. Partial evidence cannot pass a release gate.

The gate is hermetic — it never calls the API — so it is safe inside
`verify:standard`. Live enforcement comes from the synthetic probes
(`scripts/monitoring/synthetic/run-probes.mjs`, per-probe latency targets,
3×/day + post-deploy) and API RUM.

## Workflow

1. **Capture the soak** against the staging API. The producer is
   `pnpm perf:api-latency:soak` (`scripts/perf/capture-api-latency-soak.mjs`):

   ```bash
   API_SOAK_TOKEN=<staging access token> pnpm perf:api-latency:soak -- \
     --base-url https://staging-api.example.com/api \
     --duration-minutes 10 \
     --output ./soak-metrics.json
   # or --cookie-file <curl cookie jar> instead of API_SOAK_TOKEN
   ```

   What the capture guarantees:

   - Every probe is a real customer route from
     `scripts/perf/api-latency-soak-routes.mjs` — never `/health/live`. Route
     drift is caught in CI: `check:unserved-endpoint` scans that manifest
     against every controller.
   - Pacing respects the API's own throttles (100/min and 10/s per IP, 120/min
     per user) through a per-route interval and a global budget (default
     30/min), and the artifact records the rate it achieved. This is a
     **latency** measurement under a bounded rate, not a load or capacity test.
   - A response that is not the route's documented status (401 from an expired
     token, 404 from a renamed route, 500 from a broken query) is excluded from
     the percentiles **and** fails the run. A 429 is retried once after its
     `Retry-After` window and recorded as throttled, never sampled.
   - Response bodies are never read and only an allowlist of cache headers is
     counted, so the artifact carries no PHI and no credentials.
   - The run exits 1 and marks `complete: false` when any class is under
     `--min-samples` (default 20), a request errored, or a route misbehaved.
     `--dry-run` prints the plan without issuing a request.

2. **Convert and commit** the baseline:
   `pnpm perf:api-latency:baseline -- ./soak-metrics.json`. Conversion refuses a
   capture marked `complete: false` or one with fewer than 20 samples in a
   class, so a partial run cannot become release evidence.
3. `pnpm check:api-latency-budget --enforce` ratchets the committed baseline.
4. A release declaring a performance budget runs
   `pnpm check:api-latency-budget --require-baseline` before deploy; regenerate the
   baseline when it is older than the allowed window. This runs as the
   `api-latency-gate` job in `.github/workflows/deploy.yml` and blocks
   `deploy-api`.

## What the dashboard may and may not claim

`GET /api/v1/monitoring/performance` and `/monitoring/requests` report both
route families explicitly, because liveness and readiness probes run through
the same interceptor as clinician traffic and would otherwise dominate volume
and collapse the latency distribution toward the probe's own ~1ms.

| Claim                                | Source                                                    | Honest?                                                                               |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Customer request volume              | `byRouteCategory.customer` (or `?routeCategory=CUSTOMER`) | Yes                                                                                   |
| Health-check volume                  | `byRouteCategory.healthCheck`                             | Yes                                                                                   |
| p50/p95 latency for a customer route | `slowestEndpoints` / `responseTimeDistribution`           | Only with a `COMPLETE` coverage state                                                 |
| Availability / uptime from telemetry | —                                                         | **No.** `firstObservedAt`/`lastObservedAt` are retained-data bounds, not availability |

Every latency figure excludes samples flagged `latencyValid = false`
(out-of-range durations retained for inspection), and the excluded count is
returned alongside so a reader can distinguish "fast" from "not measured".

`GET /api/v1/monitoring/telemetry-coverage` is the gate on any of the above:
when its state is `GAPS_RECORDED` or `UNAVAILABLE`, latency and volume numbers
for that window do not describe the window. See RB-09b.

## Queue outcomes

`GET /api/v1/monitoring/queue-health` reports current job state
(`countsByStatus`) **and** the last 24h of append-only execution outcomes.
`jobsRetriedLast24h` and `jobsRecoveredLast24h` come from that history:
current state alone cannot distinguish a job that failed twice and then
succeeded from one that succeeded first time.

## Alert ownership

| Signal                                             | Owner           | Action                                                                                 |
| -------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| Synthetic probe latency target hit                 | Backend on-call | Investigate hot path (query plan, N+1, external provider latency); page per runbook    |
| Gate FAIL on baseline ratchet                      | PR author       | Re-measure from staging; do not raise a budget without a documented decision in the PR |
| RUM p75 drift > budget for 7 days                  | Platform        | Open perf ticket with route + percentile breakdown                                     |
| Telemetry coverage `GAPS_RECORDED` / `UNAVAILABLE` | Backend on-call | RB-09b; do not publish latency or volume figures for the affected window               |

## Review cadence

Budgets are reviewed quarterly (or on any hot-path rewrite) against real
p95/p99 from staging. Raising a budget is a product decision documented in the
PR; lowering one needs a green staging soak.

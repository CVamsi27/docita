# API Latency SLOs

> **Status**: published 2026-08-06 (P5.9). Machine-readable copy:
> `scripts/checks/api-latency-slos.mjs` — keep this doc and that module in
> lockstep (AGENTS.md §3.1 single-source-of-truth).

## Contract

Latency budgets per endpoint class, measured at **p95** over the staging soak
window (p99 where defined). "Endpoint class" means the routing group, not a
single route — an outlier route can be hidden by a healthy class average, so
the soak records per-class percentiles.

| Endpoint class        | Examples                                   | p95    | p99    |
| --------------------- | ------------------------------------------ | ------ | ------ |
| `auth`                | login, refresh, logout                     | ≤ 300ms | —     |
| `crud`                | patients / appointments / invoices create, update, read | ≤ 200ms | ≤ 500ms |
| `search`              | paginated search / list                    | ≤ 400ms | —     |
| `reports`             | reports / PDF generation (async, progress UX) | ≤ 1500ms | —  |
| `webhooks`            | ingress: signature verify + dedupe only (processing is async) | ≤ 100ms | — |

Webhooks budget is ingress-only: handler work (payment confirmation, event
fan-out) is enqueued, never synchronous with the webhook response.

## Gate semantics (`check:api-latency-budget`)

- Reads the committed staging-soak baseline `artifacts/api-latency-baseline.json`.
- **WARN** — measured p95 above budget but within the **25% exceedance
  tolerance** (budget × 1.25). Printed, exit 0.
- **FAIL** (`--enforce`) — measured p95 above budget × 1.25, or p99 above its
  budget. Exit 1.
- **SKIP** — no baseline file present (exit 0). A fresh checkout cannot
  fabricate measurements; run the soak first.

The gate is hermetic — it never calls the API — so it is safe inside
`verify:standard`. Live enforcement comes from the synthetic probes
(`scripts/monitoring/synthetic/run-probes.mjs`, per-probe latency targets,
3×/day + post-deploy) and API RUM.

## Workflow

1. Run the staging soak against the staging API (or the scheduled synthetic
   runs) and export per-class p95/p99.
2. Convert and commit the baseline:
   `pnpm perf:api-latency:baseline -- ./soak-metrics.json`
3. `pnpm check:api-latency-budget --enforce` ratchets the committed baseline.

## Alert ownership

| Signal                            | Owner        | Action                                                                    |
| --------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Synthetic probe latency target hit | Backend on-call | Investigate hot path (query plan, N+1, external provider latency); page per runbook |
| Gate FAIL on baseline ratchet     | PR author    | Re-measure from staging; do not raise a budget without a documented decision in the PR |
| RUM p75 drift > budget for 7 days | Platform     | Open perf ticket with route + percentile breakdown                         |

## Review cadence

Budgets are reviewed quarterly (or on any hot-path rewrite) against real
p95/p99 from staging. Raising a budget is a product decision documented in the
PR; lowering one needs a green staging soak.

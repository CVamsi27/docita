# Performance Observability Integration (k6 + DataDog/CloudWatch)

## Goal
Operationalize Phase 0.3 with repeatable baseline runs, regression checks, and metric export paths for external monitoring.

## Local / CI Baseline Commands
- Quick baseline:
  - `pnpm perf:k6:baseline:quick`
- Full baseline:
  - `pnpm perf:k6:baseline`
- Enhanced scenarios (auth + billing/payment):
  - `pnpm perf:k6:enhanced`
- Regression gate:
  - `pnpm perf:regression:check`

## DataDog Integration (StatsD path)
k6 sends metrics to DataDog Agent via StatsD using xk6 output support:

1. Ensure DataDog Agent is running with DogStatsD enabled.
2. Run:

```bash
K6_STATSD_ENABLE_TAGS=true \
k6 run scripts/k6-baseline.js \
  -e API_BASE_URL=http://localhost:3001/api/v1 \
  --out output-statsd
```

3. Build DataDog dashboard panels from:
- `k6.http_req_duration`
- `k6.http_req_failed`
- `k6.http_reqs`
- tags: `scenario`, `group`, `status`

## CloudWatch Integration (JSON ingest path)
Use summary export + CloudWatch PutMetricData ingestion:

1. Export summary:

```bash
k6 run scripts/k6-baseline.js \
  -e API_BASE_URL=http://localhost:3001/api/v1 \
  --summary-export logs/performance/k6-baseline-summary-latest.json
```

2. In CI or a scheduled job, map summary fields into CloudWatch custom metrics namespace `Docita/Performance`:
- `HttpReqP95Ms` from `metrics.http_req_duration["p(95)"]`
- `HttpReqP99Ms` from `metrics.http_req_duration["p(99)"]`
- `HttpReqFailedRate` from `metrics.http_req_failed.value`
- `HttpReqRps` from `metrics.http_reqs.rate`

## Regression Alert Policy
Use `scripts/performance/check-regression.js` with configurable env thresholds:
- `PERF_P95_MS` (default `500`)
- `PERF_P99_MS` (default `1000`)
- `PERF_FAILED_RATE` (default `0.1`)
- `PERF_MIN_RPS` (default `5`)

Non-zero exit means regression and should fail CI.

## Baseline Artifacts
- Summary JSON: `logs/performance/k6-baseline-summary-2026-02-16.json`
- Human report: `logs/performance/k6-baseline-report-2026-02-16.md`
- Dashboard data: `logs/performance/performance-dashboard-2026-02-16.json`

## Remaining External Setup
- DataDog API key / agent rollout in deployed environments.
- CloudWatch IAM policy + metric publishing job wiring.
- Managed dashboard provisioning in your monitoring workspace.

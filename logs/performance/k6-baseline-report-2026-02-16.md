# K6 Baseline Report — 2026-02-16

## Run Context
- Script: `scripts/k6-baseline.js`
- Mode: Quick baseline (`K6_QUICK=1`)
- Target API: `http://localhost:3001/api/v1`
- Summary JSON: `logs/performance/k6-baseline-summary-2026-02-16.json`

## Key Metrics
| Metric | Value |
|---|---:|
| Requests total | 462 |
| Throughput | 10.95 req/s |
| Avg latency | 1.34 ms |
| p95 latency | 1.89 ms |
| p99 latency | 8.82 ms |
| Failed request rate | 0.00% |
| Iterations | 77 |
| Data received | 714 KB |
| Data sent | 85 KB |

## Threshold Results
- `http_req_duration p(95)<500`: PASS
- `http_req_duration p(99)<1000`: PASS
- `http_req_failed rate<0.1`: PASS
- `http_reqs count>0`: PASS

## Notes
- Baseline uses expected statuses `200/401/404` to avoid false failure inflation on protected endpoints when no auth token is provided.
- For authenticated production-like baselines, set `ADMIN_TOKEN` and rerun without `K6_QUICK`.

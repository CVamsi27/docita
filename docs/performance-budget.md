# Performance Baseline and Budget Checks

This repository tracks baseline performance indicators for:

- Frontend route bundle sizes for high-traffic app routes.
- API monitoring snapshots when `PERF_API_BASE_URL` is configured.

## Commands

```bash
pnpm perf:baseline
pnpm perf:budget:warn
pnpm perf:budget:enforce
```

## Baseline Output

`pnpm perf:baseline` writes a snapshot to:

`logs/performance/baseline.json`

It includes:

- `appBundleMetrics.routeSizes`
- `apiMetrics.requests`
- `apiMetrics.performance`

## Budget Gate

- `pnpm perf:budget:warn` warns when route bundle size growth exceeds the threshold.
- `pnpm perf:budget:enforce` fails when growth exceeds the threshold.

Default threshold:

- `PERF_MAX_ROUTE_SIZE_DELTA_PERCENT=15`

You can override it with an environment variable.

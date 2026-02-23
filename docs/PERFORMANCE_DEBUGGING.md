# Performance Debugging Guide

Practical runbook for diagnosing latency, throughput, and resource regressions in Docita services.

## Scope

Use this guide when any of the following occur:

- P95/P99 API latency increases above SLO
- elevated 5xx or timeout rates
- queue delays or background job backlogs
- DB query slowdown, lock contention, or connection pressure

## Quick Triage (First 15 Minutes)

1. Confirm blast radius:
   - Which service(s): app, admin, landing, api
   - Which endpoints or user flows are affected
   - Whether issue is global or tenant/region specific
2. Check current health:
   - API liveness/readiness endpoints
   - Railway service status and restart history
   - error-rate spike in monitoring dashboards
3. Capture a snapshot before changes:
   - request latency percentiles
   - error rates by endpoint
   - DB CPU/memory/connections
   - queue depth and processing lag

## Primary Signals to Inspect

### API Layer

- Request rate, P50/P95/P99 latency, timeout count
- 4xx/5xx trend by endpoint and tenant context
- Slow request logs from API observability service

### Database Layer

- Slow query logs and execution plans
- connection saturation / pool exhaustion
- lock waits and long-running transactions
- index usage for high-volume filters/sorts

### Queue & Worker Layer

- queue depth trend
- processing delay and retry rates
- failed jobs by queue name and handler

### Frontend Layer

- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- bundle and route-level hydration timing

## Useful Commands

Run from repository root unless noted.

### Validate API Health

```bash
curl -s -o /dev/null -w "api-health:%{http_code}\n" http://localhost:3001/api/health
curl -s -o /dev/null -w "api-live:%{http_code}\n" http://localhost:3001/api/health/live
curl -s -o /dev/null -w "api-ready:%{http_code}\n" http://localhost:3001/api/health/ready
```

### Run Local Performance Baseline

```bash
pnpm tsx scripts/performance/check-regression.js
pnpm node scripts/k6-baseline.js
```

### Validate Core App Runtime

```bash
pnpm --filter @docita/app dev
pnpm --filter @docita/app test
pnpm --filter @docita/app typecheck
```

### Validate API Runtime

```bash
pnpm --filter @docita/api dev
pnpm --filter @docita/api test
pnpm --filter @docita/api test:e2e
```

## Common Root Causes and Fix Patterns

| Symptom                 | Typical Root Cause                                      | Fast Mitigation                                             |
| ----------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| sudden P95 increase     | missing/inefficient DB index                            | add/adjust index, verify query plan                         |
| periodic timeout bursts | overloaded worker/queue or external dependency slowdown | reduce concurrency, add backoff, isolate failing dependency |
| elevated 5xx            | unhandled edge case after deploy                        | rollback/canary halt, patch guardrails                      |
| high DB CPU             | N+1 query or wide scan                                  | batch query, narrow select, add pagination                  |
| frontend TTI regression | oversized client bundle                                 | split route-level chunks, defer non-critical code           |

## Incident Workflow

1. Open incident in on-call channel.
2. Follow [ON_CALL_RUNBOOK.md](./archive/ON_CALL_RUNBOOK.md) response steps.
3. Coordinate communication via [INCIDENT_RESPONSE.md](./archive/INCIDENT_RESPONSE.md).
4. If customer-visible degradation persists >15 minutes, publish status page update.
5. Record timeline and mitigation actions for postmortem.

## Post-Incident Checklist

- Add or update regression test for the failure mode.
- Add dashboard alert if detection gap existed.
- Capture root cause and remediation in postmortem.
- Link incident notes in planning docs if architecture follow-up is needed.

## Related Docs

- [MONITORING_SETUP_GUIDE.md](./archive/MONITORING_SETUP_GUIDE.md)
- [ON_CALL_RUNBOOK.md](./archive/ON_CALL_RUNBOOK.md)
- [INCIDENT_RESPONSE.md](./archive/INCIDENT_RESPONSE.md)
- [scripts/README.md](../scripts/README.md)

# k6 load-test harness

Reproducible load tests for Docita's most important paths. The scripts
live in [`scenarios/`](./scenarios), share configuration via
[`lib/config.js`](./lib/config.js), and are wired together by
[`run-all.sh`](./run-all.sh).

## Scope

| Scenario                | What it stresses                                                | SLO target                                                  |
|-------------------------|------------------------------------------------------------------|-------------------------------------------------------------|
| `auth-login`            | `/auth/login` burst (ramp 0 -> 100 VUs)                         | p95 latency < 1500 ms, error rate < 2%                      |
| `patients-list`         | `/patients` paginated reads (50 RPS for 2m)                     | p95 latency < 800 ms, error rate < 1%                       |
| `appointments-create`   | `POST /appointments` with idempotency keys                      | p95 latency < 1500 ms, error rate < 5%                      |
| `webhook-flood`         | HMAC-signed `/webhooks/whatsapp` (100 RPS for 1m)               | p95 latency < 400 ms, error rate < 1%                       |
| `whatsapp-send`         | Throttled outbound `POST /whatsapp/messages` (5 RPS for 2m)     | p95 latency < 2000 ms, error rate < 5%                      |
| `proxy-route`           | Cloudflare app proxy `/api/v1/health` vs direct API baseline    | proxy p95 < 1500 ms, direct API p95 < 800 ms, errors < 1%  |

The thresholds above are encoded in each scenario file so a regression
fails the run with a non-zero exit code (suitable for CI gating).

## Hard rules

- Never run these scripts against production.
- Never feed real PHI. The harness only sends synthetic patient/doctor
  ids and template variables; that is enforced by code review.
- Default the `K6_BASE_URL` to a private perf cluster or a local stack;
  staging is acceptable for short bursts coordinated with on-call.
- Use seeded synthetic users (e.g. `perf@docita.test`). Don't reuse a
  real clinic's quota / token for load tests.

## Required environment

```bash
export K6_BASE_URL="http://localhost:3001"
export K6_AUTH_TOKEN="..."        # JWT issued from the seeded perf user
export K6_TENANT_ID="..."         # clinic id for that user
export K6_WEBHOOK_SECRET="..."    # matches WHATSAPP_WEBHOOK_SECRET in env
export K6_PATIENT_ID="seed-patient-1"
export K6_DOCTOR_ID="seed-doctor-1"
export K6_DIRECT_API_BASE="http://localhost:3001/api/v1" # proxy-route comparison
```

## Running

```bash
# install k6 once (macOS)
brew install k6

# full sweep against the configured environment
./run-all.sh

# quick smoke test (caps every scenario at ~30s)
./run-all.sh --quick

# single scenario
k6 run scenarios/patients-list.js
```

Summary JSON is written to `results/<scenario>-<utc>.json`; the
`results/` directory is gitignored.

## Adding a scenario

1. Drop a new file under `scenarios/`.
2. Reuse `lib/config.js` (`BASE_URL`, `authHeaders`, `uuid`,
   `signWebhook`) instead of inlining environment lookups.
3. Always declare `thresholds` so the scenario fails loudly under
   regression.
4. Add it to the `SCENARIOS` array in `run-all.sh` and update the table
   above.

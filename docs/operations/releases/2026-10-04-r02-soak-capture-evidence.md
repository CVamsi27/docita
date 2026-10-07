# R02 soak capture evidence — 2026-10-04

Backlog item: **R02 — Make missing performance evidence fail the intended
release gate** (_Confirmed behavior gap_).

Acceptance clause: _a release requiring performance evidence fails on
absent/stale evidence and passes on a reproducible compliant sample. A fast
health-check response cannot satisfy a booking or invoice endpoint budget._

**R02 is still not closed.** The silent-skip gap is closed and the release gate
is wired, and this pass adds the missing producer. What remains is the one thing
this session cannot do: capture a staging soak.

## 1. What was found

Earlier work on this item delivered the _judge_ but not the _evidence producer_:

- `scripts/checks/check-api-latency-budget.mjs --require-baseline` correctly
  fails on absent, stale, provenance-less or partial baselines, and
  `api-latency-gate` now runs it in `.github/workflows/deploy.yml` with
  `deploy-api` depending on it.
- But `docs/operations/SLOS.md` step 1 said "run the staging soak against the
  staging API (or the scheduled synthetic runs) and export per-class p95/p99",
  and **no tool existed that could do it**. `--write-baseline` accepted any
  hand-written JSON, so the only way to satisfy the gate was to invent numbers
  by hand.

Three concrete gaps followed from that:

1. **No soak runner.** Nothing computed per-class percentiles, applied the
   API's throttles, or recorded workload, error and cache state.
2. **No route definition.** Nothing declared which routes represent each
   endpoint class — which is exactly where "a fast health-check response
   satisfies the budget" enters.
3. **A baseline could be fabricated.** `--write-baseline` converted any input,
   including one with a single sample per class or a capture its own producer
   had marked incomplete.

## 2. Implementation

### Route manifest (`scripts/perf/api-latency-soak-routes.mjs`)

Six real customer routes, one or two per SLO class, each with the status that
counts as a sample and a minimum interval that keeps it inside the endpoint's
own throttle. `/health/live` is deliberately absent.

| Class      | Probe                                                         | Measured status |
| ---------- | ------------------------------------------------------------- | --------------- |
| `auth`     | `GET /api/v1/auth/validate`                                   | 200             |
| `crud`     | `GET /api/v1/patients?limit=1`                                | 200             |
| `crud`     | `GET /api/v1/appointments?date={today}&limit=20&page=1`       | 200             |
| `search`   | `GET /api/v1/patients?search=soak&page=1&limit=20`            | 200             |
| `reports`  | `GET /api/v1/analytics/revenue?period=daily&days=30`          | 200             |
| `webhooks` | `POST /api/v1/webhooks/payments/razorpay` (invalid signature) | 401             |

Login is not probed: it is capped at 5/min, needs a Turnstile token and would
measure the anti-bot provider. The webhook probe sends a schema-valid payload
with an invalid signature, so it measures ingress verification without creating
a payment or enqueueing work.

**Drift is caught in CI.** `check:unserved-endpoint` now also scans this
manifest (`collectRouteManifestCalls`), so renaming a controller fails the build
instead of 404-ing the probe. Verified: renaming the analytics route produced
`- scripts/perf/api-latency-soak-routes.mjs:87 "analytics-revenue-soak-renamed"`
and exit 1.

### Capture runner (`scripts/perf/capture-api-latency-soak.mjs`)

- Nearest-rank p50/p95/p99 per class, first N samples per route discarded as
  warmup.
- Deterministic plan: per-route interval plus a global per-minute budget
  (default 30/min, a quarter of the strictest limiter the API applies to a
  single identity), executed by a bounded worker pool.
- Throttling: a 429 is recorded and retried once after `Retry-After`, and never
  becomes a latency sample.
- Completeness: a class under `--min-samples` (default 20), any request error,
  or any route answering an unexpected status marks the artifact
  `complete: false` and exits 1. An unexpected status is also excluded from the
  percentiles, so a broken target cannot look like a fast one.
- Provenance and honesty: git SHA/ref, base URL, achieved rate, per-route
  status/error/throttle counts and cache-header counts are recorded; response
  bodies are never read; request headers are never recorded; the bearer token
  comes from the environment, never from argv.

### Conversion hardening (`check-api-latency-budget.mjs --write-baseline`)

Refuses a capture marked `complete: false`, and refuses any capture with fewer
than 20 samples in a class. Both refusals write no baseline file.

### A documented command that had never worked

Running the documented conversion through pnpm — `pnpm perf:api-latency:baseline
-- ./soak-metrics.json` — failed with `Cannot read soak metrics at --`. pnpm
forwards the `--` separator into the script, and the argument reader treated it
as the soak path. The conversion step in this item's acceptance criteria was
therefore unusable as written, independent of any measurement.

Fixed by parsing arguments instead of taking "whatever follows the flag":
a literal `--` is stripped, and the soak path is the first positional argument
that is not a flag's value. Both forms now work — `pnpm perf:api-latency:baseline
-- ./soak-metrics.json` and the plain `node … --write-baseline ./soak.json` — and
the pnpm form with an explicit `--baseline <out>` before the soak path is
covered by a regression test.

## 3. Verification

| Check                                                          | Result                                                                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test scripts/perf/capture-api-latency-soak.test.mjs`   | 20 pass (stub HTTP server; percentiles, pacing, cookie jar, cache-header allowlist, completeness, auth-failure hint, throttle retry, secret redaction, HTTPS guard, pnpm `--` separator, dry run) |
| `node --test scripts/checks/check-api-latency-budget.test.mjs` | 17 pass (including the two conversion refusals and the pnpm `--` separator regression)                                                                 |
| `node --test scripts/checks/check-unserved-endpoint.test.mjs`  | 32 pass (including two new manifest-scan tests)                                                                                                           |
| `pnpm test:standards-checks`                                   | 242 pass, 0 fail                                                                                                                                          |
| `pnpm verify:standard`                                         | exit 0 (128 chained checks)                                                                                                                              |
| Documented pnpm commands                                       | `pnpm perf:api-latency:soak -- --base-url … --dry-run` and `pnpm perf:api-latency:baseline -- --baseline <out> <soak>` both exit 0                                                                                |
| `pnpm check:fallow`                                            | score 100 — this run removed an unused `SOAK_CLASSES` export it flagged                                                                                  |
| `pnpm check:duplication`                                       | 0 clones                                                                                                                                                 |
| `pnpm check:unserved-endpoint`                                 | pass; manifest routes matched against controller routes                                                                                                   |
| Manifest drift mutation                                        | renaming the analytics probe → exit 1 with a file:line finding                                                                                            |

Mutation checks on the new assertions: dropping the expected-status filter in
the aggregation, dropping the global rate clip in the planner, and shifting the
cookie-jar field indices each produced exactly one failing test; restoring the
file returned 19/19.

### Live run against the local API (not staging)

`http://127.0.0.1:3001` with a real session, manifest unchanged. Each of these
runs found something the next one had to handle:

| Run | Rate | Result |
| --- | --- | --- |
| 2 min | 90/min | Two 429s; capture refused (`complete: false`) |
| 10 min | 30/min | Token minted ~25 min earlier expired mid-run: 27 × 401 on the authenticated routes; capture refused with the "mint a fresh token" reason |
| 4 min | 60/min | Two 429s survived the single retry; capture refused |
| 10 min | 20/min | **Complete**: every class ≥ 31 samples, 0 errors, 0 throttled, 0 unexpected statuses |

The chain then ran end to end on that complete capture:

```
node scripts/checks/check-api-latency-budget.mjs --baseline /tmp/baseline.json \
  --write-baseline /tmp/local-soak-20.json      -> API latency baseline written (exit 0)
node scripts/checks/check-api-latency-budget.mjs --baseline /tmp/baseline.json \
  --require-baseline                            -> passed (exit 0)
```

The demo baseline and capture live in `/tmp` and are **not committed** — a local
development capture is not a staging baseline. `artifacts/api-latency-baseline.json`
remains absent, so the repository gate still exits 1 (`no baseline at ...`), which
is the state the release gate currently blocks on.

Two defaults were changed because these runs measured them: the request budget
(90 → 30/min, with the observed reality that a busy IP still tips over) and the
advice to mint the token immediately before the run.

**Note on the environment:** these runs shared `localhost:3001` with other
in-flight work in this repository, so sporadic 429s are expected from traffic
the soak did not generate. An operator should run a soak against a quiet
staging environment.

## 4. What is still missing (why R02 stays open)

- **No staging soak exists.** `artifacts/api-latency-baseline.json` is still
  absent, so `api-latency-gate` fails and `deploy-api` is blocked. An operator
  with staging access runs `pnpm perf:api-latency:soak`, converts with
  `pnpm perf:api-latency:baseline`, and commits the result.
- **The webhook sample is the reject path** (401, signature verification). It
  is honest and recorded, but slightly cheaper than an accepted delivery.
- **A soak is not a capacity test.** It measures latency under a bounded rate;
  pool saturation and queue depth need the capacity work in the P2 section.
- **The local API run proves the tool works, not the SLOs.** Every number in
  this record comes from local development.

## Evidence index

- Soak runner: [`scripts/perf/capture-api-latency-soak.mjs`](../../../scripts/perf/capture-api-latency-soak.mjs)
- Route manifest: [`scripts/perf/api-latency-soak-routes.mjs`](../../../scripts/perf/api-latency-soak-routes.mjs)
- Soak tests: [`scripts/perf/capture-api-latency-soak.test.mjs`](../../../scripts/perf/capture-api-latency-soak.test.mjs)
- Budget gate: [`scripts/checks/check-api-latency-budget.mjs`](../../../scripts/checks/check-api-latency-budget.mjs) and [its tests](../../../scripts/checks/check-api-latency-budget.test.mjs)
- Route-drift guard: [`scripts/checks/check-unserved-endpoint.mjs`](../../../scripts/checks/check-unserved-endpoint.mjs) and [its tests](../../../scripts/checks/check-unserved-endpoint.test.mjs)
- SLOs: [`scripts/checks/api-latency-slos.mjs`](../../../scripts/checks/api-latency-slos.mjs), [`docs/operations/SLOS.md`](../SLOS.md)
- Release gate job: [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml)

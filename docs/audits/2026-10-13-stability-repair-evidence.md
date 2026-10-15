# Docita stability repair evidence — 13 October 2026

Status: **source corrections verified locally; final images and production baseline not certified**.
Latest follow-up: 15 October 2026. Source changes remain on a local branch and unpushed while mandatory final image verification is blocked. The change is split into focused commits for review; no PR or production source release exists yet.
The user authorized further analysis and fixes under a feature freeze through
13 December 2026. Critical bug, security and compliance corrections remain allowed.

## Source identity and scope

Base: `376462fe812c9a858e9cf08d1976b2d44275ab7f` on canonical main (PR #319).
Work branch: `fix/two-month-stability-plan`, isolated managed checkout. The original
landing checkout and PR #321 are preserved. No production source deployment,
patient repair, historical event replay or schema migration was performed.
Local PostgreSQL fixtures are owned, disposable and synthetic; raw logs and
credential-bearing metadata are kept privately outside the repository.

## Production recovery and verification

- Fly app `docita-api` had no certificate for `api.docita.work`. DNS ACME and
  ownership records still named an older Fly app. The certificate was requested;
  the DNS operator updated both records. Fly issued active RSA/ECDSA certificates
  on 13 October, expiring 11 January 2027.
- Direct Fly, public API and app/internal proxy liveness/readiness repeatedly
  returned HTTP 200 after recovery. Warm probes were approximately 100–225 ms.
  These are point-in-time checks, not an uptime or load measurement.
- API and worker GitHub Fly secrets were replaced through protected stdin with
  verified app-scoped 90-day tokens, expiring 11 January 2027. The daily drain
  source now uses `FLY_API_TOKEN_WORKER`; that source change is not yet on main.
- The user chose **keep API idle shutdown enabled**. Retain that choice; a cold
  start was observed at roughly 28 seconds and the scheduled monitor needed
  retries through a cold wake. Continuously warm service is not the agreed mode.
- Synthetic monitoring was re-enabled after TLS recovery. Initial runs failed
  login with 401. On 14 October the operator's local credentials passed real
  production login with HTTP 201 and an access-token cookie; those exact values
  were synchronized to GitHub through protected stdin. The full monitor script also passes locally: health 107 ms, daily thought
  818 ms, and login 173 ms. These warm point checks do not certify an uptime or
  load target. Hosted runs remain blocked: [GitHub's latest run](https://github.com/CVamsi27/docita/actions/runs/38578306342)
  did not start its job because account payments failed or its spending limit
  was reached. This is not a new authentication failure. Alert delivery and an
  authenticated hosted run remain unverified. The dedicated identity has no
  clinic membership; this login check does not certify a patient-list journey.
- Read-only metadata through the **actual API connection** identifies Neon
  PostgreSQL in Singapore, effective/login role `neondb_owner`, `BYPASSRLS=true`,
  and tenant-table ownership. `docita_app` exists but is NOLOGIN. Of 91 live
  `clinicId` tables, 16 lack enabled RLS or a policy. Source coverage and an RLS
  flag do not establish a live database backstop. See [RLS rollout](../compliance/RLS_ROLLOUT.md).
- The bounded read-only audit found no QueueJob rows, no pending outbox rows,
  and no invoices with settled payment sessions. Empty data does not demonstrate
  delivery cadence, historical reconciliation or peak clinical behavior.
- The old RDS instance reference does not identify this database. AWS STS access
  works; old-instance lookup fails and broader RDS inventory is denied. Neon
  backup/restore capability remains unverified; see [DR runbook](../operations/DR_RUNBOOK.md).

## Credential containment on 14 October

A configuration-search command displayed credentials in tool output. The active
Neon owner-role credential was identified by a bounded hash comparison, rotated,
and synchronized to Fly API/worker secret stores, production GitHub `DATABASE_URL`
and the protected local operator setup. A fresh connection accepts the new
credential and rejects the old one; the API runtime credential matches the new
value. Client-hashed resets were rejected by Neon; its supported TLS SQL path was
used after verifying statement, duration, sample and audit logging were disabled.
No password or SQL literal was printed by the rotation process.

Both machines were refreshed using their existing September image tags, now
resolved to explicit digests. Environment, resources and service/idle settings
match the previous configuration. The worker remained stopped. API live/ready,
app/internal proxy readiness and monitor login passed after rotation. No source
release, schema change, privilege expansion or patient repair was performed.

The exposed local Cloudflare token is already invalid (401/code 1000); its local
value was cleared. The retired RDS hostname does not resolve; its local credential
was removed, without claiming server-side revocation. The local variable named
`STAGING_DATABASE_URL` actually contained the live production credential. That
alias was cleared and the operator's production key corrected. The GitHub staging
secret remains untouched and unverified; it must not be assumed isolated.

## Demonstrated source corrections

| Correction                      | Reproduction and behavior                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captured payment balance        | Provider capture previously marked an invoice PAID without crediting integer paid balance. Capture now atomically claims, increments under invoice row lock, validates persisted currency, derives canonical status and appends the event in one transaction. Duplicate, competing provider/manual capture, cancellation and rollback cases are tested. |
| Collection reporting            | Clinic-local day bounds and persisted invoice/session currency replace UTC-day and current-setting assumptions. Mixed currencies fail explicitly without changing the response contract; empty reports use clinic currency. UI formats the report's returned currency.                                                                                  |
| Worker drain ownership          | Existing running workers remain running. A bounded invocation stops only the machine it started, waits for readiness, handles interrupts once and propagates stop/errors. Duration and machine-selection inputs fail closed.                                                                                                                            |
| Queue shutdown                  | New polling/claims stop during teardown; owned handlers and acknowledgments finish before persistence closes. Rejected acknowledgments remain visible.                                                                                                                                                                                                  |
| Owned database pools            | Terminal Nest teardown closes the retained monitored pool; ordinary disconnect/reconnect remains supported. Singleton, script and E2E helper adapters dispose their external pools.                                                                                                                                                                     |
| Runtime flags                   | All eleven flags reuse explicit boolean parsing: string `false`/`0` no longer enables external AI, cloud OCR, RLS, DB control or other switches. Known aliases/defaults remain; ambiguous inputs fail startup. No production flag was changed.                                                                                                          |
| Strict tenant release proof     | Separate fixture administration allows a non-owner app-role matrix. Coverage is checked per tenant table; random owned fixtures cannot delete another run. Strict mode rejects owner/bypass credentials, privileged startup-role escape and SET-reachable privileged roles.                                                                             |
| Docker context and compiler     | Private env/upload canaries leaked before recursive exclusions. Authored sources/example env remain included. Actual AMD64 compilation reproduced heap exhaustion; 2048 MiB is set only during build, retaining runtime limits.                                                                                                                         |
| Worker runtime dependency graph | An actual emitted-module import failed on auth, then RDS SDK. Declaring the existing locked runtime dependencies allows ordinary Node loading without NODE_PATH. CI now builds and runs that gate.                                                                                                                                                      |
| Security evidence               | Trivy scans the root lockfile instead of reporting zero dependency files. SARIF is retained even when Security-tab upload is unavailable. Canonical exception expiry is enforced in standards and the pre-push hook.                                                                                                                                    |
| Recovery command                | The nonexistent Fly release rollback command is replaced with explicit-image recovery validated against canonical config/app/region, retaining API/worker strategy and skipping release-hook migrations. Current config/secrets/schema remain in effect.                                                                                                |
| Log and Sentry privacy          | 42 API and 26 shared privacy regressions passed. Final compiled API readiness passes and invalid payment capabilities return404; URL capability/query/email canaries remain absent from logs.                                                                                                                                                           |
| Anonymous patient links         | Exact capability lookups now enter an async lookup context so lazy Prisma queries execute before the context exits. Signed PDFs render/read/persist inside the derived clinic and canonical RLS transaction. Global tenant guards remain intact; non-owner HTTP regressions cover valid and invalid links.                                              |
| Monitor recovery decision       | TLS certificate failures no longer cause a process restart; a failing red test and green classifier regression cover 525/526.                                                                                                                                                                                                                           |

Payment subscriber absence is **not** established by the current compiled graph.
The full listener is reached transitively. Its best-effort error handling,
provider-acceptance/local-persistence ambiguity and capture-specific receipt
content are documented in [worker event ownership](../operations/WORKER_EVENT_OWNERSHIP.md).
The user explicitly retained best-effort payment WhatsApp receipts and staff notifications for the freeze. Capture or outbox success does not promise delivery. No new consumer, durable delivery policy or historical replay was introduced.

## Validation record

All commands use Node 22.22.0 and pnpm 10.30.3. Evidence reflects the current
working candidate where marked; earlier results are retained with their scope.

| Gate                            | Result                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full lint                       | Passed on 14 October: 11 workspace tasks.                                                                                                                                                                                                  |
| Full type checks                | Passed on 14 October: 29 workspace tasks, including production and spec API checks.                                                                                                                                                        |
| Full unit suite                 | Passed on 14 October: 6,377 tests across 48 task executions; API 525 suites / 4,376 tests.                                                                                                                                                 |
| Full build                      | Passed on 14 October: 35 workspace tasks.                                                                                                                                                                                                  |
| API real-DB E2E                 | Final candidate passes 63 suites / 508 cases across four sequential shards (138, 119, 104, 147). The public capability suite includes non-owner RLS proof; zero skipped cases.                                                             |
| Queue and worker scripts        | 47 focused queue tests, 15 real fake-CLI lifecycle cases.                                                                                                                                                                                  |
| Pool lifecycle                  | Seven real PostgreSQL cases pass again with detectOpenHandles and no forceExit; test process exits cleanly.                                                                                                                                |
| Report/payment regressions      | 62 focused API, 16 desk UI and 12 real-DB balance tests pass.                                                                                                                                                                              |
| Runtime flags                   | 295 real-Zod/config cases pass; 147 failed before correction.                                                                                                                                                                              |
| Tenant fixture release probe    | 15 real PostgreSQL16 cases pass again, zero skipped; the four privileged-role escape regressions remain covered.                                                                                                                           |
| Compiled worker                 | Final emitted worker module loads with ordinary Node resolution and declared runtime dependencies; one runtime test passes without constructing providers.                                                                                 |
| Docker fixture safety           | Five actual fixtures and API AMD64 startup passed on 13 October before the final image security edits. Seven final fixtures, both final AMD64 images, runtime checks and image scans are blocked by Docker Desktop backend initialization. |
| Rollback artifacts              | 23 executable CLI cases pass; combined rollback/drain total 38. No production rollback executed.                                                                                                                                           |
| Dependency audit                | 14 October audit exits 0 under the existing braces exception; metadata reports one high. Registry still lists 3.0.3 as latest. Exception expires 12 November and was not extended.                                                         |
| Standards                       | Passed on 14–15 October: 148 standards cases and the full standards command. The absent API latency baseline explicitly skips and remains a release failure.                                                                               |
| Required latency evidence       | Fails: artifacts/api-latency-baseline.json absent (seven-day freshness required). No passing numbers were invented.                                                                                                                        |
| Knip / hygiene                  | Passed on the current candidate; emitted-worker dependency consumers remain documented.                                                                                                                                                    |
| Authenticated app accessibility | 160/160 passed, zero skips, on 13 October with owned API/DB and same-origin proxy across desktop/mobile/tablet. Frontend markup is unchanged since that run.                                                                               |

## Remaining release gates

1. Resolve GitHub billing/spending restrictions, then demonstrate authenticated
   hosted monitoring and actual alert delivery. Three daily GitHub checks do not alone
   establish minute-level uptime coverage.
2. Restore Docker Desktop; execute the final image fixtures, builds, readiness/
   shutdown and scans. The earlier scan found two high OpenSSL OS findings and
   36 library findings in retained global tooling, including two critical tar
   findings. OS updates and runtime-tool cleanup are staged but not certified.
   Align protected staging via its PR-only path and record its deployed revision.
   August staging and September Fly images do not exercise this candidate.
3. Verify Neon recovery/retention, restore into an isolated target and verify
   tenant/data/object/key/audit continuity. Then apply the existing additive RLS
   sweep and non-owner credential rollout through staged proof and its soak.
4. Retain provider sandbox, recipient/consent and worker cadence evidence for
   the selected contract. Payment notifications remain explicitly best effort;
   required financial/clinical effects still need reconciliation proof.
5. Gather the real fresh latency soak and workload/resource evidence. Rehearse
   selected image/frontend recovery with current schema/config compatibility.
6. Release affected targets from reviewed main code only, then observe the live
   baseline for fourteen consecutive days before declaring two-month stability.

The freeze policy is active. The source repair batch and TLS recovery do not
constitute a completed production release or a guarantee of no future critical fixes.

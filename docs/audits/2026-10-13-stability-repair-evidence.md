# Docita stability repair evidence — 13 October 2026

Status: **source corrections and final images verified locally; production baseline not certified**.
Latest follow-up: 16 October 2026. The source repair batch is split into focused commits for review. Final image hardening is verified; independent backup activation and production release gates remain open. The [completion checkpoint](2026-10-16-stability-completion-checkpoint.md) records the new freshness reader, updated tooling image, current production probes and remaining access/physical/time gates.
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
  load target. Hosted runs remain blocked: [GitHub's latest run](https://github.com/CVamsi27/docita/actions/runs/38701221691)
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
  access now verifies the actual project/branch and six-hour retention. A
  past-point clone, encrypted synthetic insert/delete/recovery, verified key
  comparison and R2 encrypted-object exercise pass. Both owned drill branches
  and the synthetic object were removed; production endpoint configuration is
  unchanged. No clinical data existed to recover, so synthetic proof remains
  bounded. The isolated RLS sweep and non-owner runtime probe pass 19/19, with
  all 91 tenant tables covered there; production still has 16 gaps. The user
  selected keeping Neon Free and preparing independent encrypted backups. See
  the [drill record](../operations/dr-drills/2026-10-15-neon-isolated.md) and
  [DR runbook](../operations/DR_RUNBOOK.md).
- Production's ledger has 10 unapplied October migrations. The safe dry-run
  correctly exits 1 for pending status. All ten subsequently applied on a fresh
  isolated production copy: 175 completed migrations, unchanged core counts,
  integrity exit 0 and 19/19 strict tenant checks. That copy was deleted and a
  read-only production post-check confirms its ledger and role/policies are
  unchanged. Populated-data behavior, old/new runtime compatibility and staging
  soak remain release gates; see the drill record for the exact scope.

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
| Runtime dependency isolation    | Installing production dependencies into a fresh manifest-only stage removes Jest, Nest CLI, braces and micromatch from both images. In-place pruning retained their physical package directories and failed the artifact regression. Generated Prisma and native bcrypt, Sharp and Sentry profiling survive the fresh install.                          |
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

## Independent encrypted backup preparation, 15 October

The user selected keeping Neon Free and preparing backups outside Neon. The new
one-shot runner streams pg_dump directly into age, retains only ciphertext on
disk, requires separate backup configuration, verifies stored ciphertext by hash
and size, and publishes a completion manifest only after all required processes
and readback pass. The writer holds only the public encryption recipient.

Process regressions pass 23/23, zero skips. A real PostgreSQL 17/TLS/channel-binding/
UTC → age → isolated pg_restore fixture passes 1/1, including exact synthetic rows,
non-owner tenant denial and tamper rejection. Its external S3 boundary is a local
fixture. The non-root AMD64 backup image has zero raw and ignore-unfixed
HIGH/CRITICAL OS/library findings. Highest sampled fixture memory was 183.1 MiB
under 512 MiB; this does not establish production transfer/load capacity.

Cloudflare's authenticated `cf` CLI created the separate `docita-db-backups`
bucket with public r2.dev access disabled and no custom domains. Its 30-day lock
and 31-day expiry/one-day multipart-abort configuration matches the canonical
JSON files. The operator supplied a separate key: backup HEAD/list pass, the
actual document bucket denies HEAD with 403, and an aggregate runtime comparison
confirms the two credentials differ from document storage. A tiny encrypted
synthetic canary under the production prefix rejects overwrite and delete with
409, while an unlocked control succeeds; locked readback is unchanged. The
119-byte synthetic canary remains until the configured retention/lifecycle; it
contains no PHI and has no production completion manifest. Real R2 upload,
readback/hash and manifest creation pass with a synthetic source label outside
that prefix. The unchanged image's final run took 4.47 seconds for 2,600 bytes.
Independent download, streamed age/pg_restore exits 0, exact restored rows/schema,
one allowed tenant row, zero cross-tenant rows and tamper rejection all pass.
Unlocked objects and disposable recovery identities/TLS credentials were removed.
The private host-Docker pipe harness initially reported a premature close even
when both tools exited 0; its correction accepts only that specific transport
condition alongside all process/authentication/data checks. The runner and image
were unchanged. See the backup runbook for full scope.
No production dump, paid backup machine or scheduler activation occurred. The
operator subsequently accepted retention-policy ownership
and approved the scoped ADR 0016 D4 30-day lock/31-day configured expiry with
quarantined erasure/legal-hold reconciliation. At the operator's request, one
recovery identity was generated locally into a mode-0700 directory with a
mode-0600 private file. Only its public recipient was installed in the protected
operator configuration; local authenticated encrypt/decrypt proof passes. No
private identity was displayed, uploaded or added to Git. This was a connected
local host: offline handoff and an offline decrypt challenge remain unverified.
Keep verified offline custody, clinical recovery/reconciliation, cadence and
stale-backup alerting as explicit activation gates. See the
[backup runbook](../operations/ENCRYPTED_DATABASE_BACKUPS.md).

## Validation record

All commands use Node 22.22.0 and pnpm 10.30.3. Evidence reflects the current
working candidate where marked; earlier results are retained with their scope.

| Gate                            | Result                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full lint                       | Passed on 14 October: 11 workspace tasks.                                                                                                                                                                                                                                                                                                                           |
| Full type checks                | Passed on 14 October: 29 workspace tasks, including production and spec API checks.                                                                                                                                                                                                                                                                                 |
| Full unit suite                 | Passed on 14 October: 6,377 tests across 48 task executions; API 525 suites / 4,376 tests.                                                                                                                                                                                                                                                                          |
| Full build                      | Passed on 14 October: 35 workspace tasks.                                                                                                                                                                                                                                                                                                                           |
| API real-DB E2E                 | Final candidate passes 63 suites / 508 cases across four sequential shards (138, 119, 104, 147). The public capability suite includes non-owner RLS proof; zero skipped cases.                                                                                                                                                                                      |
| Queue and worker scripts        | 47 focused queue tests, 15 real fake-CLI lifecycle cases.                                                                                                                                                                                                                                                                                                           |
| Pool lifecycle                  | Seven real PostgreSQL cases pass again with detectOpenHandles and no forceExit; test process exits cleanly.                                                                                                                                                                                                                                                         |
| Report/payment regressions      | 62 focused API, 16 desk UI and 12 real-DB balance tests pass.                                                                                                                                                                                                                                                                                                       |
| Runtime flags                   | 295 real-Zod/config cases pass; 147 failed before correction.                                                                                                                                                                                                                                                                                                       |
| Tenant fixture release probe    | 15 real PostgreSQL16 cases pass again, zero skipped; the four privileged-role escape regressions remain covered.                                                                                                                                                                                                                                                    |
| Compiled worker                 | Final emitted worker module loads with ordinary Node resolution and declared runtime dependencies; one runtime test passes without constructing providers.                                                                                                                                                                                                          |
| Docker fixture safety           | Nine actual artifact cases pass, zero skips. Both final AMD64 images pass non-root/native/Prisma imports, all eleven flags, private-input exclusion, TLS database readiness and clean SIGTERM with configured RAM/swap/heap. Raw and CI-equivalent OS/library scans each report zero HIGH/CRITICAL, without suppressions. See exact image and resource scope below. |
| Neon recovery and RLS rehearsal | Authenticated provider identity/retention, encrypted synthetic point-in-time recovery, current-key comparison, R2 encrypted object cleanup and 19/19 strict isolated tenant checks pass. Production role/policies remain unchanged. See the bounded drill's explicit empty-data and recovery limits.                                                                |
| Full migration rehearsal        | All ten pending migrations apply on a fresh isolated Neon copy; 165 → 175 completed ledger entries, unchanged aggregate counts, integrity and 19/19 non-owner checks pass. Copy and temporary credentials removed; production remains at 165 with 16 RLS gaps. Empty clinical data limits compatibility, load and migration-duration proof.                         |
| Rollback artifacts              | 23 executable CLI cases pass; combined rollback/drain total 38. No production rollback executed.                                                                                                                                                                                                                                                                    |
| Dependency audit                | Fresh 15 October audit exits 0 under the existing braces exception; metadata reports one high and zero actionable advisories. Exception expires 12 November and was not extended.                                                                                                                                                                                   |
| Standards                       | Passed on 14–15 October: 150 standards cases (148 before the hook-context follow-up) and the full standards command. The absent API latency baseline explicitly skips and remains a release failure.                                                                                                                                                                |
| Repository dependency scan      | Trivy 0.70.0 on 15 October recognizes pnpm-lock.yaml and reports zero HIGH/CRITICAL under the same ignore-unfixed policy as CI. This excludes final image OS/runtime layers and does not revoke the November braces exception.                                                                                                                                      |
| Required latency evidence       | Fails: artifacts/api-latency-baseline.json absent (seven-day freshness required). No passing numbers were invented.                                                                                                                                                                                                                                                 |
| Knip / hygiene                  | Passed on the current candidate; emitted-worker dependency consumers remain documented.                                                                                                                                                                                                                                                                             |
| Authenticated app accessibility | 160/160 passed, zero skips, on 13 October with owned API/DB and same-origin proxy across desktop/mobile/tablet. Frontend markup is unchanged since that run.                                                                                                                                                                                                        |

### Final container identities and resource limits

Verified on 15 October, `linux/amd64`, running under Docker Desktop/Rosetta on
an ARM64 host:

- API image ID: `sha256:6d7205e18b8e02d20793d6f1c0482928d6c04c4cb96cd0736eb1a7b511ab0d13`.
  With 512 MiB RAM, 512 MiB swap and a 384 MiB heap, TLS-backed readiness took
  6.951 seconds and SIGTERM exited cleanly in 0.195 seconds.
- Worker image ID: `sha256:9761fb378e4b02e9e7f04071953a14160c3ed870054c20f60ca60c79b571cd29`.
  With 256 MiB RAM, 512 MiB swap and a 192 MiB heap, readiness took 5.417 seconds
  and SIGTERM exited cleanly in 0.340 seconds.

Neither final run had an OOM event. API/worker swap use was approximately
7.3/141.3 MiB; emulation reached the RAM limits. A prior worker run without
swap failed with OOM/137. The configured swap was already present in Fly and
was retained. These synthetic startup/short-soak checks do not prove native
production peak headroom. Both images run as UID 100 and lack package-manager
distributions and the development tooling above. Raw Trivy scanned 28 OS
packages per image and 679/681 library packages respectively. Image IDs are
local immutable build identities, not deployed registry manifest digests.

### Hook-context verification

The first push was blocked locally: 64 of the previous 148 standards tests failed
under inherited Git hook environment variables, although the direct command had
passed. A fixture's Git initialization changed the caller's shared `core.bare`
setting. Only that setting was restored; the original landing checkout is clean,
its branch/refs and the candidate commits are intact, and no remote branch was
created by the failed push.

The pre-push hook now clears Git's repository-local environment variables before
running checks, following Git's foreign-repository guidance. Two real disposable
Git regressions fail before the correction and pass afterward; they verify both
caller preservation and nonzero gate-exit propagation. Independent source review
and shell syntax checks pass. The standards suite now contains 150 cases. No hook
was bypassed and no application runtime/image source changed in this follow-up.

## Remaining release gates

1. Resolve GitHub billing/spending restrictions, then demonstrate authenticated
   hosted monitoring and actual alert delivery. Three daily GitHub checks do not alone
   establish minute-level uptime coverage.
2. Align protected staging via its PR-only path and record its deployed revision.
   Gather native workload/headroom evidence beyond the verified container boot.
   August staging and September Fly images do not exercise this candidate.
3. Finish offline recovery-key handoff/proof, clinical dump/restore reconciliation,
   scheduler and stale-backup alerting for the prepared independent backup.
   Dedicated storage, lock enforcement and scoped policy approval have evidence.
   Bounded Neon recovery proof now exists;
   it does not replace full clinical continuity. Carry the rehearsed migrations
   and non-owner credential rollout through compatibility proof and staging soak.
4. Retain provider sandbox, recipient/consent and worker cadence evidence for
   the selected contract. Payment notifications remain explicitly best effort;
   required financial/clinical effects still need reconciliation proof.
5. Gather the real fresh latency soak and workload/resource evidence, including
   authenticated cold-wake journeys with the selected API idle shutdown. Rehearse
   selected image/frontend recovery with current schema/config compatibility.
6. Release affected targets from reviewed main code only, then observe the live
   baseline for fourteen consecutive days before declaring two-month stability.

The freeze policy is active. The source repair batch and TLS recovery do not
constitute a completed production release or a guarantee of no future critical fixes.

# Stability completion checkpoint — 16 October 2026

The feature freeze through **13 December 2026** allows critical bug, security and
compliance fixes. Source repairs and bounded operator preparation have progressed;
production stability is not certified. No source release, production migration,
clinical backup dump, backup schedule, paid scheduler or worker start occurred.

## Verified this pass

| Gate                            | Current result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Process regressions             | **117/117**, zero skipped: 28 writer, 31 freshness-reader, 22 reader lifecycle, 21 writer lifecycle and 15 complete-cycle cases. Separate launcher/workflow regressions pass **34/34**; release-gate regressions pass **9/9**. Covers unsafe role evidence, stale/malformed/missing completions, changed bytes, pagination, bounded provider behavior, check-in failure, signal handling and descendant cleanup.                                                                                                |
| Real PostgreSQL 17 role/restore | **1/1** opt-in fixture passes with a restricted fresh login, forced two-tenant RLS and SELECT-only sequence grants. Seventeen unsafe privilege profiles fail the same catalog preflight. Owner credentials are rejected before dumping. Exact rows and sequence value 57 survive authenticated encrypted restore; DML/DDL/nextval are denied independently of the resettable read-only default.                                                                                                                 |
| Immutable tooling targets       | Writer `sha256:8ef3597948f92fc22f752774c8a049540ebadeff71c5dc70abd53f9e59382340`; monitor `sha256:58333ca2b80c643b5301673782dd17bcf4ac66e243606ff4403df03631b5eebc`. These earlier six-script targets passed raw scans and source matching. The selected nine-script cycle target is `sha256:d9f03d8bc01b99b1554af8bee9fea304f53176e12e984befc13a0036f6c9633c`, non-root AMD64, with **0 HIGH / 0 CRITICAL** raw OS/library findings and no advisory suppression. Local IDs are not published registry digests. |
| Actual R2 recovery fixture      | Restricted-login, forced-RLS synthetic dump/upload/readback/completion succeeds: **3,196-byte** ciphertext, **8.382 seconds**, age/pg_restore exits 0, exact two rows, one permitted tenant row, zero cross-tenant rows and tamper rejection. All owned unlocked objects, disposable credentials/private inputs and fixture containers removed. Earlier production-prefix retention proof reused; no new locked canary.                                                                                         |
| Independent storage reader      | Separate scoped monitor credentials pass list/read; overwrite, delete and document-bucket HEAD return 403. Direct reader and monitor default ENTRYPOINT correctly fail for missing production completions in check-only mode. No alert or real Sentry check-in sent.                                                                                                                                                                                                                                            |
| Recovery-key custody            | Operator returned the matching offline challenge SHA256 after confirming the offline procedure. Messenger is unmounted and the connected private identity was removed. Records distinguish challenge proof/operator attestation from forensic secure erasure. USB copy did not format the drive or replace existing files.                                                                                                                                                                                      |
| Email alert destination         | One authorized `[TEST] Docita backup alert` accepted by ZeptoMail at **06:11 UTC**. Operator confirmed inbox receipt on 16 October. No PHI or automatic retry; this does not verify failed/missed-run routing.                                                                                                                                                                                                                                                                                                  |
| Candidate logic/types           | Workspace unit suite **6,387 cases / 48 tasks** and types **29/29 tasks** pass. Field-key rotation has **10/10** focused cases; the related API suite has **281 suites / 2,096 cases**. All **508 API E2E cases / 63 suites** pass across four shards.                                                                                                                                                                                                                                                          |
| Local release gate              | Missing/stale staging latency evidence now fails full mode, including `--no-build`; fast mode is clearly a subset. **9/9** process regressions pass. The real required baseline remains absent. Full standards pass with **193/193** regression cases, zero skips; lint **11/11**, Knip, hygiene and workspace build **35/35** pass. The default latency check skips its absent artifact; explicit required-baseline execution correctly exits 1.                                                               |

The writer now requires a catalog-only, bounded read-only role preflight before
any dump. It checks direct LOGIN/BYPASSRLS, administrative flags, ownership,
memberships/reverse assumption, effective existing relation/column/sequence write
privileges, schema/database CREATE, custom SECURITY DEFINER exposure and required
SELECT coverage. PUBLIC TEMP and built-in large-object constructors remain
residual capabilities; the credential is not claimed to be immutable. No PUBLIC
or provider grants were revoked to make qualification pass.

An owned Neon child/empty-database rehearsal proves the fresh restricted login,
client certificate/hostname verification, UTC, forced-RLS rows, sequence state,
write denial and canonical role preflight. A subsequent rehearsal verifies session
error-statement logging suppression before credential SQL, atomic role creation
with a unique ownership marker, and explicit grant/default-grant revocation and
role removal through a fresh admin connection. Both owned branches were removed;
only production remains. Earlier unsupported provider credential methods and a
failed DROP OWNED cleanup were retained as failed evidence, then corrected. None
of those probes changed production roles or read clinical rows.

The first production attempt at **09:20 UTC** stopped before password submission:
the helper unnecessarily tried to SET an already-safe privileged logging value.
Read-only inspection confirmed `log_min_error_statement=panic` was already set
by server configuration. The corrected read-first procedure completed at
**09:52 UTC** without changing logging privileges.

A new dedicated `docita_backup` login is now prepared. Atomic role creation,
BYPASSRLS with no administrative flags/outgoing memberships, public schema USAGE,
current table/sequence SELECT and future `neondb_owner` default SELECT grants
succeeded. Fresh direct TLS login, UTC, read-only default and the full production
catalog preflight pass. Only its backup URL was saved to protected local operator
configuration (mode 0600). Existing application credentials/role attributes,
policies and migrations are unchanged; no clinical rows were read or dumped.
The actual writer image's PostgreSQL 17 `psql` repeats the same catalog-only
preflight successfully with `verify-full` and required SCRAM channel binding;
its temporary credential file was removed.
This credential preparation does not activate or certify recovery.

The operator selected **free tools and GitHub scheduling**. One hourly GitHub
cycle runs the writer and read-only storage checker on the same runner; one
remote Sentry monitor detects missing/failed cycles. This does not claim a
separately hosted reader. The prepared `Database Backups` environment permits
main only and holds five dedicated database/storage secrets. Endpoint, public
recipient and monitor-slug variables are prepared; activation remains false.
Sentry DSN and published registry digest remain unset. The manual-only publisher
requires the exact reviewed main SHA, a raw scan of its rebuilt image before
push, a private GHCR package and an inspected registry manifest digest.

The Sentry CLI login succeeds but its token has only `org:ci`; organization and
monitor reads return 403. No quota, monitor, PAYG setting or alert routing has
been verified or changed. The operator authorized one controlled failed-run and
one missed-run email; neither exercise has run. Provision the remote monitor
before activation so it can detect a scheduler that never starts.

A separate encrypted recovery packet captures the actual API runtime's current
field key and effective signing key directly from memory to age ciphertext.
No V2–V5 slots were configured; signing used the canonical JWT fallback. Twelve
synthetic offline-verifier/tamper cases pass. The packet still needs transfer and
challenge verification on the offline device; prior age-identity custody does not
close this new packet's custody. No private age identity was read or generated.
Historical-key inventory and clinical/object restore remain open.

The field-encryption fix tries the preferred key, then remaining distinct
configured keys after AES-GCM authentication fails. This preserves existing v1
writes and recovers old v1-labelled ciphertext after rotation. Previously the
fallback only ran for an unknown version, so legitimate old data could remain
unreadable. The regression first reproduced that failure; generic failure logging
contains no decrypted content. The E2E fixture guard also now accepts the
canonical localhost `docita_test` database without permitting a remote target.

The first unsharded API E2E run exhausted its 4 GiB heap. A later shared-database
fixture exhausted tmpfs on shards 3–4. Those failures are retained in private
evidence. Final runs use the CI shard path, with fresh disposable PostgreSQL for
the latter shards: 138 + 119 + 104 + 147 cases pass, zero skips; all owned fixtures
and temporary credentials are removed. These are local synthetic checks.

## Live snapshots and unchanged release gates

At **15:41 UTC / 21:11 IST**, the existing full production monitor again passes
**3/3**, including staff login, with zero skips. This run passed only dedicated
monitor credentials, with provider alerts and operator restarts disabled; it did
not exercise clinical writes or prove hosted cadence.

The current API image `sha256:5bb5935c0be727a051f759328b4cec18fcb47a560a745ec0a5e58be5e8bf8426`
builds and has zero raw HIGH/CRITICAL OS/library findings using the 16 October
Trivy database. Actual non-root native bcrypt/Sharp/Sentry profiling and private
path/strict-flag probes pass. In the owned internal-network PostgreSQL 17 fixture,
TLS readiness takes 11.056 seconds and SIGTERM exits zero in 0.230 seconds under
512 MiB RAM / 1 GiB total memory-plus-swap. These are synthetic boot checks, not
production capacity/headroom or latency evidence.

The current worker image `sha256:bec1c4f790411d22ee76b52880ce13dfc17984dd9963a14e5e8152e6c7570971`
also builds, passes the same non-root/native/private-input probes and reports zero
raw HIGH/CRITICAL OS/library findings. Its isolated TLS startup takes
9.145 seconds and SIGTERM exits zero in 0.267 seconds under
256 MiB RAM / 768 MiB total memory-plus-swap. Both owned runtime containers and
their PostgreSQL fixture/network are removed after verification. No live worker
was started and configured production resources remain unchanged.

At **05:36 UTC / 11:06 IST**, the existing full production probe passes **3/3**,
including staff login, with no skips. This local check did not exercise Fly
restart recovery, external alerts or authenticated clinical writes. The same
read-only metadata snapshot recorded `neondb_owner` with BYPASSRLS,
`docita_app` NOLOGIN, UTC, **165 completed migrations**, **ten pending migrations**,
and **91 tenant tables / 16 missing RLS backstops**. These are timestamped
observations, not a new scan at publication. Ten migrations and 19 strict RLS
checks passed earlier on an isolated target; production rollout remains open.

Render login is verified. The Singapore staging API is suspended, tracks **main**
and last successfully deployed `cce2a2fb49121addeb5438773c567102b1317394`; a later
`b94d6f93c` deployment failed. It supplies no current candidate/soak evidence.
[STAGING.md](../operations/STAGING.md) records isolation/revision requirements.

PR #322 awaits current-candidate CI evidence and review. The workflow includes
`ready_for_review` and skips most jobs for drafts; opening review enables those
checks after the local verification batch. The last inspected hosted CI run **38860421935** at
`0c8bf8ac3815d1443312ece6ba2ccd83357e90a1` could not start because GitHub reported
payment/spending-limit trouble; downstream jobs were skipped. The operator initially deferred billing, then reported pricing/billing resolved
on 16 October. Current Code Review calls still request GitHub connection, so no
current candidate CI success is verified. Local passes do not replace hosted
release evidence; no bypass, merge or source release occurred.

All 34 authored Linux jobs in 14 workflows are pinned to Ubuntu 24.04 during the
announced Ubuntu 26.04 `ubuntu-latest` transition. This pins the OS release, not
all hosted-image packages or third-party reusable runners. See
[GitHub's announcement](https://github.com/actions/runner-images/issues/14748).
The trusted-tooling-only [braces exception](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
still expires **12 November** and was not extended. The advisory remains unpatched
at the 16 October check; clinical production images exclude that development
package. Reassessment before expiry remains an operating obligation.

## Remaining gates

| Dependency               | Required evidence / next action                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub review/CI         | Reconnect GitHub in Code Review, verify the reported billing fix through actual candidate checks and obtain review. Local checks do not establish hosted CI results.                                                                                                                                                                  |
| Current staging          | Land reviewed source through protected main, free a branch slot, then use the PR-only staging remirror. Verify actual Render/Cloudflare revisions, isolated database identity, non-owner privileges and authenticated journeys. Staging remains suspended on an old revision.                                                         |
| Production backup role   | Dedicated production backup login and protected URL are prepared; fresh TLS/UTC/full-catalog qualification passes. Validate measured dump/restore recovery and reviewed job activation before relying on it. Application owner credentials are unchanged; no dump or schedule is active.                                              |
| Clinical recovery        | Offline verification of the prepared actual-runtime key packet, historical keys still needed by retained data/backups, quarantined full-schema restore and document-object recovery; reconcile erasure/legal holds before any user access. Measure real dump/restore memory, time and size. Synthetic results do not size production. |
| Independent scheduling   | Free GitHub cycle is selected and environment prepared but disabled. Verify Sentry management/quota/routing, reviewed published image and the new offline packet; verify authorized failed/missed-run alert delivery and **at least 24 hours** of actual hourly writer/reader operation. No service or cadence currently exists.      |
| Production RLS / release | Old/new runtime compatibility, non-owner staging proof, required latency evidence and **24 hours of staging soak** precede reviewed migration/credential/release/rollback execution. Preserve API idle shutdown and best-effort notification limitations. Do not start the worker as a connectivity test.                             |
| Final observation        | Real isolated recovery plus **fourteen consecutive days** of production observation after the reviewed release. No passing period or start time is fabricated.                                                                                                                                                                        |

See [the backup operating contract](../operations/ENCRYPTED_DATABASE_BACKUPS.md)
for exact configuration, retention, offline custody and activation boundaries.

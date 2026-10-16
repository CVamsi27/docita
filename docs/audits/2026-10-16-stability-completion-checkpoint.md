# Stability completion checkpoint — 16 October 2026

The feature freeze through **13 December 2026** allows critical bug, security and
compliance fixes. Source repairs and bounded operator preparation have progressed;
production stability is not certified. No source release, production migration,
clinical backup dump, backup schedule, paid scheduler or worker start occurred.

## Verified this pass

| Gate                            | Current result                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Process regressions             | **81/81**, zero skipped: 28 writer, 31 freshness-reader and 22 monitor-wrapper cases. Covers unsafe role evidence, stale/malformed/missing completions, changed bytes, pagination, bounded provider behavior, check-in failure, signal handling and descendant cleanup.                                                                                                                                                 |
| Real PostgreSQL 17 role/restore | **1/1** opt-in fixture passes with a restricted fresh login, forced two-tenant RLS and SELECT-only sequence grants. Seventeen unsafe privilege profiles fail the same catalog preflight. Owner credentials are rejected before dumping. Exact rows and sequence value 57 survive authenticated encrypted restore; DML/DDL/nextval are denied independently of the resettable read-only default.                         |
| Immutable tooling targets       | Writer `sha256:8ef3597948f92fc22f752774c8a049540ebadeff71c5dc70abd53f9e59382340`; monitor `sha256:58333ca2b80c643b5301673782dd17bcf4ac66e243606ff4403df03631b5eebc`. Both non-root AMD64 targets have **0 HIGH / 0 CRITICAL** raw OS/library findings, with no ignores or ignore-unfixed filtering. All six copied scripts match source. Local image IDs are not published registry digests.                            |
| Actual R2 recovery fixture      | Restricted-login, forced-RLS synthetic dump/upload/readback/completion succeeds: **3,196-byte** ciphertext, **8.382 seconds**, age/pg_restore exits 0, exact two rows, one permitted tenant row, zero cross-tenant rows and tamper rejection. All owned unlocked objects, disposable credentials/private inputs and fixture containers removed. Earlier production-prefix retention proof reused; no new locked canary. |
| Independent storage reader      | Separate scoped monitor credentials pass list/read; overwrite, delete and document-bucket HEAD return 403. Direct reader and monitor default ENTRYPOINT correctly fail for missing production completions in check-only mode. No alert or real Sentry check-in sent.                                                                                                                                                    |
| Recovery-key custody            | Operator returned the matching offline challenge SHA256 after confirming the offline procedure. Messenger is unmounted and the connected private identity was removed. Records distinguish challenge proof/operator attestation from forensic secure erasure. USB copy did not format the drive or replace existing files.                                                                                              |
| Email alert destination         | One authorized `[TEST] Docita backup alert` accepted by ZeptoMail at **06:11 UTC**. Operator confirmed inbox receipt on 16 October. No PHI or automatic retry; this does not verify failed/missed-run routing.                                                                                                                                                                                                          |
| Source standards                | Full lint, `verify:standard`, Knip and hygiene pass; standards **150/150**. Default API latency check explicitly skips its missing staging baseline. Required release latency/soak remains open. No clinical API/frontend/worker source changed in this follow-up.                                                                                                                                                      |

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

The production preparation attempt at **09:20 UTC** stopped with permission
denial (`42501`) while verifying safe credential logging, before submitting a
password or creating the role. `BACKUP_DATABASE_URL` was not saved. The successful
child rehearsal does not establish identical production operator privileges.
Do not grant additional production logging privileges or fall back to the owner
URL just to pass this gate.

The monitor target wraps the independent reader with bounded Sentry check-ins,
matching IDs, isolated child credentials and signal/process-group cleanup. Its
inert Render example specifies a reviewed registry digest and hourly UTC schedule.
Paid hosting approval, Sentry access/quota/routing and real failure/missed-run
exercises remain open. Provision the missed-run monitor before scheduler
activation: a scheduler that never starts cannot create it through a first
check-in. Writer failure/missed-run coverage needs its own monitor identity.

## Live snapshots and unchanged release gates

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

PR #322 remains draft. The last inspected hosted CI run **38860421935** at
`0c8bf8ac3815d1443312ece6ba2ccd83357e90a1` could not start because GitHub reported
payment/spending-limit trouble; downstream jobs were skipped. The operator
explicitly deferred billing remediation until **November**. Local passes do not
replace required hosted checks; no bypass, merge or source release occurred.

All 32 authored Linux jobs in 12 workflows are pinned to Ubuntu 24.04 during the
announced Ubuntu 26.04 `ubuntu-latest` transition. This pins the OS release, not
all hosted-image packages or third-party reusable runners. See
[GitHub's announcement](https://github.com/actions/runner-images/issues/14748).
The trusted-tooling-only [braces exception](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
still expires **12 November** and was not extended. The advisory remains unpatched
at the 16 October check; clinical production images exclude that development
package. Reassessment before expiry remains an operating obligation.

## Remaining gates

| Dependency               | Required evidence / next action                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub review/CI         | Restore billing in November as chosen, run required checks on the actual candidate and obtain review. PR remains draft; local results are not passing CI.                                                                                                                                                          |
| Current staging          | Land reviewed source through protected main, free a branch slot, then use the PR-only staging remirror. Verify actual Render/Cloudflare revisions, isolated database identity, non-owner privileges and authenticated journeys. Staging remains suspended on an old revision.                                      |
| Production backup role   | Production denied the safe logging precondition before credential SQL. Resolve a safe provisioning path, qualify the full production catalog and save only the backup credential through protected setup. Do not widen logging privileges or use the owner URL as a substitute. No role or backup URL was created. |
| Clinical recovery        | Quarantined full-schema restore with independently held historical field keys V2–V5, signing/configuration and document-object recovery; reconcile erasure/legal holds before any user access. Measure real dump/restore memory, time and size. Synthetic results do not size production.                          |
| Independent scheduling   | Resolve hosting choice and Sentry access/quota/routing. Use separate reader credentials and writer missed-run coverage; verify authorized failed/missed-run alert delivery and **at least 24 hours** of actual hourly writer/reader operation. No service or cadence currently exists.                             |
| Production RLS / release | Old/new runtime compatibility, non-owner staging proof, required latency evidence and **24 hours of staging soak** precede reviewed migration/credential/release/rollback execution. Preserve API idle shutdown and best-effort notification limitations. Do not start the worker as a connectivity test.          |
| Final observation        | Real isolated recovery plus **fourteen consecutive days** of production observation after the reviewed release. No passing period or start time is fabricated.                                                                                                                                                     |

See [the backup operating contract](../operations/ENCRYPTED_DATABASE_BACKUPS.md)
for exact configuration, retention, offline custody and activation boundaries.

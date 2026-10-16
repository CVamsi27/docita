# Stability completion checkpoint — 16 October 2026

The operator requested one completion pass across the remaining stability work.
This record separates completed source/fixture work from live gates requiring
operator access, physical recovery proof or elapsed observation. The feature
freeze through 13 December remains in force. No source release, production
migration, backup schedule, paid backup machine or worker start occurred.

## Verified this pass

| Gate                                | Current result                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup process and freshness checks | **54/54** process regressions pass, zero skips: 23 writer and 31 reader cases. Stale starts, missing/malformed completions, changed bytes, wrong recipients, pagination, abandoned uploads, bounded child termination and local HTTP alert acceptance/rejection are exercised.                                                                                                                                            |
| Updated tooling image               | Local AMD64 image `sha256:0eb225a1257042f06ab1f8f8bc5350d55db656c3c15db4dbe50a0d7c04aaa818`, non-root runtime, explicit four-script copy. Raw OS/library scan has **0 HIGH / 0 CRITICAL**, no ignore file or ignore-unfixed suppression. The image contains 88 scanned OS packages; no separate application package dependency tree is installed. This is not a deployed registry digest.                                 |
| Actual external recovery fixture    | Unchanged synthetic-only contract on the updated image: real R2 upload/readback/completion, exact 2,600-byte ciphertext, authenticated age and pg_restore exits 0, exact two rows, allowed tenant count 1, cross-tenant count 0 and tamper rejection. All owned unlocked objects, disposable credentials/key files and fixture containers were removed. No additional locked canary or production completion was written. |
| Real freshness negative check       | The new image lists the actual production date prefixes and exits 1 for **no completed production backup**. It sends no alert in explicit check-only mode. The original operator-credential read was repeated successfully with the independently scoped monitor credential. Temporary credentials were removed.                                                                                                          |
| Production probes                   | At **05:36 UTC / 11:06 IST**, the existing full monitor exits 0 with **3/3** passes and no skipped staff login. Fly restart recovery and external alert destinations were absent from this read/check invocation. This is local probe evidence, not hosted CI, alert delivery or clinical workflow certification.                                                                                                         |
| Live database metadata              | Same read-only transaction: `neondb_owner`, BYPASSRLS true; `docita_app` login false; UTC session; **165 completed migrations**, **91 tenant tables / 16 missing RLS backstops**. No credential, table, policy or row was changed.                                                                                                                                                                                        |
| Recovery drive                      | New Messenger folder created without drive formatting or existing-file replacement. Three copied recovery files matched byte for byte; the copied identity derived the approved recipient and authenticated the random challenge on the connected Mac. The drive was disconnected and then reconnected by the operator. Original protected local identity retained; offline proof/custody remains open.                   |
| Source standards                    | Full `pnpm verify:standard`, lint and Knip pass. The standard test suite remains **150/150**. API latency explicitly skips because its staging baseline is absent; required release mode still cannot pass. No API/frontend/clinical-worker runtime was changed by this follow-up.                                                                                                                                        |

The first standards run found a 13-line environment-validation duplicate between
the writer and reader. It was removed by a shared guarded environment reader,
then both process suites, the image/real-tool restore and the full standards
chain were rerun. No duplicate allowlist or hook bypass was introduced.

The operator subsequently selected the existing email provider for independent
backup alerts and authorized one synthetic email. The checker now supports
explicit ZeptoMail configuration, requires a single approved recipient, validates
bounded provider acceptance and never passes the mail token to storage children.
The expanded suite passes **54/54**, zero skips. One `[TEST] Docita backup alert`
was accepted at **06:11 UTC**; the operator confirmed receipt in the intended
inbox on **16 October**. No patient data was sent and the test did not activate backups. The updated local image is
`sha256:0eb225a1257042f06ab1f8f8bc5350d55db656c3c15db4dbe50a0d7c04aaa818`.
All four copied source scripts match the current source hashes; the independent
reader still refuses missing production completions in check-only mode.

Render login is now verified. Its Staging environment contains the suspended
`docita-api-staging` service, configured to track **main**, with last successful
commit `cce2a2fb49121addeb5438773c567102b1317394`. A later deploy at `b94d6f93c`
failed. No service was resumed, settings changed or stale revision accepted as
current validation. [STAGING.md](../operations/STAGING.md) records the required
branch, isolation and revision checks before resumption.

A separate owned Neon branch/empty-database fixture established that a NOLOGIN
non-superuser BYPASSRLS role with zero memberships can read two synthetic RLS
rows through `SET LOCAL ROLE`, while DELETE and CREATE TABLE are denied. The
branch was removed. This does not prove a fresh backup-role login or full-schema
dump permissions; no production role or data was changed. Schema-only branch
creation is blocked by the legacy `docita_app` role, which was left intact.

The CI run also carries GitHub's announced `ubuntu-latest` migration to Ubuntu
26.04, rolling from 19 October through 19 November. Docita-authored Linux jobs
now specify `ubuntu-24.04` to avoid an unplanned operating-system migration during
the freeze. [GitHub's runner announcement](https://github.com/actions/runner-images/issues/14748)
identifies that label as the mitigation. This pins the OS release, not every
managed-image package or runner inside a third-party reusable workflow. Workflow
triggers, permissions and disabled deployment/database controls are preserved.

The dependency audit also exits 0 after its configured exception, while metadata
still counts one HIGH advisory. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
continues to list no patched version on 16 October. Its trusted-tooling-only
exception still expires **12 November**; it was not extended. The API/worker
production images exclude this development dependency. Review/remediation before
expiry remains an operating obligation during the freeze.

The standalone reader uses explicit separate configuration, a two-hour limit
based on backup start time, recipient/object/format checks and bounded streamed
hash verification. Normal execution requires an approved alert endpoint and posts
only on failure. HTTP acceptance is not human acknowledgement. A reader schedule
also needs independent missed-run detection; a writer failure before upload is
observable through its scheduler/exit status, not R2 alone. See
[the operating contract](../operations/ENCRYPTED_DATABASE_BACKUPS.md#prepared-independent-freshness-checker-16-october).

## Gates that cannot be replaced with a successful local command

| Dependency                   | Required evidence / next action                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physical offline recovery    | Operator runs the copied README challenge on an offline recovery device and returns only its SHA256 plus custody confirmation. Compare with protected evidence before removing the connected local identity. Disconnection alone is not the offline decrypt proof.                                                                                                                                       |
| Independent monitor setup    | Separate read-only R2 credentials are verified: list/read pass; overwrite, deletion and document-bucket HEAD return 403; the synthetic control was removed. The explicit email destination is configured locally and one authorized test was accepted by ZeptoMail. The operator confirmed inbox receipt on 16 October. Independent scheduling and missed-check paging remain open.                      |
| GitHub review/CI             | PR #322 is open and draft. Code Review access works. Inspected run 38858179086 at head `e877beda7` fails Detect CI Scope before jobs start because GitHub reports payment/spending-limit trouble; downstream checks are skipped. The operator deferred billing remediation to **November**. Required CI remains open, with no bypass, merge or release. This is not a source-test failure or passing CI. |
| Render staging access        | Login verified. The Free Node service in Singapore is suspended and tracks main rather than staging. Last successful deployment is an older revision; no current candidate or soak is running. Correct isolated configuration and reviewed branch alignment before resumption.                                                                                                                           |
| Current staging              | Merge reviewed source through protected main first, free a branch slot, then use the PR-only staging remirror. Confirm actual Render/Cloudflare revision and isolated database identity, migrations, non-owner privileges, compatibility and authenticated journeys. The remote still contains exactly two open feature branches.                                                                        |
| Database backup and recovery | Dedicated database backup-role boundary, direct TLS connection, measured real dump budget and quarantined production restore with independent field/signing/object keys and erasure/legal-hold reconciliation. Production owner credentials are not a permanent backup-role substitute.                                                                                                                  |
| Production RLS / release     | Carry the rehearsed ten migrations through old/new runtime compatibility and non-owner staging proof, then **24 hours of staging soak**. Use the reviewed release/rollback path; keep API idle shutdown and required provider/replay boundaries intact. Do not start the worker as a connectivity test.                                                                                                  |
| Cadence and final stability  | Demonstrate independent hourly writer/reader operation and alert/failure/missed-run behavior for **at least 24 hours**, perform a real isolated restore, then collect **fourteen consecutive days of production observation** after the reviewed release. No start time or passing observation window is fabricated.                                                                                     |

Production backup activation and production source release remain blocked by the
named prerequisites. The new checker closes a source-preparation gap; it does
not certify production recovery, capacity, availability or two months without
critical fixes.

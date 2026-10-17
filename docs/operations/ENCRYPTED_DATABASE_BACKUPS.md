# Independent encrypted PostgreSQL backups

Status: preparation only. On 15 October 2026, the separate `docita-db-backups`
R2 bucket was created with public `r2.dev` access disabled and no custom domains.
The dedicated writer credential scope and storage lock have passed synthetic
verification. The operator approved the retention policy on 15 October and
requested local recovery-key generation. The public recipient is configured and
the local key pair passed authenticated decryption. On 16 October the operator
returned the matching offline challenge hash and confirmed offline handling;
Messenger is unmounted and the connected local private identity was removed.
The production backup job, remote missed-run alerting and clinical restore remain
unverified. The operator selected a GitHub schedule and free tools on 16 October;
the earlier Fly/Render hosting proposal is superseded. Keeping Neon Free leaves its configured six-hour
recovery history unchanged.

On 16 October the recovery files were copied into a new folder on the operator's
Messenger USB drive without overwriting or erasing existing files. Byte comparison,
public-recipient matching and authenticated challenge decryption using that copy
passed on the connected Mac. The later offline challenge matched the protected
expected digest, and the operator reported completion of the offline procedure.
The drive is unmounted and the connected identity file has been removed. This is
operator-attested physical custody plus challenge proof, not a forensic-erasure
claim. The ExFAT drive does not enforce Unix permissions; keep it physically secure.

The selected target is an hourly independent backup, a warning when the latest
completed backup is older than two hours, a 30-day minimum retention lock and
expiry after 31 days. These are operating targets until the activation evidence below exists. The clinical API
keeps idle shutdown; the clinical worker is not the backup scheduler.

## Security and recovery boundary

`scripts/db/backup-database.mjs` streams PostgreSQL's custom archive into age.
Plaintext passes through process pipes and memory. Only encrypted archive and
readback files touch the runner's temporary directory. The writer holds an age
**public recipient**, never the recovery identity. Its dedicated storage key may
write new objects and read them back. R2's scoped object read/write credential
also permits overwriting and deleting **unlocked** objects; this was verified with
an owned synthetic control. The production prefix's bucket lock prevents those
operations during its retention window. Lifecycle and bucket-lock administration
remain under a separate operator credential. Prefix correctness is therefore part
of the recovery safety boundary.

The runner verifies a SHA256 and byte count after downloading the stored
ciphertext, then conditionally creates a completion manifest. Unique keys and
`If-None-Match: *` prevent replacement. See [R2 conditional operation support](https://developers.cloudflare.com/r2/api/s3/api/). A transfer or local process failure exits
nonzero and never emits a `backup_completed` event. An uncertain completion-upload
response needs object inspection: a remote write can succeed before its response
is lost. Failed attempts can leave ciphertext without a completion manifest;
retention rules handle these orphaned objects. Consumers must consider only
completed manifests and verify their referenced object before recovery.

The manifest contains an opaque source label, backup ID, times, ciphertext size,
SHA256, public-recipient fingerprint and archive format. It contains no connection
string, database password or patient data. SHA256 detects accidental corruption;
separate bucket-lock controls and restricted administrator access are required
to protect against malicious replacement or deletion.

A logical dump is one database, including its schema and rows. It does not back
up cluster roles, external document objects, provider settings or Docita's field
encryption key. Recovery also requires independently held `ENCRYPTION_KEY`,
any historical field-key versions still needed by stored ciphertext or retained
backups, required signing/configuration custody, verified role/RLS setup and document-storage recovery.
A readable archive alone does not prove clinical recovery.

The canonical prepared storage policies are
[the 30-day prefix lock](../../scripts/db/backup-bucket-lock.json) and
[the 31-day expiry / incomplete-upload lifecycle](../../scripts/db/backup-bucket-lifecycle.json).
They apply to `docita-production/`; the production source identifier must match
that prefix. Provider readback matched both canonical controls, and an owned
production-prefix synthetic canary rejected overwrite and deletion with
`409 ObjectLockedByBucketPolicy` while preserving its bytes. A policy file alone
would not provide that enforcement evidence.
On 15 October 2026, the Docita operator explicitly accepted retention-policy
ownership and approved this 30-day lock/31-day configured expiry with restored
data quarantined until erasure/legal-hold reconciliation is verified. See the
scoped [ADR 0016 D4 approval](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md#d4--erasure-vs-backup-retention-is-decided-explicitly-per-data-class).
This storage-policy approval does not permit exposing resurrected erased PHI or
close the other recovery, key-custody and operating gates.

PostgreSQL documents the custom archive and libpq environment options in
[pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).
The connection uses certificate and hostname verification, required SCRAM channel
binding and UTC. See [libpq TLS configuration](https://www.postgresql.org/docs/17/libpq-connect.html).

## Explicit configuration

Load these through the existing protected secret setup or the dedicated machine's
secret store. Do not put values in shell arguments, commit environment files, or
reuse the API document-bucket credentials. No application `DATABASE_URL`, staging
URL, personal AWS profile or ambient AWS credentials are inherited by child tools.

| Variable                      | Requirement                                                                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BACKUP_DATABASE_URL`         | Verified **direct** PostgreSQL endpoint, explicit username/password/database, `sslmode=verify-full`; pooler endpoints and other URL query options are rejected. Percent-encode reserved credential characters. |
| `BACKUP_AGE_RECIPIENT`        | Operator-approved `age1…` public recipient. Record its fingerprint against the offline recovery identity.                                                                                                      |
| `BACKUP_SOURCE_ID`            | **Set `docita-production` for the prepared bucket.** Other labels do not match its lock/expiry policies. Synthetic fixtures use separate owned labels; never include patient or staff identifiers.             |
| `BACKUP_BUCKET`               | Separate backup bucket with documented access, retention and lock policy.                                                                                                                                      |
| `BACKUP_S3_ENDPOINT`          | Dedicated HTTPS service origin, without embedded credentials, paths or query parameters. R2 uses the account's S3 API endpoint.                                                                                |
| `BACKUP_ACCESS_KEY_ID`        | Bucket-scoped backup writer/readback key.                                                                                                                                                                      |
| `BACKUP_SECRET_ACCESS_KEY`    | Corresponding secret, distinct from document storage.                                                                                                                                                          |
| `BACKUP_TLS_CA_FILE`          | Optional absolute trusted CA file; default `system`. Never disable verification.                                                                                                                               |
| `BACKUP_MAX_DURATION_SECONDS` | Optional positive integer, default 1200, maximum 7200.                                                                                                                                                         |
| `BACKUP_MAX_BYTES`            | Optional ciphertext limit, default 1 GiB, maximum 4 GiB. Size the runner's temporary filesystem for **two** copies plus headroom.                                                                              |
| `BACKUP_TEMP_DIR`             | Optional writable temporary parent. Prefer a dedicated size-limited tmpfs.                                                                                                                                     |

The runtime requires PostgreSQL **17** `pg_dump` and `psql`, age 1.2 or newer within major 1,
and AWS CLI v2. The server/client major must be rechecked before any database
upgrade; a successful tool-version check does not inspect the server version.
The dump leaves `row_security` enforcement at PostgreSQL's default backup setting:
insufficient table/RLS privileges must fail the dump rather than silently filter
rows. Use a separately controlled database backup role with the privileges needed
to dump **all** tenant rows. Record and review that privilege boundary; never
replace the clinical application's restricted role with the backup login.

Before dumping, the writer runs the shared catalog-only
`scripts/db/backup-database-role.mjs` preflight through `psql`. Only an exact true
result permits the dump. It requires a fresh LOGIN identity with BYPASSRLS, no
elevated administrative flags, no outgoing memberships, no ownership, and no
unprivileged login able to assume it. It rejects effective table/column writes,
sequence USAGE/UPDATE, database/schema CREATE and executable custom SECURITY
DEFINER functions, and requires SELECT on all application tables and sequences.
The query runs in a bounded read-only transaction with a catalog search path;
production qualification never attempts clinical reads or mutation probes.

The boundary concerns existing persistent relations, sequences, namespaces and
database creation privileges. PostgreSQL PUBLIC TEMP access and built-in
large-object constructors remain residual capabilities; it is not a blanket
immutable credential. `default_transaction_read_only=on` is defense in depth and
can be reset by a client. Do not revoke production PUBLIC/provider permissions
merely to make qualification pass. Review grants again after schema changes.

## Build and manual validation

Build from a minimal context containing only the public Dockerfile and copied scripts:

```sh
tar -C scripts/db -cf - backup.Dockerfile backup-database.mjs \
  backup-database-role.mjs backup-environment.mjs backup-alerts.mjs \
  check-backup-freshness.mjs run-backup-monitor.mjs run-backup-writer.mjs \
  backup-job-lifecycle.mjs run-backup-cycle.mjs |
  docker build --platform linux/amd64 -f backup.Dockerfile -t docita-backup:candidate -
node --test --test-concurrency=1 scripts/db/backup-database.test.mjs scripts/db/check-backup-freshness.test.mjs scripts/db/run-backup-monitor.test.mjs scripts/db/run-backup-writer.test.mjs scripts/db/run-backup-cycle.test.mjs
```

The opt-in real-tool test requires a disposable **localhost** PostgreSQL fixture
whose database name starts `docita_backup_fixture_`, PostgreSQL 17 clients, age,
`age-keygen`, `psql`, `createdb` and `dropdb`. Supply only that owned synthetic
connection as `BACKUP_REAL_FIXTURE_DATABASE_URL` and its verified public CA as
`BACKUP_REAL_FIXTURE_CA_FILE` through protected environment configuration. Then run:

```sh
BACKUP_REAL_TOOL_TEST=1 node --test --test-name-pattern='real PostgreSQL 17' scripts/db/backup-database.test.mjs
```

This test creates and removes its own recovery database and role and exercises a
disposable age identity; it never uses production or real object storage. Its fake
S3 executable needs an executable test filesystem. For a hardened container with a
`noexec` `/tmp`, set the test-only `BACKUP_TEST_EXECUTABLE_DIR` to a separate owned
executable tmpfs. The backup runner does not read either test-only configuration.

The image runs as UID 1000, contains PostgreSQL 17, age, AWS CLI and Node, and
contains no application dependencies or private inputs. Scan the final immutable
image for OS and library vulnerabilities before release. Keep the image digest
and tool versions with the evidence; a floating build tag is not release proof.

After loading **synthetic fixture** settings through a protected environment
file, a local bounded manual run uses:

```sh
docker run --rm --memory 512m --cpus 1 --read-only \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=160m,uid=1000,gid=1000,mode=0700 \
  --entrypoint node --env BACKUP_MAX_BYTES=67108864 \
  --env-file "$BACKUP_ENV_FILE" docita-backup:candidate /opt/docita-backup/backup-database.mjs
```

`BACKUP_ENV_FILE` is an operator-selected protected file path. It is not a new
application secret variable and is never copied into the image. With a tmpfs,
archive bytes count against the memory limit: reduce the ciphertext budget to fit
the measured database size or choose explicitly budgeted memory and ephemeral
encrypted storage. This synthetic example limits each ciphertext copy to 64 MiB;
it does not establish the production memory budget. An application-health response is not
backup evidence.

## Preparation evidence, 15 October 2026

- Child-process regression suite: **23 passed, zero skipped**. Failures cover
  invalid configuration, tool versions, dump/encryption/transfer/manifest errors,
  corrupt and oversized readback, byte/time limits, ignored SIGTERM, secret
  isolation and unique conditional keys.
- Real PostgreSQL 17 / verified TLS / required channel binding / UTC / age /
  streamed `pg_restore` fixture: **1 passed, zero skipped**. Two exact synthetic
  rows survived restore; a fresh non-owner role saw its one tenant row and zero
  cross-tenant rows. Modified ciphertext failed authentication. The external S3
  boundary was a local fake; the separate actual-R2 evidence below covers storage
  transfer without reading the production database.
- Final `linux/amd64` image ID:
  `sha256:1d133802148c7987d4deb92b9f1173a59e6646f91e03192daf3b3e21afec3624`.
  UID 1000; Node 22.22.3, pg_dump 17.11, age 1.2.1 and AWS CLI 2.32.7. The embedded
  runner hash matched the source; npm, pnpm and yarn were absent.
- Trivy OS and library scans: **zero HIGH/CRITICAL findings**, both with and
  without `--ignore-unfixed`; no new suppressions. This is evidence for that image
  and scan database, not a promise about future advisories.
- The final small fixture completed in about 4.1 seconds with a highest sampled
  backup-container usage of 183.1 MiB under a 512 MiB limit. This measures synthetic
  data and a fake S3 boundary; it does not establish production backup/restore
  time, actual AWS transfer memory, schedule or recovery point.

The owned PostgreSQL and restore containers were removed after verification.
No production dump, source deployment or backup schedule was activated.

### Actual storage scope and retention verification

The operator-provided backup pair was compared with the application's runtime R2
pair using hashes internally; only comparison booleans were returned. Both values
were distinct and belonged to the intended account. Backup-bucket HEAD and list
operations succeeded; metadata-only HEAD on the actual application document
bucket returned **403**. No existing document objects were read.

Two separate synthetic scopes keep recovery proof from being mistaken for a
production backup:

- The prepared runner uses an explicit `synthetic-recovery-<opaque>` source label
  for actual R2 upload/readback/completion checks. These objects sit **outside**
  the production lock prefix, never count toward production freshness, and are
  deleted with absence verification after the isolated exercise. The actual R2
  run passed: the unchanged prepared image produced a **2,600-byte** age archive
  and completion manifest in about **4.5 seconds**, and independent download
  matched both SHA256 and size. Authenticated streamed recovery restored the two
  exact synthetic rows and tenant policy; a fresh non-owner role saw **one**
  allowed row and **zero** cross-tenant rows. Modified ciphertext was rejected.
  Both age and `pg_restore` exited **0**. All unlocked run objects and disposable
  private identity/TLS/credential inputs were removed after verification.
- A separate **119-byte encrypted** canary sits under
  `docita-production/synthetic-retention-<opaque>/`, with explicit synthetic
  metadata and **no production completion manifest**. Unconditional overwrite
  and deletion both returned **409 `ObjectLockedByBucketPolicy`**, and readback
  remained byte-identical. An unlocked synthetic control successfully overwrote
  and deleted, so the denial was enforced by the prefix lock. The canary remains
  protected until **14 November 2026 at 09:04:34 UTC** and becomes eligible for the
  31-day lifecycle after **15 November 2026 at 09:04:34 UTC**; actual lifecycle
  execution is asynchronous. Its disposable encryption key was destroyed. The
  exact owned key and timestamps are retained in private operator evidence.
  Do not weaken the lock to remove this harmless synthetic object.

The initial host-side recovery harness treated Docker's
`ERR_STREAM_PREMATURE_CLOSE` on attached stdin as a failed restore. A controlled
local reproduction showed that transport close with both child tools exiting 0
and both rows restored. The final harness recorded the quirk and accepted only
that exact transport error alongside **both zero tool exits**, authenticated age
decryption, exact fixture data/schema and tenant-denial checks. It rejected every
other pipe error or nonzero tool exit and used a fresh owned evidence directory.
The production backup runner uses direct child-process pipes and required no
source or image change. This synthetic exercise does not establish recovery of
production PHI, historical field keys, document objects, scheduler cadence or
stale-backup alert delivery.

## Isolated streamed restore

### Offline recovery-key custody

The operator selected **offline only** on 15 October. Generate the production
identity on the offline recovery device, using age 1.2 or newer within major 1.
Choose paths on the protected offline recovery medium before running:

```sh
umask 077
age-keygen -o "$RECOVERY_IDENTITY_FILE"
age-keygen -y "$RECOVERY_IDENTITY_FILE" > "$RECOVERY_RECIPIENT_FILE"
```

These are operator-selected file paths on that offline device. The first file
contains the private identity and stays offline. Transfer only the second file's
public `age1...` recipient to the protected operator setup as
`BACKUP_AGE_RECIPIENT`. Use a classic age recipient; the prepared age 1.2 runtime
does not support the newer post-quantum recipient type. See the
[official age key-generation guidance](https://github.com/FiloSottile/age#usage).
Record custody ownership and verify an offline synthetic decrypt challenge before
production activation.

**Operator-requested local generation, 15 October.** The operator subsequently
asked the assistant to run key generation on the connected local computer. One
private identity was generated into a mode-0700 local recovery directory with a
mode-0600 identity file. Its public recipient was saved in the protected operator
configuration; local synthetic encryption and authenticated decryption passed.
No private key was displayed or uploaded by this workflow. The protected local
handoff instructions identify the files and offline challenge. On 16 October the
operator returned the matching offline challenge hash after confirming the offline
procedure. Messenger was unmounted, and the connected local identity was removed.
The private identity stays on the offline medium. The successful handoff does
not replace the remaining clinical recovery and operating evidence.

### Recovery procedure

Use a separate operator recovery environment with the private identity and
protected PostgreSQL connection settings for a new isolated target. Keep the
identity offline outside recovery exercises; do not install it on the backup
writer, API, worker, GitHub runner or bucket. Never test by overwriting the
production database or moving a Neon production compute.

1. Select a completed manifest; record its object key, original backup start time,
   hash and size. Download only ciphertext using the dedicated read credential.
   Verify SHA256 and byte count before decrypting. Reject orphaned, stale,
   truncated or mismatched objects. Decryption authentication must also pass.
2. Load the isolated target connection through `PGHOST`, `PGPORT`, `PGDATABASE`,
   `PGUSER`, `PGPASSWORD`, `PGSSLMODE=verify-full`, `PGSSLROOTCERT=system`,
   `PGCHANNELBINDING=require` and `PGOPTIONS='-c TimeZone=UTC'`. Verify the target
   host and database separately. Create an empty database first. No database
   passwords belong in command arguments.
3. In Bash with `set -o pipefail`, stream directly into restore:

   ```sh
   age --decrypt --identity "$RECOVERY_IDENTITY_FILE" "$CIPHERTEXT_FILE" |
     pg_restore --dbname "$PGDATABASE" --exit-on-error --single-transaction --no-owner --no-acl
   ```

   Do not redirect decrypted output to a file. A failure of **either** process
   invalidates the exercise. Do not log decrypted SQL or rows.

4. Restore the documented roles/privileges and required encryption configuration.
   Verify aggregate table/tenant counts, foreign-key integrity, critical schema
   and migration state. In the synthetic exercise, verify exact owned fixture
   rows and tenant denial. Keep a production recovery target quarantined and
   inaccessible to users until approved erasure and legal-hold state has been
   reconciled with the restored snapshot. Then verify authorized application
   decrypt/read behavior without logging PHI; never expose resurrected erased data
   merely because a restore technically succeeded.
5. Record elapsed time, newest recoverable snapshot time and verified loss
   interval. Remove only the owned isolated recovery target after evidence and
   approved retention. Keep backup retention independent of that cleanup.

See [the DR runbook](DR_RUNBOOK.md) for wider application and document recovery.

## Activation and freshness gates

### Prepared independent freshness checker, 16 October

`scripts/db/check-backup-freshness.mjs` is a separate bounded reader. It lists
the current and previous UTC date prefixes under `docita-production/`, follows
explicit pagination, validates the existing writer's completion manifests and
selects the greatest validated **backup start time**. It verifies the selected
stored ciphertext's streamed SHA256 and size again. It cannot decrypt or certify
clinical recovery. A recent completion cannot make an old snapshot fresh, and
synthetic source labels, retention canaries and orphaned uploads cannot satisfy
the check. A newer orphaned upload older than thirty minutes also fails the check.

Supply these values through the independent monitor's protected secret setup:

| Variable                                                            | Required value                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BACKUP_MONITOR_S3_ENDPOINT`                                        | Dedicated R2 HTTPS service origin.                                                                                                               |
| `BACKUP_MONITOR_BUCKET`                                             | `docita-db-backups`.                                                                                                                             |
| `BACKUP_MONITOR_AGE_RECIPIENT`                                      | The approved public recipient matching the writer.                                                                                               |
| `BACKUP_MONITOR_ACCESS_KEY_ID` / `BACKUP_MONITOR_SECRET_ACCESS_KEY` | Separate R2 **Object Read only** token scoped only to this bucket. Verify its effective list/read access and write denial before activation.     |
| `BACKUP_MONITOR_ALERT_PROVIDER`                                     | `zeptomail` for the selected existing email provider; `webhook` is the backward-compatible default.                                              |
| `BACKUP_MONITOR_ALERT_WEBHOOK_URL`                                  | Required only for `webhook`: approved HTTPS Slack-compatible destination.                                                                        |
| `BACKUP_MONITOR_EMAIL_API_URL`                                      | Required for `zeptomail`: explicitly configured regional HTTPS `/v1.1/email` endpoint matching the existing provider.                            |
| `BACKUP_MONITOR_EMAIL_TOKEN`                                        | Required for `zeptomail`: existing Send API token, supplied through protected monitor secrets. Never pass it in arguments or logs.               |
| `BACKUP_MONITOR_EMAIL_FROM` / `BACKUP_MONITOR_ALERT_EMAIL_TO`       | Required for `zeptomail`: one explicit bare sender and approved recipient address; no inferred application/staff recipient or display-name list. |
| `BACKUP_MONITOR_MAX_DURATION_SECONDS`                               | Optional total storage-check budget: default 300, maximum 600.                                                                                   |
| `BACKUP_MONITOR_MAX_BYTES`                                          | Optional ciphertext read limit: default 1 GiB, maximum 4 GiB.                                                                                    |

The checker never falls back to writer, document, personal AWS, database or
recovery-identity credentials. Its AWS children receive a minimal environment
and an empty private HOME. The mail token is not passed to AWS children.
Listings/manifests, streams, retries and child lifetime are bounded; external
diagnostics, private addresses and response bodies are not logged. The writer
and checker share input validation, not their storage credentials.

With the monitor environment already loaded securely:

```sh
# Explicit diagnostics only: sends no alert, exits nonzero on a failed check.
node scripts/db/check-backup-freshness.mjs --check-only

# Scheduled invocation: requires the approved destination even for a healthy run.
node scripts/db/check-backup-freshness.mjs
```

Normal execution posts only on a failed check and returns nonzero. A webhook
2xx means **endpoint acceptance**. Email additionally requires a bounded JSON
success response containing one `EM_104` result and a nonempty request ID; a
2xx error payload is rejected. See the [provider contract](https://www.zoho.com/cpaas/help/api/email-sending.html).
Acceptance does not prove inbox receipt or human acknowledgement. Email open/click
tracking is disabled. A non-2xx, redirect, oversized/malformed response or
five-second delivery timeout is reported as delivery failure; there is no
automatic POST retry because a timed-out request may already have been accepted.
Monitor process failure and
missing monitor executions must be covered by the independent scheduler's own
dead-man/notification mechanism. R2 cannot reveal a dump failure that occurred
before an object was uploaded; route writer exit failures separately. The reader beside the writer shares its host failure boundary. The selected
complete-cycle configuration below uses remote Sentry missed-run detection for
that boundary; it does not claim a separately hosted reader.

The combined process suite passes **117/117**, zero skips: 28 writer, 31 freshness,
22 reader lifecycle, 21 writer lifecycle and 15 complete-cycle regressions, including stale starts, corrupt bytes, malformed
metadata, wrong recipients, pagination, bounded termination and local synthetic
HTTP acceptance/rejection and the selected email provider's failure boundaries.
The updated tooling image is
`sha256:8ef3597948f92fc22f752774c8a049540ebadeff71c5dc70abd53f9e59382340`;
its raw OS/library scan reports zero HIGH/CRITICAL findings. Its actual-R2
synthetic dump/readback/restore passes again using a fresh restricted login under
forced RLS: 3,196-byte archive, exact two rows,
one allowed tenant row, zero cross-tenant rows and tamper rejection; all owned
unlocked objects, fixture containers and disposable private inputs were removed.
No production completion was created. That earlier image contains the preceding six-script source. The selected cycle
image below contains all nine current public scripts; do not use the earlier
image for the new cycle entrypoint. These are local immutable image identities, not
deployed registry digests or running schedules.

The operator supplied separate read-only monitor credentials on 16 October. Real
backup list/read pass; overwrite, deletion and document-bucket HEAD each return 403. The unlocked synthetic permission control was removed and HEAD confirmed 404. The checker was repeated with this identity and correctly refused to count
the bucket as a completed production backup. The operator selected the existing
ZeptoMail provider and saved an explicit operational recipient. Protected local
monitor configuration deliberately reuses that existing sender/region/token;
the checker itself never falls back to application email settings. One authorized
`[TEST] Docita backup alert` was accepted at **06:11 UTC on 16 October**. No patient
data was included, and no automatic retry was made. The operator confirmed the
test arrived in the intended inbox on **16 October**. Independent scheduling and
missed-run detection remain open; this test does not
activate production backups or close the activation gate below.

The real PostgreSQL 17 fixture uses a fresh restricted LOGIN, forced two-tenant
RLS and SELECT-only sequence grants. The owner is rejected before dumping; the
restored sequence remains at 57. Seventeen unsafe privilege profiles fail the
same preflight, including reverse role escalation, column writes, sequence USAGE,
ownership and custom SECURITY DEFINER exposure. Write-denial probes run only in
the owned synthetic fixture, with the read-only default disabled for those probes.

A separate owned Neon child/empty-database exercise also proved fresh restricted
login, verified client TLS, UTC, two synthetic tenant rows, sequence value 37,
write/DDL/nextval denial and the same canonical preflight. The owned branch was
removed. This does not establish the full production catalog/grants, clinical
recovery or a configured production backup credential. Database-role provisioning
must also keep password literals out of server error-statement logging; normal
statement logging being off alone is insufficient. Never print a provider SQL
error containing credential text. The first production preparation at 09:20 UTC returned `42501` because the helper
unnecessarily tried to SET an already-safe privileged logging value. Read-only
inspection found server-configured `log_min_error_statement=panic`; the corrected
read-first procedure succeeded at **09:52 UTC** without extra privileges.

The dedicated production `docita_backup` LOGIN is now prepared with BYPASSRLS,
no administrative flags/outgoing memberships, schema USAGE and SELECT-only
current table/sequence grants. Future objects created by `neondb_owner` receive
default SELECT grants; another creator still requires explicit review. Fresh
direct TLS/UTC login and the full production catalog preflight pass. Only the
backup URL was saved through protected local configuration, mode 0600. Application
credentials/role attributes, policies and migrations are unchanged; no clinical
rows were read or dumped and no schedule is active. The resettable read-only
default and the residual capabilities above remain relevant.
See [PostgreSQL logging controls](https://www.postgresql.org/docs/17/runtime-config-logging.html#GUC-LOG-MIN-ERROR-STATEMENT).

### Selected free GitHub schedule and remote missed-run monitor

The operator selected **GitHub Actions and free tools** on 16 October. The earlier
separate Fly/Render hosting proposal is superseded; no paid service was created.
The public repository can use standard GitHub-hosted runners without minute
charges, and GHCR container storage/bandwidth is currently free. Preserve that
public-repository/standard-runner scope and recheck provider policy before changing
it. See [GitHub runner billing](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
and [GHCR billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages).
Existing R2 retention still requires account storage/operation usage to remain
within its free allowance; these hosting choices do not waive storage charges.

On 17 October the operator imposed a **$0 spending limit**. Keep activation
disabled until actual account allowances and effective no-charge limits are
verified. The free runner designation does not cap artifact/cache storage, R2
overages or pre-existing hosting. Local verification may continue; new hosted
runs and resource activation are held. See the current
[spending gate](../audits/2026-10-17-staging-isolation-checkpoint.md#zero-dollar-spending-gate).

[`database-backup.yml`](../../.github/workflows/database-backup.yml) schedules one
complete cycle at **17 minutes past each UTC hour**. It runs only on main with
`DOCITA_BACKUPS_ENABLED=true`, a reviewed registry digest and explicit protected
configuration. Manual dispatch has the same main/context checks. No pull request
can execute this job with backup secrets. The `Database Backups` environment must
restrict deployment branches to main; keep its credentials separate from existing
application deployment secrets. GitHub may delay or drop schedules and only runs
them from its default branch; a billing failure or quota interruption must become
a missed remote check-in, not a healthy backup claim. See
[GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The selected `cycle` Docker target starts `run-backup-cycle.mjs`. It sends one
Sentry `in_progress`, runs the low-level writer and then the checker with
`--check-only`, and sends `ok` only when **both** pass. Writer failure skips the
reader; reader or check-in failure keeps the process nonzero. Each child receives
only its own allowlisted settings. The reader uses a different read-only R2
credential but runs on the same runner; Sentry provides independent detection
of a lost runner/scheduler, not a separate execution host or protection against
compromise of that runner. This is the accepted free hosting direction, with that
scope explicit. Separate writer/reader wrappers remain available for a future
independently hosted configuration; two monitors are not activated for this setup.

Use exactly one included free Sentry monitor with explicit
`BACKUP_CYCLE_SENTRY_DSN` and `BACKUP_CYCLE_SENTRY_SLUG`; no generic DSN fallback.
Check the actual account's available included slot, disabled PAYG and email routing
before activation. The lifecycle uses one matching check-in ID, an hourly interval,
fifteen-minute margin, and runtime derived from writer/reader budgets (26 minutes
at the selected 1200/300-second defaults). Five-second bounded posts have no
retries. A scheduler that never starts cannot create its own first monitor:
provision the monitor and routing independently before relying on missed-run alerts.

The local cycle image is
`sha256:d9f03d8bc01b99b1554af8bee9fea304f53176e12e984befc13a0036f6c9633c`,
non-root AMD64, with nine public scripts and zero raw HIGH/CRITICAL findings.
It is a local image identity, not a published GHCR digest. Build with the minimal
context above and `--target cycle`. The final default `writer` target now starts
`run-backup-writer.mjs` and requires its own explicit `BACKUP_SENTRY_DSN`/slug;
manual synthetic fixtures select low-level `backup-database.mjs` with a Node
entrypoint. Do not append a cycle command to another target's ENTRYPOINT.

[`publish-backup-image.yml`](../../.github/workflows/publish-backup-image.yml) is
manual-only and requires the exact reviewed main SHA. It builds only the minimal
public context, scans the exact rebuilt image for raw HIGH/CRITICAL OS/library
findings with a pinned scanner, and only then publishes a private GHCR package
and records the inspected registry manifest digest. Scanner failure blocks
publication; no ignore-unfixed or advisory suppression is applied. It never activates schedules. Set `DOCITA_BACKUP_IMAGE` to that
verified immutable reference after review; a tag or local image ID is rejected.
The launcher uses temporary registry authentication, no secret-valued arguments,
512 MiB RAM, one CPU, a read-only non-root container, dropped capabilities and a
160 MiB tmpfs with **64 MiB per ciphertext copy**. Production size/time/free-storage
budget still needs measurement; this bounded configuration can deliberately fail
on a database that does not fit.

Repository variables: `DOCITA_BACKUPS_ENABLED`, `DOCITA_BACKUP_IMAGE`,
`BACKUP_S3_ENDPOINT`, `BACKUP_AGE_RECIPIENT`, `BACKUP_CYCLE_SENTRY_SLUG`.
Environment secrets: `BACKUP_DATABASE_URL`, `BACKUP_ACCESS_KEY_ID`,
`BACKUP_SECRET_ACCESS_KEY`, `BACKUP_MONITOR_ACCESS_KEY_ID`,
`BACKUP_MONITOR_SECRET_ACCESS_KEY`, `BACKUP_CYCLE_SENTRY_DSN`.
The workflow supplies matching bucket/source and reader identity from these
canonical values. No age private key, app encryption/signing key or mail token
belongs in this job.

The `Database Backups` environment is prepared with a verified main-only branch
policy and the five dedicated database/storage secrets above. Repository endpoint,
public recipient and monitor-slug variables are prepared;
`DOCITA_BACKUPS_ENABLED=false`. The Sentry DSN and published registry digest remain
unset. No workflow was dispatched. The launcher/publication regressions pass
**34/34**, zero skips, including failed-scan publication denial and credential
cleanup.

The Sentry CLI login succeeds, but the available token has only `org:ci`;
organization/monitor API reads return 403. Login alone does not establish monitor
management, free quota or routing. Management access remains a prerequisite.

The operator authorized one controlled failed-run and one missed-run test email.
Keep the exercise bounded to the existing operational recipient and record actual
routing/receipt; local fake HTTP acceptance does not spend or replace those real
exercises. The original one-message ZeptoMail inbox proof remains separate.

### Encrypted application-key recovery packet, 16 October

A separate encrypted packet now captures the actual API runtime's current field
key and effective public-document signing key using the approved public age
recipient. Capture was allowlisted and encrypted from memory; no plaintext key
file or private age identity was created. The runtime had no configured V2–V5
slots and used the canonical JWT signing fallback. This inventory does not prove
that retired keys are unnecessary for historical data or retained backups.

The protected operator packet includes a random challenge, synthetic AES-GCM and
HMAC canaries, a ciphertext manifest and an offline verifier. Twelve synthetic
verifier/tamper cases pass. The packet still needs transfer to the offline
recovery device, authenticated verification there and a returned challenge hash.
Its expected hash remains outside the handoff packet. Existing offline custody
of the age identity does not close custody of this new application-key packet.
Historical-key discovery, document-object recovery and quarantined clinical
restore/reconciliation remain separate gates.

### Live activation requirements

The dedicated bucket, scoped credential, retention enforcement, storage-policy
owner approval and synthetic external transfer/restore now have evidence. Keep
the job unactivated until successful quarantined clinical restore with
erasure/legal-hold reconciliation,
measured production runtime/memory
and a verified independent stale-backup alert destination. Test a failed run and a
missed schedule. The operator reports GitHub billing resolved; current hosted CI
remains unverified while Code Review requests its GitHub connection. Independent
remote missed-run coverage is required even with working GitHub billing.

Use the selected GitHub workflow and verified cycle image after the readiness
gates pass. Keep the clinical worker stopped and API idle shutdown unchanged.
No Render/Fly backup machine or local always-on scheduler is selected. A manual
local run does not establish a GitHub cadence; record the first actual hosted
completion and remote missed-run coverage after activation.

Freshness must use the latest verified completion manifest's **backup start
time**, with an independent check at least hourly and an alert if that time is
older than two hours. Also alert on failed attempts, missing objects, missing
completion manifests, hash mismatches and exhausted space/time. Synthetic source
labels and retention canaries must never satisfy the production freshness check. A completion log
alone is insufficient. Storage listing/read permissions and alert delivery must
be tested independently of the writer. Verify at least 24 hours of cadence and a
real isolated restore before declaring the freeze's backup/recovery gate closed.

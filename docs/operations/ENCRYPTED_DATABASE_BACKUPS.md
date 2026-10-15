# Independent encrypted PostgreSQL backups

Status: preparation only. On 15 October 2026, the separate `docita-db-backups`
R2 bucket was created with public `r2.dev` access disabled and no custom domains.
The dedicated writer credential scope and storage lock have passed synthetic
verification. The production backup job, recovery-key custody, stale-backup alert
and real production restore remain unverified. Keeping Neon
Free leaves its configured six-hour recovery history unchanged.

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
historical field-key versions V2 through V5, required signing/configuration
custody, verified role/RLS setup and document-storage recovery.
A readable archive alone does not prove clinical recovery.

The canonical prepared storage policies are
[the 30-day prefix lock](../../scripts/db/backup-bucket-lock.json) and
[the 31-day expiry / incomplete-upload lifecycle](../../scripts/db/backup-bucket-lifecycle.json).
They apply to `docita-production/`; the production source identifier must match
that prefix. Provider readback matched both canonical controls, and an owned
production-prefix synthetic canary rejected overwrite and deletion with
`409 ObjectLockedByBucketPolicy` while preserving its bytes. A policy file alone
would not provide that enforcement evidence.
The retention-policy owner must approve the erasure/legal-hold handling before
production data is backed up under this policy; [ADR 0016](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md)
remains a proposed decision, not an accepted window for resurrecting erased PHI.

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

The runtime requires PostgreSQL **17** `pg_dump`, age 1.2 or newer within major 1,
and AWS CLI v2. The server/client major must be rechecked before any database
upgrade; a successful tool-version check does not inspect the server version.
The dump leaves `row_security` enforcement at PostgreSQL's default backup setting:
insufficient table/RLS privileges must fail the dump rather than silently filter
rows. Use a separately controlled database backup role with the privileges needed
to dump **all** tenant rows. Record and review that privilege boundary; never
replace the clinical application's restricted role with the backup login.

## Build and manual validation

Build from a minimal context containing only the public Dockerfile and runner:

```sh
tar -C scripts/db -cf - backup.Dockerfile backup-database.mjs |
  docker build --platform linux/amd64 -f backup.Dockerfile -t docita-backup:candidate -
node --test scripts/db/backup-database.test.mjs
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
  --env BACKUP_MAX_BYTES=67108864 --env-file "$BACKUP_ENV_FILE" docita-backup:candidate
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
production activation. The custody-method choice alone does not verify that a
production identity exists or approve ADR 0016 D4 retention/erasure handling.

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

Keep the job unactivated until an operator supplies the dedicated bucket and
scoped writer/readback credential, separately held recovery identity, storage
retention/lock enforcement evidence, retention-policy owner approval, a
successful quarantined encrypted restore with erasure/legal-hold reconciliation,
measured runtime/memory
and a verified independent stale-backup alert destination. Test a failed run and a
missed schedule. GitHub's currently billing-blocked hosted jobs cannot be the only
scheduler or alert mechanism.

Prepare a separate one-shot Fly machine with restart policy `no`; record its
verified image digest and explicit schedule `hourly`. Do not use `--rm`, which
would delete the future scheduler target. Do not place this job in the clinical
worker, start the existing worker, change API scaling, or infer a scheduler from a
manual successful run. Confirm the exact Fly schedule behavior using the installed
CLI before activation. Persistent machine creation and paid runtime activation
remain separate operator actions.

Freshness must use the latest verified completion manifest's **backup start
time**, with an independent check at least hourly and an alert if that time is
older than two hours. Also alert on failed attempts, missing objects, missing
completion manifests, hash mismatches and exhausted space/time. Synthetic source
labels and retention canaries must never satisfy the production freshness check. A completion log
alone is insufficient. Storage listing/read permissions and alert delivery must
be tested independently of the writer. Verify at least 24 hours of cadence and a
real isolated restore before declaring the freeze's backup/recovery gate closed.

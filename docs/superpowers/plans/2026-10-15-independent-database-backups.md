# Independent Encrypted Database Backups Implementation Plan

> **For agentic workers:** use executing-plans for the bounded backup preparation
> task. The user selected keeping Neon Free and preparing independent encrypted
> backups on 15 October 2026. Do not upgrade Neon or activate a production job
> without verified backup storage, key custody and recovery evidence.

**Goal:** Prepare an hourly encrypted PostgreSQL backup outside Neon, with a
separately held recovery key and an exercised synthetic restore.

**Architecture:** A separate one-shot backup process streams `pg_dump` directly
into age encryption. It stores only ciphertext temporarily, uploads to a dedicated
R2 backup bucket, verifies the stored ciphertext, and publishes a completion
manifest only after success. It holds the age public recipient; the recovery
identity stays in operator custody. A dedicated Fly scheduled machine avoids the
current GitHub billing restriction and does not start the clinical worker.

**Tech stack:** Node22 built-ins, PostgreSQL 17 client, age, AWS CLI, R2 S3 API,
Node test runner and an isolated local PostgreSQL fixture.

## Constraints and acceptance

- Existing API/worker images, clinician flows and production schema stay outside
  this preparation. Production retains API idle shutdown and best-effort receipts.
- No plaintext dump on disk, in logs or in object storage; no secret in process
  arguments. Pass database credentials via bounded libpq environment settings,
  certificate-verified TLS and UTC. Use the verified direct Neon endpoint.
- Separate explicit `BACKUP_*` configuration; never fall back to document-bucket,
  personal AWS or staging credentials. The writer has no recovery private key.
- Fail closed on missing tools/configuration, dump/age/upload/readback errors,
  resource/time limits, invalid versions or incomplete data. Failed pipelines
  never publish a success manifest. Remove owned local ciphertext on every exit.
- Unique object keys prevent replacement. Verify downloaded ciphertext SHA256
  and size before the completion manifest. A successful upload alone is not a
  recovery claim. Retention/lock policy is an operator gate on a separate bucket.
- Proposed policy: hourly attempts, alert if latest completed backup exceeds two
  hours, retain at least 30 days with expiry after 31 days. Canonical bucket rules
  are in `scripts/db/backup-bucket-lock.json` and `backup-bucket-lifecycle.json`.
  These are
  selected operating targets, not observed guarantees. The project remains on
  Neon's six-hour history window; never depend on it for older recovery.
- Schedule one persistent one-shot machine with restart policy `no`; do not use
  `--rm` because that would remove the future scheduler target. Record its actual
  schedule, image digest, secret names, memory, exit status and completed objects.
- The production job stays unactivated until a separate backup bucket and scoped
  credentials, offline recovery-key custody, real encrypted restore and an
  independent stale-backup alert destination are verified. GitHub Actions cannot
  be the only scheduler/alert mechanism while its jobs are billing-blocked.

## Task 1: Prepare and verify the backup runner

**Files:**

- Create `scripts/db/backup-database.mjs`: config/tool validation, child process
  lifecycle, dump-to-age stream, ciphertext hashing/cleanup, dedicated S3 upload,
  readback verification and completion manifest.
- Create `scripts/db/backup-database.test.mjs`: actual child-process fixtures
  proving failures, secret hygiene, bounded streams, corruption rejection and
  manifest ordering; no production URLs or credentials.
- Create `scripts/db/backup.Dockerfile`: isolated non-root runtime with matching
  PostgreSQL client, age and AWS tooling, minimal context and no private inputs.
- Create `docs/operations/ENCRYPTED_DATABASE_BACKUPS.md`: configuration, dedicated
  storage/key custody, manual run, hourly activation, freshness and streamed
  decrypt/restore procedure; clearly identify unexecuted production gates.
- Create `scripts/db/backup-bucket-lock.json` and `backup-bucket-lifecycle.json`:
  reviewed provider configuration, verified against the dedicated empty bucket.
- Update `.github/workflows/ci.yml` and `.fallowrc.json`: run process regressions
  for code changes and recognize the Docker entrypoint as reachable.

- [x] Write child-process regressions before the runner; run them and confirm
      failures are due to missing backup behavior.
- [x] Implement only the runner contract above. Run tests without credentials.
- [x] Exercise actual pg_dump and age with a synthetic local database and a
      disposable recovery key, restore via pg_restore to a different owned database,
      and verify known rows. Keep external-upload fixtures isolated from real buckets.
- [x] Build and scan the backup image, check tool versions/non-root, and record
      memory/time evidence on the synthetic fixture. Serialize Docker work after the
      clinical image verification. Do not deploy or create paid infrastructure.
- [x] Update DR/repair documentation with exact passed and blocked checks. Run
      the relevant lint, standards, hygiene and dependency checks before commit.

## Operator activation gate

The dedicated private bucket `docita-db-backups` now exists; its lock/lifecycle
configuration matches the canonical JSON. Scoped S3 credentials and independent
recovery-key custody remain unavailable. Cloudflare OAuth manages the bucket but
API-token management returns 403; the operator received dashboard instructions
for a bucket-scoped Object Read & Write token. Existing API document credentials
are not the backup setup. No production dump, scheduled machine or live backup
was created. ADR 0016 D4 retention/erasure approval, actual storage enforcement,
external transfer/restore, freshness and alerting remain activation gates.

## Verified preparation, 15 October

The default process suite passes 23/23, zero skips. The opt-in real PostgreSQL 17,
verified TLS/channel binding/UTC, age and streamed pg_restore exercise passes 1/1:
two synthetic rows restored, one permitted tenant row, zero cross-tenant rows,
and tampered ciphertext rejected. External S3 commands used an isolated fixture,
so this is not production transfer proof. The non-root AMD64 backup image
`sha256:1d133802148c7987d4deb92b9f1173a59e6646f91e03192daf3b3e21afec3624`
has zero raw or ignore-unfixed HIGH/CRITICAL OS/library findings. Highest sampled
whole-fixture memory was 183.1 MiB under 512 MiB; latest exercise took 4.083 seconds.
These values do not size a production database or replace schedule/restore evidence.

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
identity stays in offline operator custody. The operator selected free GitHub
hourly execution on 16 October: one bounded cycle writes, then checks stored
ciphertext with separate read-only credentials. One remote included Sentry
monitor covers a missing/failed cycle. The reader shares its runner; this does
not claim a separately hosted reader. No clinical worker or paid scheduler starts.

**Tech stack:** Node22 built-ins, PostgreSQL 17 client, age, AWS CLI, R2 S3 API,
Node test runner and an isolated local PostgreSQL fixture.

## Constraints and acceptance

- Production deployments, clinician flows and production schema stay outside
  this backup preparation. A separately verified critical field-key rotation fix
  is included in the stability candidate. Production retains API idle shutdown and best-effort receipts.
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
- Operating targets: hourly attempts, alert if latest completed backup exceeds two
  hours, retain at least 30 days with expiry after 31 days. Canonical bucket rules
  are in `scripts/db/backup-bucket-lock.json` and `backup-bucket-lifecycle.json`.
  The operator approved the 30-day lock/31-day configured expiry and quarantined
  erasure/legal-hold reconciliation on 15 October; cadence and alerting remain
  selected operating targets, not observed guarantees. The project remains on
  Neon's six-hour history window; never depend on it for older recovery.
- Prepare the default-branch-only GitHub workflow and main-only secret environment,
  exact reviewed main image publication with a mandatory raw vulnerability gate,
  immutable registry digest and bounded runtime. Keep activation false until all
  recovery and remote-monitor gates pass. No paid backup host is authorized.
- The production job stays unactivated until storage, offline application-key
  custody, quarantined clinical restore and Sentry free quota/routing are verified.
  Provision the remote monitor independently so it detects a scheduler that never
  starts. The operator now reports billing resolved; hosted CI still needs actual
  candidate evidence after Code Review reconnection.

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
configuration matches the canonical JSON. The operator supplied separate scoped
S3 credentials: backup access succeeds, document-bucket HEAD is denied and a
runtime comparison confirms distinct credentials. Actual synthetic encrypted R2
transfer/restore and production-prefix overwrite/delete denial pass. Independent
production recovery-key custody was initially unverified. The operator selected
offline-only custody and then requested local key generation. The public recipient
is configured and local authenticated decryption passed. The 16 October offline challenge matched;
operator-reported offline custody is recorded and the connected identity removed. The operator explicitly accepted ownership and
approved the scoped ADR 0016 D4 storage policy on 15 October. No production dump,
scheduled machine or live backup was created. Full clinical recovery with verified
erasure/legal-hold reconciliation, schedule/freshness and
alerting remain activation gates.

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

The separate actual-R2 exercise uses the unchanged prepared image and a synthetic
source label. Upload/readback and the completion manifest passed in 4.47 seconds;
an independent download matched the 2,600-byte ciphertext's hash and size. Both
age and pg_restore exited 0; exact rows/schema, one allowed tenant row, zero
cross-tenant rows and tamper rejection passed. Unlocked objects and disposable
keys/fixtures were removed. A separate 119-byte encrypted synthetic canary under
the production prefix rejected overwrite and delete with 409 and preserved its
bytes; it remains for the configured lifecycle. These synthetic objects never
count toward production freshness. See the [runbook](../../operations/ENCRYPTED_DATABASE_BACKUPS.md)
for the Docker transport diagnostic and exact scope.

## Completion pass, 16 October

The operator asked to complete all remaining stability work together. Continue
within the approved architecture: independent hourly checking reads the dedicated
backup bucket and validates the writer's existing completion contract. It does
not need database credentials, the recovery identity, or document storage access.
Use a bounded Node/AWS CLI process alongside the existing backup tooling, with
separate read-only credentials and an explicitly configured alert destination.
An explicit `--check-only` invocation performs no alert send; normal execution
requires the destination and fails on unsuccessful delivery. This is preparation
for an independent scheduler, not evidence that one exists.

### Task 2: Verify independent backup freshness

**Files:** create `scripts/db/check-backup-freshness.mjs` and its process regression
suite; extend `scripts/db/backup.Dockerfile`, the existing scoped CI safety step
and this runbook. Do not alter the writer's dump or completion format.

- [x] Write process regressions for fresh, stale, missing, corrupt and mismatched
      completions, paginated listing, untrusted diagnostics, bounded child exits,
      and successful/failed delivery to a local synthetic HTTP receiver.
- [x] Run `node --test scripts/db/check-backup-freshness.test.mjs` before adding
      the checker and retain the expected failing result.
- [x] Implement the checker using only built-in Node modules and AWS CLI v2.
      Accept only the explicit production source, two-hour start-time freshness,
      matching recipient fingerprint, object identity, bounded hash/size readback
      and canonical timestamps. Synthetic objects cannot satisfy this gate.
- [x] Run the new suite and the existing backup suite; rebuild the backup tooling
      image, scan it, and rerun the synthetic real-tool restore before publication.
- [x] Record external-drive copy proof separately from offline custody and prepare
      checked source for the existing PR. The [completion checkpoint](../../audits/2026-10-16-stability-completion-checkpoint.md)
      records exact passed checks and remaining operator/time gates.

The drive copy was verified on the connected Mac on 16 October without erasing or
overwriting existing files; Messenger was disconnected, then reconnected. The
subsequent offline challenge matched, offline handling was confirmed, Messenger
was unmounted and the connected local identity was removed.
Review/CI access, staging, production restore/reconciliation, cadence and elapsed
soak/observation gates remain explicit; an instruction to finish does not supply
missing measurements.

### Existing email provider follow-up, 16 October

The operator selected existing email delivery, saved an explicit recipient and
authorized one test. Added `scripts/db/backup-alerts.mjs` to the isolated image
and freshness-check boundary; application mail defaults are not inherited.
Process tests were extended before implementation and the expected failure was
retained. That email follow-up suite passed **54/54**, including rejected provider
payloads, malformed/oversized bodies, redirects, five-second timeout, no retry,
required explicit destination and no token inheritance by AWS children.

One authorized `[TEST] Docita backup alert` was accepted by the existing ZeptoMail
endpoint at 06:11 UTC. The operator confirmed receipt in the intended inbox on
16 October. Independent scheduler/dead-man coverage remains open. The operator initially
deferred billing, then reported it resolved; candidate CI/review remains unverified
while Code Review requests its GitHub connection. Render login works, but its suspended staging
service tracks main and an old deployed revision, so it provides no current soak
evidence. These are recorded in the [completion checkpoint](../../audits/2026-10-16-stability-completion-checkpoint.md).

## Remaining recovery fixes, 16 October

The operator requested all remaining fixes. Continue the approved dedicated-role,
independent reader and recovery architecture, updated to the selected free
GitHub cycle with remote missed-run coverage. The returned offline challenge matches and Messenger is unmounted;
operator-reported offline custody is recorded and the connected local private
identity has been removed. Keep forensic-erasure claims out of the evidence.

### Task 3: Enforce the dedicated database role before dumping

- [x] Add failing process regressions proving owner/elevated roles, memberships,
      effective relation/column/sequence writes, schema/database CREATE, custom
      SECURITY DEFINER exposure and incomplete role evidence stop before dumping.
- [x] Run a shared catalog-only preflight through PostgreSQL 17 psql with the
      writer's sanitized verified-TLS environment, UTC, read-only transaction and
      bounded statement timeout. Require a fresh LOGIN identity with BYPASSRLS
      and no ownership or effective persistent relation/sequence/schema/database
      modification privileges. Reject application logins able to assume the role.
- [x] Keep PUBLIC TEMP and built-in large-object construction documented as
      residual capabilities; a resettable read-only default is not authorization.
      Do not revoke production PUBLIC/provider grants to make a check pass.
- [x] Convert the actual PostgreSQL fixture to a restricted fresh backup login,
      forced tenant RLS and sequence SELECT only. Prove owner rejection before
      dumping, authenticated restore, preserved rows/sequence and write denial.
- [x] Rehearse the same role/preflight against an owned Neon empty-database
      fixture, then remove its owned branch. Verify safe credential logging,
      atomic ownership markers and explicit cleanup before production preparation.
- [x] Prepare only a dedicated production credential after the isolated rehearsal
      and full-catalog qualification. This can precede recovery so the approved
      recovery exercise can use it; clinical restore/compatibility and operating
      evidence still gate any job activation. Do not change application roles.

### Task 4: Prepare independent schedule and missed-run coverage

- [x] Add a monitor container target that starts the existing reader rather than
      appending commands to the writer ENTRYPOINT; preserve the default writer.
- [x] Add bounded Sentry in-progress/ok/error check-ins around the reader, using
      explicit monitor configuration, the same check-in ID and no credential or
      clinical payload logging. A failed check remains failed after email acceptance.
- [x] Keep `--check-only` diagnostics free of external check-ins/alerts. Test
      success, check failure, timeout, rejected check-ins and termination locally.
- [x] Prepare the reader lifecycle. The initial Render example is retired after
      the operator selected free GitHub hosting; no paid resource was created.
- [x] Run process suites, applicable builds/scans and source standards and update
      companion runbooks for the existing PR. No paid
      scheduler, real check-in/alert exercise or elapsed 24-hour cadence is implied
      by source preparation.

### Task 5: Integrate the selected free schedule and application-key recovery

- [x] Add bounded writer/cycle lifecycle wrappers. Require explicit monitor DSNs,
      isolate child credentials and report success only after writer plus reader.
- [x] Add main-only hourly GitHub execution with protected environment secrets,
      immutable-image/context validation, bounded container resources and cleanup.
- [x] Add manual reviewed-main publication: minimal public context, pinned raw
      HIGH/CRITICAL scan before push, private package and inspected registry digest.
- [x] Prepare the main-only environment and five dedicated secrets; activation is
      false. Do not dispatch the workflow without its remaining gates.
- [x] Encrypt actual-runtime current field/signing keys directly into an offline
      handoff packet and test its challenge, AES-GCM/HMAC and tamper verifier.
- [ ] Complete this packet's offline transfer and authenticated challenge proof;
      verify historical-key inventory and document-object recovery.
- [ ] Verify Sentry management access, available included slot, disabled PAYG and
      operational email routing. CLI `org:ci` access alone is insufficient.
- [ ] Exercise the two authorized real failed/missed-run alerts, reconcile the
      quarantined clinical restore, publish the reviewed image and activate.
- [ ] Observe at least 24 hours of real hosted cadence and verify actual restore.

Current process verification is **117/117**, plus **34/34** launcher/workflow cases
and **12/12** offline packet verifier cases. The selected non-root cycle image
has zero raw HIGH/CRITICAL findings. The dedicated production backup role passes
fresh TLS/UTC/full-catalog qualification. No clinical dump, schedule or real Sentry
check-in ran. See the [checkpoint](../../audits/2026-10-16-stability-completion-checkpoint.md)
for the current complete candidate checks and remaining live/review/elapsed gates.

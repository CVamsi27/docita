# Disaster Recovery & Operational Runbooks

This document is the on-call playbook. Every runbook lists:

1. **Trigger** — what symptom or alert fires it.
2. **Severity** — how loud to be.
3. **Roles** — who runs it (Primary, Secondary, Comms).
4. **Actions** — numbered, copy-pasteable steps.
5. **Verification** — how we know we're back.
6. **Postmortem** — what to capture for the report.

The procedures cover the production stack:

- API: Fly.io (`docita-api`) — see [`fly.toml`](../../fly.toml).
- Worker: Fly.io (`docita-worker`) — see [`apps/worker/fly.toml`](../../apps/worker/fly.toml).
- Database: Postgres (managed). DR clone is in a separate region.
- Web apps: Cloudflare (auto-deploy). No interactive deploy.
- Object storage: Cloudflare R2 (`R2_BUCKET_NAME`) for documents/PDFs.
- Sentry: error monitoring. Datadog: metrics + logs. PagerDuty: alerts.

> All runbooks assume the on-call engineer has `fly`, `psql`, `pnpm`,
> and `wrangler` installed and authenticated. PHI must never be pasted
> into chat or shared docs while debugging.

### Ephemeral Postgres tables (idempotency and webhooks)

HTTP idempotency (`Idempotency-Key` on marked POST routes) and verified
webhook replay dedupe are stored in Postgres (`ApiHttpIdempotencyRecord`,
`WebhookReplayDedupe`). No Redis is required for these features. The API
worker process runs an hourly job (`EphemeralStoreCleanupScheduler`) that
deletes expired rows so these tables stay bounded. If schedulers are
disabled (`ENABLE_SCHEDULERS=false`), only that cleanup is skipped for the
process; apply migrations so the tables exist before traffic hits idempotent
routes.

### Code-health ratchet gates (P5.13 / P5.14)

Two static gates keep the API free of cache anti-patterns that would otherwise
surface as memory-growth incidents or staleness bugs in production:

- `pnpm check:repo-on-module-init-cache` (P5.13) — fails if an infrastructure
  repository under `apps/api/src/domains/*/infrastructure/` implements
  `OnModuleInit` to prewarm an in-memory cache. The sole allowlisted
  exception is `prisma-medical-coding.repository.ts` (documented in audit
  AO4). Fix: use a lazy cache or move the warm-up into a scheduler.
- `pnpm check:ad-hoc-service-cache` (P5.14) — fails if an application service
  under `apps/api/src/domains/*/application/services/` holds an instance-level
  `Map` as an ad-hoc cache. The sole allowlisted exception is
  `onboarding-data.service.ts` (in-memory session store until replaced with
  `CacheService` / Redis). Fix: route caching through `CacheService` with an
  explicit TTL + invalidation strategy.

Both run in `verify:standard` with `--enforce` and must stay at 0 findings
outside the documented allowlists. If either gate goes red on a deploy, treat
it as a release blocker: the pattern it catches can degrade production memory
or serve stale clinical data. See [`SUPPRESSION_LEDGER.md`](../analysis/SUPPRESSION_LEDGER.md)
for the ledger and [`STABILITY_RUNBOOK.md`](./STABILITY_RUNBOOK.md) for the
memory/staleness incident response.

---

## RB-01: API rollback

**Trigger** Sustained error rate > 5% for 5 minutes after a deploy, OR a
critical regression confirmed by Sentry / synthetic checks.

**Severity** SEV-2 (escalate to SEV-1 if PHI exposure suspected).

**Roles** Primary engineer; Secondary verifies; Comms updates status page.

**Actions**

1. Confirm the failing release and inspect recorded images for the affected app:
   ```bash
   flyctl releases --app docita-api --image
   ```
2. Select a known-good image from release evidence and verify compatibility
   with the current schema, config and secrets. Set `RECORDED_API_IMAGE` to
   that exact reference, then run from the repository root:
   ```bash
   pnpm rollback:fly --config fly.toml --image "$RECORDED_API_IMAGE"
   ```
   The helper reads app/region from the config and skips the release command.
   It redeploys code; current config/secrets and database changes remain.
   See [deployment rollback policy](DEPLOYMENT.md#roll-back-a-bad-release).
3. Watch deployment state and inspect incident-scoped logs without exporting PHI:
   ```bash
   flyctl status --app docita-api
   ```
4. If recovery fails, capture the deployment error and preserve the incident.
   Do not guess another image or reverse migrations. Use a reviewed additive
   forward correction when schema compatibility blocks image recovery. Restore
   failed credentials only through [secret custody procedures](SECRET_ROTATION_CHECKLIST.md#rollback-procedure-partial-rotation-failure);
   release evidence contains variable names and protected version references,
   never secret values.
5. Post a status-page incident: "API degraded — investigating."

**Verification**

- `/api/health/live` and `/api/health/ready` return `200` through the direct Fly,
  public API and app/internal proxy paths. A 525 requires the
  [certificate/DNS investigation](playbooks/cloudflare-upstream-timeout.md).
- Sentry error rate returns to baseline within 10 minutes.
- Synthetic monitoring is enabled, alert delivery verified, and
  `/api/health/live` + authenticated `/api/v1/auth/me` smoke are green for
  3 consecutive runs.

**Postmortem** Capture deploy SHA, selected recovery image/release, config revision, customer-impact window,
Sentry issue ids, and the failing change in the postmortem template.

---

## RB-02: Worker hang / processing stalled

**Trigger** `worker_jobs_total{status="completed"}` flatlines while
`QueueJob.status='WAITING'` count rises. Or worker pod CPU/memory
saturated.

**Severity** SEV-2 (SEV-1 if WhatsApp send queue depth >10 minutes
because patients miss appointment reminders).

**Roles** Primary engineer; Secondary monitors queue depth.

**Actions**

1. Check worker health:
   ```bash
   fly status --app docita-worker
   fly logs --app docita-worker | head -200
   ```
2. Check queue depth and retry pressure (run from a perf/staging shell
   or a read-only DB session):
   ```sql
   SELECT name, status, COUNT(*)
     FROM "QueueJob"
    GROUP BY 1, 2
    ORDER BY 1, 2;
   ```
3. If a single VM is hung, restart it:
   ```bash
   fly machines restart <machine-id> --app docita-worker
   ```
4. If a job is poisoning the queue (the same id keeps appearing in
   logs), park it:
   ```sql
   UPDATE "QueueJob"
      SET status = 'DEAD_LETTERED',
          "deadLetteredAt" = NOW(),
          "failedReason" = 'manual park: poisoned'
    WHERE id = '<job-id>';
   ```
5. If the worker image itself is bad, follow RB-01's compatibility check using
   the worker's recorded image, then run
   `pnpm rollback:fly --config apps/worker/fly.toml --image "$RECORDED_WORKER_IMAGE"`.
   The helper uses configured region, rolling strategy and `--ha=false`.

**Verification**

- `worker_jobs_total{status="completed"}` resumes climbing.
- Queue WAITING count decreases.
- No new entries in `QueueJob.status='DEAD_LETTERED'` for the same job
  name within 10 minutes.

**Postmortem** Note which job name was hung, root cause (handler bug,
DB lock, external dependency), and any DLQ entries that need replay.

---

## RB-03: DLQ replay

**Trigger** Operator request, or `worker_dlq_size{queue="..."}` > 0
after a fix has shipped.

**Severity** SEV-3 (planned recovery work).

**Roles** Primary engineer.

**Actions**

1. List the DLQ contents (INTERNAL-role JWT required):
   ```bash
   curl -H "Authorization: Bearer $INTERNAL_JWT" \
        "https://api.docita.work/api/v1/internal/dlq?queue=whatsapp:send&limit=50"
   ```
2. Verify the fix has been deployed and that replays will not re-trip
   the original failure (check Sentry for the originating error).
3. Replay one job at a time first to validate:
   ```bash
   curl -X POST -H "Authorization: Bearer $INTERNAL_JWT" \
        "https://api.docita.work/api/v1/internal/dlq/replay/<job-id>"
   ```
4. Once verified, replay the rest in a controlled batch, no more than
   50 jobs / minute to protect downstream rate limits.
5. Review `replayCount` and `lastReplayedAt` before repeating a replay.
   Replays reset per-run `attemptsMade`, but the replay ledger remains durable.

**Verification**

- Replayed jobs reach status `COMPLETED` with `attemptsMade <=
maxAttempts`.
- Repeatedly failing jobs show increasing `replayCount`; do not loop replay
  without a new diagnosis.
- `worker_dlq_size{queue=...}` drains to 0.
- No new DLQ entries for the same job name in the next hour.

**Postmortem** Capture the originating bug, the fix commit, and how
many jobs were replayed.

---

## RB-04: Database failover

**Trigger** Primary Postgres unreachable; managed-DB alert fires; or
sustained replication lag > 60s on the read replica.

**Severity** SEV-1.

**Roles** Primary engineer; Secondary handles app surface; Comms updates
status page within 5 minutes.

**Actions**

1. Confirm primary is down (not a network blip from your laptop):
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;" || echo "PRIMARY DOWN"
   ```
2. Promote the standby (managed Postgres dashboard) and capture the
   new connection string.
3. Update Fly secrets and redeploy both apps:
   ```bash
   fly secrets set DATABASE_URL="<new-primary-url>" --app docita-api
   fly secrets set DATABASE_URL="<new-primary-url>" --app docita-worker
   fly deploy --config fly.toml --app docita-api
   fly deploy --config apps/worker/fly.toml --app docita-worker
   ```
4. If RLS is enabled, re-run the role grant migration (idempotent):
   ```bash
   pnpm --filter @workspace/db run db:migrate:safe
   ```
5. Pause webhook ingestion (toggle `WEBHOOKS_ENABLED=false` feature
   flag) until the worker is confirmed processing.

**Verification**

- `/api/health/db` returns `200`.
- Worker `worker_jobs_total{status="completed"}` resumes within 5
  minutes of redeploy.
- No constraint-violation errors in Sentry from inserts taking the new
  primary.

**Postmortem** Capture lag at failover, RTO, RPO (data lost between
primary failure and standby promotion), and downstream side effects
(missed reminders, queued retries).

---

## RB-05: Region-level outage (Fly + Postgres)

**Trigger** Cloud provider status page reports the deploy region down.

**Severity** SEV-1.

**Roles** Primary engineer leads; full IC rotation activated.

**Actions**

1. Switch DNS for `api.docita.work` to the DR region's load balancer
   (Cloudflare DNS dashboard). TTL is 60s.
2. Restore the latest verified backup into the DR Postgres cluster.
   The DR cluster lives in the alternate region and is fed by daily
   logical backups (see `infra/db-backups/README.md`).
3. Bring up API + worker in the DR region:
   ```bash
   fly deploy --config fly.toml --app docita-api-dr
   fly deploy --config apps/worker/fly.toml --app docita-worker-dr
   ```
4. Update R2 endpoint to the DR bucket if the storage bucket is also in
   the impacted region.
5. Disable WhatsApp + payments webhook deliveries until the worker
   queue is drained, then re-enable.

**Verification**

- DR API health endpoint responds within 5 minutes of DNS switch.
- Worker resumes processing the DR DB queue.
- Synthetic checks against the DR region pass.

**Postmortem** Required within 5 business days. Include RTO/RPO,
customer impact, and a tracking item for the next DR drill.

---

## RB-06: Restore single tenant from backup

> **NOT EXECUTABLE (2026-10-03).** Step 3 calls
> `pnpm --filter @workspace/db run export:tenant`, which **does not exist** in
> `packages/db/package.json` and has no implementation anywhere in the
> repository. Until that script lands, this procedure fails at step 3. The
> workaround for a live incident is the DR runbook's point-in-time restore to a
> side database plus a selective copy, with legal sign-off. See
> [ADR 0016](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md)
> (C01) for the decision and acceptance criteria.

**Trigger** Customer requests a point-in-time restore of their clinic
data (e.g., accidental bulk delete).

**Severity** SEV-2 (customer-impacting, but not platform-wide).

**Roles** Primary engineer + tenant lead; legal sign-off if PHI leaves
the production boundary.

**Actions**

1. Identify the affected `clinicId` and the desired restore point.
2. Provision a temporary restore Postgres instance from the matching
   logical backup; do **not** restore into production.
3. Export only the tables scoped to the tenant. Use the seeded export
   script which respects tenant scoping:
   ```bash
   pnpm --filter @workspace/db run export:tenant -- \
        --clinic-id <clinic-id> --output ./tenant-export.sql
   ```
4. Have the tenant lead and legal sign off on the diff.
5. Apply the export inside a transaction in production:
   ```bash
   psql "$DATABASE_URL" -1 -f ./tenant-export.sql
   ```

**Verification**

- A short scripted query validates expected row counts for the tenant
  match the backup.
- Spot check 5 records with the customer.
- No cross-tenant rows touched (re-run RLS verification queries from
  [`docs/compliance/RLS_ROLLOUT.md`](./RLS_ROLLOUT.md)).

**Postmortem** Note the restore window, time-to-restore, and any data
loss between the backup and the incident.

---

## RB-07: PHI leak triage

**Trigger** Sentry, log search, or external report indicates PHI may
have been exposed (in logs, in a Sentry event, in an API response, or
in a third-party tool).

**Severity** SEV-1.

**Roles** Primary engineer + security on-call + privacy officer.

**Actions**

1. **Stop the bleed.** If PHI is currently flowing into an external
   sink (Sentry, Datadog, an analytics tool), disable that sink:
   ```bash
   fly secrets unset SENTRY_DSN --app docita-api  # for example
   fly deploy --config fly.toml --app docita-api
   ```
2. Capture evidence — screenshots, log line ids, Sentry event ids — in
   a private incident channel (no PHI in the channel itself).
3. Use the redaction guard's regression tests to identify every code
   path that could leak the same field:
   ```bash
   pnpm --filter @docita/api run test -- --testPathPatterns="phi-"
   ```
4. Patch the leak (extend `PHI_REDACTOR_PATTERNS`, fix the offending
   logger call, add a test). Ship a hotfix per RB-01 in reverse.
5. Trigger external scrub:
   - Sentry: `sentry-cli issues delete <event-id>` for each affected
     event.
   - Datadog: open a ticket to purge the matching log lines.
6. Notify the privacy officer for breach-notification assessment under
   DPDP / contractual obligations.

**Verification**

- `pnpm --filter @docita/api run test -- phi-` includes a new failing
  case before the fix and passes after.
- New synthetic check or alert added to catch the same shape in the
  future.
- External sinks confirm purge.

**Postmortem** Mandatory within 24 hours. Include scope (rows, fields,
tenants), exposure window, root cause, fix commit, and notification
record.

---

## RB-08: Rate-limit / quota breach for a tenant

**Trigger** A clinic exhausts their API quota (HTTP 429s spike) or a
known abuse pattern (credential stuffing).

**Severity** SEV-3 (SEV-2 if the abuse threatens platform stability).

**Roles** Primary engineer; tenant lead handles communication.

**Actions**

1. Confirm the source clinic id from the X-Tenant-Id header in the
   `429` response.
2. Inspect their quota:
   ```sql
   SELECT * FROM "ClinicApiQuota" WHERE "clinicId" = '<clinic-id>';
   ```
3. If the quota is misconfigured (e.g., legitimate growth), bump it via
   the admin endpoint:
   ```bash
   curl -X PUT -H "Authorization: Bearer $INTERNAL_JWT" \
        -H "Content-Type: application/json" \
        -d '{"rps": 50, "rpm": 1500, "monthlyBudget": 500000}' \
        "https://api.docita.work/api/v1/internal/clinics/<clinic-id>/api-quota"
   ```
4. If the traffic looks malicious (single IP, repeated `/auth/login`
   bursts), block at the WAF layer (Cloudflare dashboard) and reset
   any leaked credentials.

**Verification**

- 429 rate for the clinic returns to baseline.
- No collateral damage to other tenants (other clinics' p95 latency
  unchanged).

**Postmortem** Document the new quota and any WAF rules added.

---

## RB-09: Webhook outage / replay storm

**Trigger** WhatsApp / Razorpay / subscription webhooks failing
verification or replays detected in `webhook_replays_total` metric.

**Severity** SEV-2.

**Roles** Primary engineer.

**Actions**

1. Confirm the failure mode in Sentry (signature mismatch vs replay vs
   downstream error).
2. If signatures are mismatching after a secret rotation, re-sync the
   secret:
   ```bash
   fly secrets set WHATSAPP_WEBHOOK_SECRET="<new-secret>" --app docita-api
   fly deploy --config fly.toml --app docita-api
   ```
3. If the upstream provider is replaying en masse (e.g., due to our
   prior `5xx`), confirm we are returning `2xx` for accepted events
   then let the replay window drain naturally; the verifier will dedupe
   on event id.
4. If the dead-lettered webhook count rises, follow RB-03 to replay
   them once the root cause is fixed.

**Verification**

- Webhook 2xx rate returns to >99%.
- No new `WebhookEventReplay` records for the same provider event id.

**Postmortem** Capture the rotation step, drift between staging and
production secrets, and any operational fix to the rotation runbook.

---

## RB-09b: Telemetry coverage shows a gap or reads UNAVAILABLE

**Trigger** `GET /api/v1/monitoring/telemetry-coverage` returns state
`GAPS_RECORDED` or `UNAVAILABLE`, or the internal dashboard's _Telemetry
Coverage_ badge is not `Complete`.

**Severity** SEV-3 for `GAPS_RECORDED`, SEV-2 for `UNAVAILABLE` (no
observability during an incident is its own incident).

**Roles** Primary engineer.

**What this does and does not mean.** Coverage is the first and last
retained request timestamps plus every recorded capture gap. It is
**not** uptime and says nothing about any period with no retained
rows. `UNAVAILABLE` means telemetry was not capturing for the window,
so request counts and latency figures in it must not be used to
conclude that traffic was low or fast.

**Actions**

1. Read the recorded gaps and their reasons:
   ```bash
   curl -s "$API/api/v1/monitoring/telemetry-coverage" \
     -H "Authorization: Bearer $INTERNAL_TOKEN" | jq '{
       state, firstObservedAt, lastObservedAt, droppedRequests,
       captureEvents: [.captureEvents[] | {state, reason, droppedRequests, recordedAt}]
     }'
   ```
2. `DATABASE_AUTH_FAILURE` — the API could not authenticate to Postgres.
   Treat as RB-04 territory and check `DATABASE_URL` credentials on every
   replica. Requests logged during the gap are gone; do not backfill them
   from any other source.
3. `MISSING_MONITORING_TABLES` — migrations are behind. Run
   `pnpm --filter @workspace/db run db:migrate:safe`.
4. `BUFFER_OVERFLOW` — a sustained database outage filled the in-process
   buffer (ceiling 10,000 rows). The API shed telemetry instead of memory.
   Fix the database first; the dropped count in the event is the true
   volume lost.
5. Gaps deferred in memory (`recordDisabled` failing on every attempt)
   are flushed on the next successful telemetry write, so a gap that
   appears with no `recordedAt` near the outage is expected, not missing.

**Verification**

- `state` returns to `COMPLETE` once a successful flush occurs.
- `droppedRequests` is non-zero for the window that contained the gap —
  it is never reset to hide the loss.

**Postmortem** Capture whether the gap was detected by a human or by
this endpoint. Detection by a human means the coverage signal did not
reach anyone.

---

## RB-10: Dependency / drift verification (quarterly)

This is a planned exercise, not an incident. It exists to catch
drift before it becomes an outage.

**Frequency** Once per quarter, on-call rotation.

**Actions**

1. Verify a fresh restore of the latest production backup boots an
   isolated stack (DB + API + worker) and passes the smoke suite.
2. Run RB-04 in the staging environment end-to-end with a stopwatch.
3. Trigger a synthetic PHI-leak test (RB-07) and confirm the redactor
   catches it.
4. Verify the DLQ replay path against a synthetic dead letter (RB-03).
5. File a tracking issue with the timing for each step and any
   regressions discovered.

---

## RB-11: Worker canary rollout (automated)

**Purpose** Every production worker deploy (`.github/workflows/deploy.yml`
`deploy-worker` job) now goes through a canary gate before promotion, per
P5.16. The worker has no HTTP health endpoint, so the canary is verified at
machine level: deployed as a single canary machine, must reach `started` and
stay started for a 90 s settle window, then is promoted with a rolling deploy.

**Automation**

```bash
# Runs in CI; locally needs FLY_API_TOKEN + flyctl + jq.
bash scripts/deploy/worker-canary-deploy.sh apps/worker/fly.toml docita-worker 90
```

Flow:

1. `flyctl deploy --canary` — one machine with the new image.
2. Identify the canary (newest machine by `created_at`) and poll its state
   until `started`, then hold `started` for the settle window.
3. Abort (exit 1, no promote) if the canary leaves `started`, is `stopped`/
   `destroyed`, or never stabilises — the deploy job fails and the previous
   image keeps serving the queue.
4. `flyctl deploy --strategy rolling --ha=false` — promote the image to the
   remaining machines.

**When to use manually** Abort a stuck rollout with `fly machines stop
<canary-id> --app docita-worker`; the promote step never runs on failure, so
this is a cleanup, not a rollback. Roll back a promoted-but-bad image as in
RB-01 using `pnpm rollback:fly --config apps/worker/fly.toml --image "$RECORDED_WORKER_IMAGE"`
after verifying the selected image against the current schema and config.

**Verification after promote**

- `worker_jobs_total{status="completed"}` continues climbing.
- Scheduler heartbeat (cron) still fires — a scheduler regression only
  surfaces post-promote, so watch it in the first 30 minutes after deploy.
- `fly status --app docita-worker` shows all machines `started`.

---

## RB-12: Deploy blocked — GitHub runner cannot reach production RDS

**Trigger** `.github/workflows/deploy.yml` `migrate-db` ("Apply Prisma
Migrations") fails with `pg_dump: connection ... timed out`, or the
fast-fail pre-check errors with "Production RDS unreachable". API and
worker deploys are skipped for the run.

**Severity** SEV-2 — production deploys are blocked; the running apps keep
serving, but no API/worker release can land until this is resolved.

**Root cause** The migration job runs on GitHub-hosted runners, which have
no network path to the production RDS endpoint (public DNS
`***.rds.amazonaws.com`, port 5432 — egress times out). This is an
infrastructure/network restriction, not a code defect: no workflow
restructuring can make the job succeed from runner egress.

**Actions**

1. Confirm the exact error:
   `gh run view <run-id> --log-failed` and look for
   `pg_dump: ... Connection timed out` or the "Production RDS unreachable"
   pre-check error.
2. Fix the network path (operator action in the AWS console — pick one):
   - Add GitHub Actions runner egress to the RDS security group. GitHub
     publishes the current runner IP ranges at <https://api.github.com/meta>
     (`actions` key); add them to the RDS security group inbound rule for
     port 5432. Ranges rotate over time, so prefer (b) or (c) as the
     durable fix.
   - Run migrations from a network that already reaches RDS today (the
     production Fly app connects to RDS on every request) — e.g. a one-off
     Fly machine carrying the migration tooling, or a bastion inside the
     same VPC.
   - Move the `migrate-db` job to a self-hosted runner inside the VPC.
3. Restore the pre-migration snapshot path: confirm the production
   environment has `RDS_INSTANCE_ID`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` secrets set, and that the
   `SKIP_RDS_SNAPSHOT` repository/environment variable is not `true`. The
   snapshot step was skipping in the failing runs, so no labeled
   pre-deploy snapshot existed as a rollback target.
4. Re-run the failed workflow (or push a new commit to `main`) and watch
   `migrate-db` → `api-startup-smoke` → `deploy-api` / `deploy-worker`.

**Verification** `migrate-db` logs "Production database reachable", the
pre-migration snapshot step creates a labeled `pre-deploy-<sha>` snapshot,
and `deploy-api` / `deploy-worker` complete green.

**Postmortem** Capture the network change that caused the regression, the
snapshot-skip configuration, and the deploy gap. Incident history: first
failure 2026-08-09; last successful deploy 2026-07-29.

---

## RB-13: Deploy blocked — Cloudflare credentials invalid (`CLOUDFLARE_API_TOKEN`)

**Trigger** `.github/workflows/deploy.yml` gate job "Check Cloudflare deploy
credentials" prints `reason=invalid-credentials` (or the warning annotation
"Cloudflare deploys disabled"), and `deploy-app` / `deploy-internal` /
`deploy-landing` are skipped with "Skipped — gate disabled". The live sites
keep serving (the Cloudflare Git integration deploys independently), but the
GitHub Actions `--env production` deploy path is off.

**Severity** SEV-3 — no customer-visible impact while the Git integration
handles frontend deploys; only the production-flag deploy path is degraded.
Escalate to SEV-2 if frontend releases must land through GitHub Actions (e.g.
the Git integration is disabled or an emergency revert needs the production
env).

**Root cause** The gate runs
`scripts/deploy/verify-cloudflare-deploy-credentials.mjs` and fails it. The
verifier performs four checks against the Cloudflare API
(`https://api.cloudflare.com/client/v4`):

1. `GET /user/tokens/verify` — the token must exist and be active.
2. `GET /accounts/{CLOUDFLARE_ACCOUNT_ID}` — the token must be scoped to the
   account id in `CLOUDFLARE_ACCOUNT_ID`.
3. `GET /zones?name=docita.work&status=active` — the token must be able to
   list the `docita.work` zone.
4. `GET /zones/{zoneId}/workers/routes` — the token must be able to read
   Workers routes on that zone (required for `custom_domain` routes in
   `wrangler.toml`).

Observed failure signature: `CLOUDFLARE_API_TOKEN verification failed (HTTP
401, code 1000)` — Cloudflare's `code 1000` is "unknown error" surfaced here
when the token is revoked/expired/invalid, so `/user/tokens/verify` itself
fails on step 1. Any of the four checks failing produces `enabled=false` and
skips the three frontend deploy jobs for the run.

**Actions**

1. Confirm the failure signature:
   ```bash
   gh run view <run-id> --repo CVamsi27/docita --log-failed | grep -iE "cloudflare|401|1000"
   gh run view <run-id> --repo CVamsi27/docita --job <gate-job-id> --log | grep reason=
   # expect: reason=invalid-credentials (token/account check failed)
   # or:     reason=missing-secrets (one of the two secrets is unset)
   ```
2. If `reason=missing-secrets`, set both secrets and stop here:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --repo CVamsi27/docita
   gh secret set CLOUDFLARE_ACCOUNT_ID --repo CVamsi27/docita
   ```
3. If `reason=invalid-credentials`, create a new token in the Cloudflare
   dashboard (dash.cloudflare.com → My Profile → API Tokens → Create Token):
   - Use the **Edit Cloudflare Workers** template, which grants
     `Account:Workers Scripts:Edit`, `Account:Workers KV Storage:Edit`, and
     `Zone:Workers Routes:Edit` — the permissions the verifier's four checks
     require (account access, zone list, Workers routes).
   - Scope it to the **Workers account** matching `CLOUDFLARE_ACCOUNT_ID`
     (the failing runs used account `36b68ff6beddbabaad448ba50cdbdab0`)
     and, for the zone permission, to `docita.work`. Do not use a
     Global API Key; a scoped API token is required.
   - If a template does not cover the exact scope, create a custom token with
     at least: `Account > Workers Scripts > Edit`, `Zone > Workers Routes >
Edit`, and `Zone > Zone > Read` (or account-level access to
     `docita.work`).
4. Verify the token locally before setting the secret:
   ```bash
   CLOUDFLARE_API_TOKEN="<new-token>" \
   CLOUDFLARE_ACCOUNT_ID="<account-id>" \
   node scripts/deploy/verify-cloudflare-deploy-credentials.mjs
   # expect: "Cloudflare deploy credentials verified (token, account, zone Workers routes)."
   ```
5. Update the repository secret:
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --repo CVamsi27/docita
   ```
   (rotate via the dashboard only if the old token may have leaked; the
   verifier rejects expired/revoked tokens on the next run.)
6. Re-run the failed workflow (or push a new commit to `main`) and watch the
   gate: `gh run view <run-id>` — the gate must print
   `reason=ready`, then `deploy-app` / `deploy-internal` / `deploy-landing`
   run with `--env production` instead of skipping.

**Verification**

- The gate job logs `reason=ready` and the annotation is absent.
- `deploy-app`, `deploy-internal`, `deploy-landing` complete green and the
  deployment shows the `--env production` bindings (`NODE_ENV=production`,
  `VITE_APP_URL=https://app.docita.work`, etc.).
- Smoke both sites after the deploy: deep links return 200 and the security
  headers from `apps/*/public/_headers` are served (see `pnpm
check:app-security-headers`).

**Postmortem** Capture which check failed (token verify / account / zone /
routes), the Cloudflare error code (1000 for revoked/expired), when the token
last rotated, and whether any deploy gap existed between the Git integration
and the `--env production` path. Incident history: token invalid (HTTP 401,
code 1000) as of 2026-08-12; the gate previously produced no visible reason,
so deploy jobs appeared skipped without a diagnosable cause.

---

## RB-14: Disabled scheduled workflows (Scale API / Synthetic monitoring)

**Status** Informational record — no incident is active. Both scheduled
workflows are disabled and no repo-side change can re-enable them; a human
must act in the GitHub Actions UI.

**Facts (verified 2026-08-13 via the GitHub API, not inferred)**

- `.github/workflows/scale-api-hours.yml` (Scale API - IST Business Hours,
  id `289989847`) reports `state=disabled_manually`.
- `.github/workflows/synthetic-monitoring.yml` (Synthetic uptime monitoring,
  id `285712721`) reports `state=disabled_manually`.
- Both last ran 2026-07-26 (schedule events); neither appears in `gh
workflow list` (which shows active workflows only) and neither has fired
  since. Their files are unchanged since June and remain tracked on `main`.
- No disabling commit, comment, or doc note exists anywhere in the repo.

**Likely reason (inference — no recorded intent)** The 2026-07-26 run logs
show a failure cascade: the 03:00 UTC scale-up failed with
`failed to launch VM: no capacity available in bom` (Fly region capacity);
the API was therefore down during the business-hours window; every synthetic
probe run that day failed on the down API (`api-health-live` timeouts,
`daily-thought` HTTP 525, auto-recovery restart finding no machines). The
most plausible reading is that someone disabled both workflows that day to
stop the monitor paging on the broken scale-up — but this is inference, not
documented intent.

**Consequences while disabled**

- No API autoscaling: the API sits at whatever machine count the last run
  (2026-07-26 15:56Z) left, so the intended off-hours scale-to-0 is not
  happening (quiet cost, no outage; `GET https://api.docita.work/api/v1/health`
  returned 200 on 2026-08-13).
- No synthetic uptime alerting: an API outage today would page nobody, and
  RB-01's "synthetic checks green" verification gate is blind.

**Re-enable preconditions (both must be met before `gh workflow enable`)**

1. Fly capacity verified: confirm a `docita-api` machine can launch in the
   `bom` region today (e.g. `flyctl scale count 1 --app docita-api` with
   `FLY_API_TOKEN`, then back down). The `bom` no-capacity error is the
   recorded failure class; re-enabling without this check risks repeating it.
2. Alert-noise policy decided: confirm probes should page when a scale-up
   fails (the monitor's 3:15 UTC offset mitigates the 3:00 UTC scale-up race
   but not a capacity failure), or gate probe alerting to the
   business-hours window only.

**To re-enable**

````bash
gh workflow enable 289989847 --repo CVamsi27/docita   # Scale API - IST Business Hours
gh workflow enable 285712721 --repo CVamsi27/docita   # Synthetic uptime monitoring
gh workflow list --repo CVamsi27/docita               # confirm both active
gh run list --repo CVamsi27/docita --workflow <id> --limit 5   # watch the next schedule trigger
```If the next trigger fails with the `bom` capacity error again, disable both
again and escalate to the Fly provider for region capacity.

---

## RB-15: Disabled scheduled workflow (Stop DB - Auto-Restart Guard)

**Status** Informational record — no incident is active. The workflow is
disabled and no repo-side change can re-enable it; a human must act in the
GitHub Actions UI (and the target RDS instance must exist again).

**Facts (verified 2026-10-01 via the GitHub API, not inferred)**

- `.github/workflows/stop-db-auto-restart.yml` (Stop DB - Auto-Restart
  Guard, id `328383419`) reports `state=disabled_manually`.
- It last ran 2026-09-02T04:21:49Z (schedule event); every recent run failed
  within ~13 seconds with `DBInstanceNotFound` — the configured
  `RDS_INSTANCE_ID` secret no longer matches an existing RDS instance.
- The workflow's purpose is cost control: RDS auto-restarts 7 days after a
  manual stop, and this job stopped it again. With the instance gone (or
  replaced by different infrastructure) the job can only fail.

**Consequences while disabled**

- No automated guard against a 7-day RDS auto-restart. If an RDS instance is
  provisioned again under a different identifier, either update the
  `RDS_INSTANCE_ID` secret and re-enable the workflow, or delete the
  workflow file and retire RB-15 with it.

**To re-enable**

```bash
# 1. Provision/confirm the RDS instance and update the RDS_INSTANCE_ID secret.
# 2. Re-enable:
gh workflow enable 328383419 --repo CVamsi27/docita
gh run list --repo CVamsi27/docita --workflow 328383419 --limit 3
````

If the instance is permanently retired, remove
`.github/workflows/stop-db-auto-restart.yml` and this entry instead of
keeping a dead guard around.

---

## Appendix: contact + escalation matrix

| Role            | Channel                    | SLA              |
| --------------- | -------------------------- | ---------------- |
| Primary on-call | PagerDuty rotation A       | 5 min ack        |
| Secondary       | PagerDuty rotation B       | 15 min ack       |
| Eng leadership  | #incident-leadership Slack | 30 min for SEV-1 |
| Privacy officer | privacy@docita.health      | 1 hour for PHI   |
| Cloud provider  | Fly support, Cloudflare    | 30 min ack       |

> Status page updates are required within 5 minutes of declaring SEV-1
> or SEV-2.

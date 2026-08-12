# Disaster Recovery & Operational Runbooks

This document is the on-call playbook. Every runbook lists:

1. **Trigger** — what symptom or alert fires it.
2. **Severity** — how loud to be.
3. **Roles** — who runs it (Primary, Secondary, Comms).
4. **Actions** — numbered, copy-pasteable steps.
5. **Verification** — how we know we're back.
6. **Postmortem** — what to capture for the report.

The procedures cover the production stack:

- API: Fly.io (`docita-api`) — see [`fly.toml`](../fly.toml).
- Worker: Fly.io (`docita-worker`) — see [`apps/worker/fly.toml`](../apps/worker/fly.toml).
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

1. Confirm the offending release in Fly:
   ```bash
   fly releases --app docita-api | head -10
   ```
2. Roll back to the previous successful release:
   ```bash
   fly releases rollback <previous-version> --app docita-api
   ```
3. Watch the deploy:
   ```bash
   fly status --app docita-api
   fly logs --app docita-api | head -200
   ```
4. If the rollback itself fails, force redeploy from the last known-good
   commit on `main`:
   ```bash
   git checkout <last-good-sha>
   fly deploy --config fly.toml --app docita-api
   ```
5. Post a status-page incident: "API degraded — investigating."

**Verification**

- `curl https://api.docita.work/api/v1/health` returns `200`.
- Sentry error rate returns to baseline within 10 minutes.
- Synthetic monitor (`/api/v1/health` + `/api/v1/auth/me` smoke) green
  for 3 consecutive runs.

**Postmortem** Capture deploy SHA, rollback SHA, customer-impact window,
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
5. If the worker image itself is bad, roll back as in RB-01 against
   `--app docita-worker --config apps/worker/fly.toml`.

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
RB-01 against `--app docita-worker --config apps/worker/fly.toml`.

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

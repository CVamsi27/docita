# Disaster Recovery Runbook

> **Status**: initial. Last drill: never (as of 2026-10-03). Schedule first
> drill within 30 days of this file landing. SYSTEM_DESIGN_AND_PATTERNS.md
> §28.1 item 7.
>
> The RTO/RPO values in the table below are **unverified targets**, not measured
> capabilities — no drill has been run and `docs/operations/dr-drills/` does not
> exist. Do not quote them as guarantees until a drill record exists. See
> [ADR 0016](../architecture/decisions/0016-patient-data-lifecycle-and-recovery.md)
> (backlog C01).

## Current provider verification, 13 October 2026

The API's actual `DATABASE_URL` host identifies **Neon PostgreSQL in Singapore**,
not the historical RDS instance described below. This was read as hostname/database
metadata through Fly SSH; no credentials or patient rows were exported. The local
AWS credential verifies with STS, but the old named RDS instance is absent and
broader RDS inventory access is denied. Those AWS checks do not establish Neon
backup or restore capability.

Neon project/branch identity, restore window, retention and a side-database restore
must be verified by its operator before migration or runtime-role cutover. Keep
R2/key custody and tenant isolation in the drill. The RDS restore commands below
are historical provider-specific procedures and cannot recover the current Neon
primary. No production restore or migration was performed by this audit; the
[repair evidence](../audits/2026-10-13-stability-repair-evidence.md) remains blocked
on an exercised recovery target.

## Historical scope and provider procedures

This runbook covers recovery from data-tier or region-level loss of:

- **Postgres** (single primary in AWS RDS `ap-south-1`; PITR up
  to 7 days; nightly snapshots retained 30 days).
- **Cloudflare R2** (multi-region; documents and PHI attachments).
- **Fly.io** (API and worker; multiple machines per region).

It does **not** cover routine deploy rollbacks (see
[`DEPLOYMENT.md`](DEPLOYMENT.md)) or transient external-vendor outages
(see playbooks under [`playbooks/`](playbooks/)).

## Targets

| Resource              | Recovery Time Objective (RTO)    | Recovery Point Objective (RPO)       |
| --------------------- | -------------------------------- | ------------------------------------ |
| Postgres primary loss | 60 minutes                       | 5 minutes (PITR)                     |
| Region-level loss     | 4 hours                          | 24 hours (daily snapshot)            |
| R2 region             | 30 minutes (Cloudflare fan-over) | 0 minutes (multi-region replication) |
| Fly.io machine        | 5 minutes (autoscaler)           | 0 minutes                            |
| Fly.io region         | 60 minutes (failover machines)   | 0 minutes (stateless API)            |

The single largest exposure today is the Postgres primary — both because
it is single-region (ADR
[0006](../architecture/decisions/0006-single-region-postgres.md)) and
because we have not exercised the restore path.

## Quarterly drill

Each quarter, on the second Friday of the quarter, run one drill from
the table below. Rotate through the four scenarios so each is exercised
once a year.

| Quarter | Scenario                                                           |
| ------- | ------------------------------------------------------------------ |
| Q1      | Postgres point-in-time restore to a side database                  |
| Q2      | Snapshot restore + replay confirmation                             |
| Q3      | Region failover simulation (Fly.io machine drain)                  |
| Q4      | Full DR exercise: assume primary region down, restore in DR region |

Document the drill outcome in `docs/operations/dr-drills/YYYY-QN.md`.

## Detection

- Postgres outage: Fly.io healthchecks fail; PagerDuty alerts; Sentry
  spikes in `PrismaClientInitializationError`.
- R2 outage: Cloudflare status page; image/PDF 5xx in app telemetry.
- Region-level loss: Cloudflare DNS health + multi-source verification.

## Postgres point-in-time restore (RPO ≤ 5 min)

1. **Page**: confirm the incident commander has acknowledged.
2. **Snapshot the current state** so the failed primary can be inspected
   later: `aws rds create-db-snapshot --db-instance-identifier <prod-rds> --db-snapshot-identifier <incident-snapshot>` (skip if the primary is unreachable).
3. **Provision a restore target**:
   ```
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier <prod-rds> \
     --target-db-instance-identifier <restore-rds> \
     --restore-time <ISO timestamp>
   ```
4. **Verify**: connect with `psql`, run `SELECT count(*) FROM clinic;` and
   compare to last-known-good metrics.
5. **Cutover**: update `DATABASE_URL` secret in Fly + Cloudflare worker
   bindings, deploy a fresh API revision; the application will reconnect.
6. **Validate**: smoke-test the staff login, patient list, and a sample
   appointment booking.
7. **Communicate**: post a status update; record RTO/RPO actual in the
   incident report.

## Snapshot restore (RPO ≤ 24 h)

Used when PITR is unavailable (e.g., the restore target only retains
daily snapshots).

1. **Pick the most recent snapshot before the incident** from the RDS
   console or `aws rds describe-db-snapshots --db-instance-identifier <prod-rds>`.
2. Provision a new Postgres from that snapshot.
3. Apply pending migrations: `pnpm --filter @workspace/db run db:migrate:safe`.
4. Compare row counts on critical tables (`User`, `Clinic`, `Patient`,
   `Appointment`, `AuditEvent`) to confirm integrity.
5. Cutover as above.

## Region failover (region down)

1. **Confirm** the region is unreachable (not just one machine).
2. Bring up the DR region's Fly machines: `fly scale count <n> --region <dr-region>`.
3. Restore the latest snapshot into a DR-region Postgres.
4. Update DNS + Cloudflare worker bindings to point at the DR region.
5. Run the smoke suite in `scripts/deploy/startup-smoke.mjs`.

## Validation checklist (post-restore)

- [ ] Staff login succeeds.
- [ ] Patient list loads and shows expected row counts.
- [ ] A test appointment can be created and cancelled.
- [ ] PDF generation queue is draining.
- [ ] WhatsApp + email background queues are processing.
- [ ] Audit log shows the restore as an admin action.
- [ ] PHI encryption: pick a recent patient row, confirm decrypted
      fields render correctly in the app.

## Communication template

```
SUBJECT: [DR] Docita data-tier incident — <status>

Incident: <one-line>
Started: <ISO timestamp>
Scope: <which app(s), which region(s)>
Restore target: <RTO/RPO target>
ETA: <next update in N minutes>
Workarounds: <client-facing guidance, if any>
Commander: <name>
```

## Open items

- Automate snapshot restore validation (compare row-counts + checksum
  on critical tables).
- Cross-region Postgres standby (ADR follow-up to 0006).
- Sync DEK envelope keys to DR-region key store; rotation procedure
  (see ADR [0007](../architecture/decisions/0007-kek-rotation-cadence.md)).

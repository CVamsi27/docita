# Neon Production Checklist (Phase 1)

## Goal

Prepare Neon as production database for Railway-hosted API, with safe migration path to RDS later.

## 1) Provisioning

- [ ] Neon project created for production.
- [ ] Region selected close to Railway runtime region.
- [ ] Primary branch designated (`main`/`production`).
- [ ] Connection string copied with SSL mode enabled.

## 2) Security

- [ ] Dedicated production DB user created (no shared dev credentials).
- [ ] Strong password policy applied and stored in secret manager.
- [ ] Network access restrictions reviewed (where applicable).
- [ ] DB credentials rotated and documented owner set.

## 3) Reliability

- [ ] Automatic backups/PITR confirmed.
- [ ] Restore test performed once in non-prod.
- [ ] Alerting configured for storage/compute thresholds.
- [ ] Connection limits reviewed against expected API concurrency.

## 4) Runtime Integration

- [ ] Railway `DATABASE_URL` set from Neon production branch.
- [ ] Optional `DATABASE_READ_URL` configured if replica used.
- [ ] `railway run pnpm db:migrate:deploy` completed successfully.
- [ ] API health checks pass (`/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health/db`).

## 5) Data Safety

- [ ] Migration SQL reviewed before production apply.
- [ ] Destructive migrations gated and approved.
- [ ] PII/PHI handling validated against security guide.
- [ ] Recovery procedure documented with RTO/RPO targets.

## 6) Operational Readiness

- [ ] On-call knows restore process and escalation path.
- [ ] Dashboard links shared with team.
- [ ] Weekly check scheduled for query performance and growth.
- [ ] Migration plan to RDS documented (see Phase 2 cutover runbook).

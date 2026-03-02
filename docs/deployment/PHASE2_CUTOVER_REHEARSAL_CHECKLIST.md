# Phase 2 Cutover Rehearsal Checklist (Railway/Neon -> AWS/RDS)

## Goal

Dry-run the migration path before production cutover:

- API: Railway -> AWS (ECR/EC2 path)
- DB: Neon -> RDS PostgreSQL
- Frontend remains on Vercel

Use with:

- `PHASE2_AWS_CUTOVER_RUNBOOK.md`

## 1) Rehearsal Metadata

- [ ] Rehearsal date/time scheduled
- [ ] Owner and backup owner assigned
- [ ] Change ticket/reference linked
- [ ] Success criteria defined

## 2) Environment Readiness

- [ ] AWS account/project access verified
- [ ] ECR repo exists and write access verified
- [ ] EC2 host reachable and runtime dependencies present
- [ ] RDS instance reachable from EC2 security groups
- [ ] GitHub Actions secrets for AWS validated

## 3) Data Rehearsal (Neon -> RDS)

- [ ] Neon source snapshot timestamp captured
- [ ] Logical dump command tested
- [ ] Restore command tested to rehearsal RDS
- [ ] Critical table row counts compared
- [ ] App migrations run against rehearsal RDS (`pnpm db:migrate:deploy`)

## 4) API Rehearsal (Railway -> AWS)

- [ ] ECR image build and push completed
- [ ] EC2 container starts with rehearsal env file
- [ ] Health checks pass on EC2 endpoint (`/api/v1/health/live`, `/ready`, `/db`)
- [ ] Rehearsal DNS switch simulated (low TTL path tested)

## 5) Functional Rehearsal

- [ ] App login succeeds through rehearsal API endpoint
- [ ] Patient list/create path works
- [ ] Appointment create/update path works
- [ ] Billing/invoice path works
- [ ] No unexpected 5xx spikes in logs

## 6) Timing Capture (for production window sizing)

- [ ] Backup duration recorded
- [ ] Restore duration recorded
- [ ] Migration duration recorded
- [ ] API boot + health stabilization time recorded
- [ ] End-to-end validation duration recorded

## 7) Rollback Rehearsal

- [ ] DNS re-point back to Railway tested
- [ ] Railway API still healthy after fallback
- [ ] Neon write path restore tested (if freeze model used)
- [ ] Rollback comms template drafted

## 8) Go/No-Go Output

- [ ] Open risks documented
- [ ] Blocking issues assigned with owners/dates
- [ ] Production cutover checklist updated from rehearsal findings
- [ ] Final recommendation recorded: Go / No-Go

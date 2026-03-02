# Phase 2 Cutover Runbook: Railway → AWS ECR/EC2 and Neon → RDS

## Scope

This runbook covers controlled migration from:

- API runtime: Railway → AWS (ECR image + EC2 runtime)
- Database: Neon PostgreSQL → AWS RDS PostgreSQL

Frontend remains on Vercel.

## 1) Preconditions

- AWS account, VPC, security groups, EC2 host, ECR repo ready.
- RDS PostgreSQL provisioned and reachable from API runtime.
- Existing GitHub Actions AWS secrets configured.
- Maintenance window approved and communicated.

## 2) Freeze & Backup

1. Announce maintenance window.
2. Enable read-only mode or short write freeze (recommended).
3. Take final Neon logical backup:

```bash
pg_dump "$DATABASE_URL" -Fc -f docita-pre-cutover.dump
```

4. Confirm backup integrity:

```bash
pg_restore -l docita-pre-cutover.dump | head
```

## 3) Data Migration (Neon → RDS)

1. Restore to RDS target:

```bash
pg_restore --no-owner --no-privileges -d "$RDS_DATABASE_URL" docita-pre-cutover.dump
```

2. Run schema validation and counts (critical tables).
3. Run app migration status against RDS:

```bash
DATABASE_URL="$RDS_DATABASE_URL" pnpm db:migrate:deploy
```

## 4) API Migration (Railway → AWS)

1. Build and push image to ECR via workflow or manual pipeline.
2. Prepare EC2 env file with RDS `DATABASE_URL` and required secrets.
3. Start new container and verify health:

```bash
curl -sS http://localhost:3001/api/v1/health/live
curl -sS http://localhost:3001/api/v1/health/ready
curl -sS http://localhost:3001/api/v1/health/db
```

4. Switch `api.<domain>` DNS to AWS endpoint.

## 5) Post-Cutover Validation

- [ ] Auth/login works from app and admin.
- [ ] Create/update patient works.
- [ ] Appointment booking works.
- [ ] Billing + payment session paths work.
- [ ] No elevated 5xx or DB connection errors.

## 6) Rollback Plan

If cutover fails:

1. Re-point DNS back to Railway API.
2. Restore Railway `DATABASE_URL` to Neon.
3. Resume writes on Neon (if frozen).
4. Keep AWS artifacts for forensic analysis and retry.

## 7) Redis Introduction (Optional)

After stable cutover:

- Introduce ElastiCache Redis.
- Set `REDIS_URL` and enable redis-backed cache/queue providers.
- Validate queue, cache, and fallback behaviors before full enablement.

# Phase 2 Data Backfill Scripts

This directory contains Node.js scripts to backfill historical data for Phase 2 database tables.

## Scripts

1. **backfill-audit-logs.js** - Generates 50 audit log entries per clinic for the past 30 days
2. **backfill-analytics-snapshots.js** - Creates daily analytics snapshots for the past 90 days per clinic
3. **backfill-payment-retries.js** - Creates retry schedules for unpaid invoices
4. **backfill-bulk-import-jobs.js** - Generates 20 import job records per clinic for the past 60 days
5. **backfill-system-metrics.js** - Creates hourly system performance metrics for the past 30 days (10 metric types)

## Prerequisites

- Node.js 18+
- PostgreSQL database with migrations applied
- `.env` file with `DATABASE_URL` set correctly

## Running Scripts

### Development Environment

```bash
# Navigate to the docita root
cd /path/to/docita

# Run a specific backfill script
node apps/api/scripts/backfill/backfill-audit-logs.js
node apps/api/scripts/backfill/backfill-analytics-snapshots.js
node apps/api/scripts/backfill/backfill-payment-retries.js
node apps/api/scripts/backfill/backfill-bulk-import-jobs.js
node apps/api/scripts/backfill/backfill-system-metrics.js
```

### Run All Backfills Sequentially

```bash
node apps/api/scripts/backfill/backfill-audit-logs.js && \
node apps/api/scripts/backfill/backfill-analytics-snapshots.js && \
node apps/api/scripts/backfill/backfill-payment-retries.js && \
node apps/api/scripts/backfill/backfill-bulk-import-jobs.js && \
node apps/api/scripts/backfill/backfill-system-metrics.js
```

## Data Generated

### Audit Logs (50 per clinic, 30 days)

- Actions: CREATE, UPDATE, DELETE, VIEW, EXPORT, IMPORT, ARCHIVE
- Entity Types: PATIENT, INVOICE, PRESCRIPTION, CONSULTATION, LAB_TEST
- Includes metadata (IP address, user agent, request duration)

### Analytics Snapshots (90 daily snapshots per clinic)

- Daily metrics: revenue, invoices, appointments, patient stats
- Includes appointment fill rates and top conditions
- Supports trend analysis

### Payment Retries (3 attempts per unpaid invoice, up to 100 invoices)

- Retry counts: 0, 1, 2
- Status: PENDING, SCHEDULED
- Gateway: RAZORPAY
- Includes failure reasons for past attempts

### Bulk Import Jobs (20 per clinic, 60 days)

- Types: PATIENTS, INVOICES, PRESCRIPTIONS, APPOINTMENTS
- Status: SUCCESS, PARTIAL_SUCCESS
- Tracks success/failure/skip counts
- Records processing duration

### System Metrics (10 types, hourly for 30 days)

- Metric Types: CPU_USAGE, MEMORY_USAGE, HEAP_USED, HEAP_TOTAL, ACTIVE_CONNECTIONS, DB_QUERY_TIME, UPTIME, REQUEST_COUNT, ERROR_RATE, AVG_RESPONSE_TIME
- 720 hours × 10 metrics = 7,200 baseline records
- Realistic value ranges per metric type

## Expected Output

```
Starting [operation] backfill...
Clinic abc123: Inserted 50 [records]
Clinic def456: Inserted 50 [records]
Backfill Complete: 100 total [records]
```

## Troubleshooting

### Database Connection Error

- Verify `DATABASE_URL` is correctly set in `.env`
- Ensure PostgreSQL is running
- Check that migrations have been applied: `pnpm db:migrate:deploy`

### No Clinics Found

- Add at least one clinic to the database before running payment retry backfill
- Audit logs backfill requires clinics with associated users

### Duplicate Key Errors

- Scripts use `skipDuplicates: true` to handle idempotency
- Safe to run multiple times without data duplication

## Deployment Workflow

### Staging Environment

```bash
# 1. Run migrations
cd packages/db
pnpm prisma migrate deploy

# 2. Run backfills
node ../../apps/api/scripts/backfill/backfill-audit-logs.js
node ../../apps/api/scripts/backfill/backfill-analytics-snapshots.js
node ../../apps/api/scripts/backfill/backfill-payment-retries.js
node ../../apps/api/scripts/backfill/backfill-bulk-import-jobs.js
node ../../apps/api/scripts/backfill/backfill-system-metrics.js

# 3. Validate with queries
pnpm prisma studio
```

### Production Deployment

```bash
# 1. Create backup before running migrations
pg_dump $DATABASE_URL > backup-$(date +%s).sql

# 2. Run migrations (during maintenance window)
cd packages/db
pnpm prisma migrate deploy

# 3. Run backfills incrementally
# Space out backfill operations to avoid database load

# 4. Monitor database performance
# Check slow query logs, connection count, disk usage
```

## Data Retention

- Audit logs: 30-day window (production: 90 days)
- Analytics snapshots: 90-day window (production: 1 year)
- Payment retries: Until resolved or 90 days
- Bulk import jobs: 60-day window (production: 1 year)
- System metrics: 30-day window (production: 90 days)

Adjust retention policies in production as needed.

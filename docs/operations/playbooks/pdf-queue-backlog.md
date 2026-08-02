# Playbook: PDF queue backlog

## Detection signals

- `Job` table count where `kind='pdf'` AND `status='queued'` > 500.
- `Job` p95 wait time > 5 minutes for PDF jobs.
- User reports: "prescription PDF still pending" or "invoice not
  generating."

## First 5 minutes

1. Check the queue depth:
   ```sql
   SELECT status, count(*) FROM "Job" WHERE kind = 'pdf' GROUP BY status;
   ```
2. Check worker capacity: `fly machines list -a <worker-app>`.
3. Look for failure clusters:
   ```sql
   SELECT "lastError", count(*) FROM "Job"
   WHERE kind = 'pdf' AND status = 'failed'
   AND "lastErrorAt" > now() - interval '15 minutes'
   GROUP BY "lastError" ORDER BY 2 DESC;
   ```

## Mitigation

- **If workers are healthy but slow**: scale up worker machines.
  ```
  fly scale count <n+1> -a <worker-app>
  ```
- **If workers are crashing**: capture logs, restart machines, check
  R2 connectivity (R2 upload is the most common PDF failure point).
- **If a single template is failing**: disable it via feature flag
  (`apps/internal-vite` → Templates → Disable) and retry once fixed.
- **DLQ**: failed PDF jobs go to the DLQ. If Stream M auto-replay is
  enabled, transient errors retry automatically; otherwise replay
  manually via the DLQ controller endpoint.

## Validation

- Queue depth drops to <50 within 10 minutes.
- p95 wait time returns to <60 s.
- Sample patient sees their PDF rendered within 60 s of request.

## Rollback criteria

- If a worker scale-up made the database connection exhausted, revert
  to the previous count and switch to the DB exhaustion playbook.

## Post-incident

- Capture which PDF template/route triggered the backlog.
- File a follow-up to add a queue-depth alert at 200 (warn) / 500 (page).
- If the cause was a slow template render, add a render-time SLO
  per template.

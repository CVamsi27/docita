# Playbook: Postgres connection exhaustion

## Detection signals

- Sentry spike in `PrismaClientKnownRequestError` with code
  `P1001`/`P1008` or `PrismaClientInitializationError`.
- Fly.io API health checks flapping on `/api/v1/health`.
- API p95 latency > 5s with high `db_pool_wait_ms` log values.
- PgBouncer (if enabled) reports `client_idle_timeout` exhaustion.

## First 5 minutes

1. Confirm the API pool is exhausted (not a network blip):
   ```
   fly ssh console -a <api-app> -C 'pgrep -fa api | head'
   fly logs -a <api-app> | grep -E "(connection|pool)" | tail -50
   ```
2. Check Postgres connection count:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```
3. If `idle in transaction` is dominant, a long-running query is
   holding connections. If `active` is dominant, we are over-attached.

## Mitigation

- **Kill idle-in-transaction sessions older than 60 s**:
  ```sql
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle in transaction'
    AND xact_start < now() - interval '60 seconds';
  ```
- **Reduce inbound load**: scale down API machines temporarily, or
  enable the rate-limit emergency lever
  (`apps/api/src/shared/modules/rate-limit/`).
- **Bump pool size**: `connection_limit` in `DATABASE_URL`. Add no more
  than 25% headroom — Postgres has its own ceiling.
- **Restart the API**: `fly machine restart -a <api-app>` clears the
  pool. Use only after capturing diagnostics.

## Validation

- Connection count drops to baseline.
- API health endpoint returns 200.
- p95 latency returns to <500 ms within 5 minutes.

## Rollback criteria

- If a config change (pool size, connection_limit) made things worse,
  revert via `fly secrets unset` or by redeploying the previous revision.

## Post-incident

- Identify the long-running query or fan-out path that triggered
  exhaustion. Reproduce locally if possible.
- Add a request-budget warning (see SYSTEM_DESIGN_AND_PATTERNS.md §28.4
  item 33) if N+1 patterns were involved.
- File a follow-up ticket for any temporary pool size increase to be
  reverted once the root cause is fixed.

# Postgres Row-Level Security Rollout

## Status

- Migration: `20260502143500_add_rls_policies` (additive, gated)
- Application flag: `RLS_ENABLED` (defaults to `false`)
- Application surface: `RlsService.runScopedTransaction(clinicId, fn)`
- CI guard: `pnpm check:rls-rollout-readiness` (migration + service + env docs)

The migration is safe to deploy at any time because the `tenant_isolation`
policy is short-circuited until the `app.rls_enabled` Postgres setting is
set to `'on'`. No tenant query is restricted while `RLS_ENABLED=false`.

## Why this is staged

This is a structural change with cross-cutting impact. The point of the
two-step rollout is to land the migration and the application primitive in
production without changing query semantics, then flip enforcement on in a
controlled way.

## Step 1: deploy the migration (any environment)

```bash
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @workspace/db run db:migrate:safe
```

Dry-run output should report:

- `CREATE ROLE docita_app` (or skipped on idempotent reruns)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for every table with a
  `clinicId` column
- `CREATE POLICY tenant_isolation ON ...` for the same tables

Behavior is unchanged after this step. The owner role used by the
migration runner bypasses RLS automatically.

## Step 2: provision an application connection that runs as `docita_app`

The owner role bypasses RLS, so we must point the API at a non-owner role
before enforcement matters. Operators should:

1. Set a password for `docita_app` (or attach a pooled credential).
2. `GRANT docita_app TO postgres;` so the owner can revoke / rotate.
3. Add `DATABASE_URL` overrides for the API and worker that connect as
   `docita_app`. Until then, the API runs as the owner and policies do
   not bind.

## Step 3: dry-run enforcement in staging

```bash
RLS_ENABLED=true pnpm --filter @docita/api run start:dev
```

Run the staging E2E smoke pack and the relevant repository unit tests. Any
query that drops `clinicId` from a `where` clause will return zero rows
(reads) or fail with `permission denied`/`new row violates row-level
security` (writes). That is the intended failure surface.

When fixing fallout, prefer routing the query through
`RlsService.runScopedTransaction` rather than disabling enforcement.

## Step 4: flip the flag in production

After a clean staging dry-run plus 24h of soak with no policy errors:

1. Set `RLS_ENABLED=true` in the API and worker secrets.
2. Roll the API and worker.
3. Watch `pg_stat_activity` and Sentry for `permission denied for table` /
   `new row violates row-level security policy` errors.

## Rollback

Set `RLS_ENABLED=false` and roll the API. The policies remain in place
but become inert because `app.rls_enabled` is never set to `'on'` for
the connection.

## Owner / migration role behavior

`FORCE ROW LEVEL SECURITY` is intentionally not enabled. Migrations and
seed scripts therefore continue to run as the owner with full table
visibility. If we ever decide to enforce RLS for the owner too, that is a
separate migration plus a follow-up runbook update.

# Postgres Row-Level Security Rollout

## Status

- Migration: `20260502143500_add_rls_policies` (additive, gated)
- Application flag: `RLS_ENABLED` (defaults to `false` locally; **`true` in production** via [`fly.toml`](../../fly.toml) and [`apps/worker/fly.toml`](../../apps/worker/fly.toml))
- Application surface: `RlsService.runScopedTransaction(clinicId, fn)`
- CI guard: `pnpm check:rls-rollout-readiness` is part of `pnpm verify:standard`

### Why enforcement was staged (historical)

RLS was kept off initially so we could land policies and the Prisma tx routing
extension without changing query semantics in one shot. The migration is
additive: policies short-circuit until `app.rls_enabled = 'on'`. Production
now sets `RLS_ENABLED=true`; **operators must point `DATABASE_URL` at the
non-owner `docita_app` role** or Postgres owner connections bypass RLS entirely
(see Step 2 below).

- When `RLS_ENABLED=true`, `TenantContextInterceptor` wraps each authenticated
  clinic request in a Prisma interactive transaction (`tx`), sets
  `app.rls_enabled` / `app.current_clinic_id` on `tx`, and publishes `tx`
  into `activeTxStorage`. The `rls-routing` Prisma extension then forwards
  every model operation issued from the request through `tx`, so the
  `SET LOCAL` GUCs actually govern the queries. (Without the routing
  extension, the handler would borrow a *different* pool connection and
  the policy would short-circuit on a missing `app.current_clinic_id` —
  effectively a silent bypass.)

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
RLS_ENABLED=true pnpm --filter @docita/api run dev
```

Run the staging E2E smoke pack and the relevant repository unit tests. Any
query that drops `clinicId` from a `where` clause will return zero rows
(reads) or fail with `permission denied`/`new row violates row-level
security` (writes). That is the intended failure surface.

When fixing fallout, prefer routing the query through
`RlsService.runScopedTransaction` rather than disabling enforcement.

### Notes on developer-initiated `$transaction` calls

`runWithActiveTx` publishes the request-scoped tx into `activeTxStorage`
so that incidental `prisma.<model>.<op>(...)` calls in services and
repositories are routed through it by the `rls-routing` extension. If a
service explicitly opens its own `prisma.$transaction(async (innerTx) => ...)`
inside a tenant request, that `innerTx` will be a *new* connection
without the GUCs set, and any tenant-scoped query that runs through
`innerTx` will be blocked by the `tenant_isolation` policy. Convert such
sites to `RlsService.runScopedTransaction` (or pull the work outside the
inner tx) — the service applies the GUC handshake and republishes the
new tx into `activeTxStorage`.

## Step 4: flip the flag in production

After a clean staging dry-run plus 24h of soak with no policy errors:

1. Set `RLS_ENABLED=true` in the API and worker secrets.
2. Roll the API and worker.
3. Watch `pg_stat_activity` and Sentry for `permission denied for table` /
   `new row violates row-level security policy` errors.


## Verifying isolation on a live database

Source presence is not an execution result, so enforcement is proven by running
the two-clinic matrix against a real PostgreSQL instance:

```bash
pnpm --filter @workspace/db run db:check-tenant-isolation
```

The matrix executes every tenant operation in a rolled-back transaction using a
non-owner role and reports three severities:

- `isolation` — scoped reads, primary-key reads, JOINs, cross-tenant
  INSERT/UPDATE/DELETE, degenerate scope (rls on with no clinic pinned),
  `SET LOCAL` rollback, session-level `SET` leakage, and `DISCARD ALL`
  cleanup. A failure here fails the run.
- `coverage` — every clinicId-bearing table in the live schema has RLS and a
  `tenant_isolation` policy. A failure fails the run.
- `precondition` — the configured `DATABASE_URL` role does not bypass RLS, and
  `docita_app` exists with login. Reported always; gated with
  `--strict-preconditions` (required for release evidence).

`pnpm check:rls-table-coverage` is the static dual of the `coverage` severity:
it fails at review time when a migration newer than the last policy sweep
creates a clinicId-bearing table without enabling row level security, so the
gap cannot reopen between soak runs.

### Policy coverage history

`20260502143500_add_rls_policies` created the policies with a one-time loop, so
16 tables added afterwards had no policy and no database-level tenant backstop.
`20261003000000_complete_rls_policy_coverage` re-applies the same loop
idempotently; coverage is now 91/91 clinicId-bearing tables. Any future tenant
table must enable RLS in its own migration.

### Known limitation: nullable clinicId columns

The policy compares `"clinicId" = current_setting('app.current_clinic_id', true)`.
For the four tables with a nullable `clinicId` (`InsuranceClaim`, `OutboxEvent`,
`Referrer`, `WhatsAppBroadcastJob`) a row whose `clinicId` is NULL has a NULL
comparison, which `USING` treats as false and `WITH CHECK` treats as satisfied.
Such rows are therefore invisible to scoped reads but writable from any scope.
`OutboxEvent` relies on this: relay rows are written with `clinicId: null` for
platform events and the relay drains cross-tenant by design. Treat nullable
`clinicId` as an explicit design decision per table, not a default.

## App-plane dual: ABAC policies

The RLS policies are the **data-plane** backstop (tenant row isolation via
`tenant_isolation` + `app.current_clinic_id`). The ABAC layer in
[`ADR-0013`](../architecture/decisions/0013-abac.md) and
[`ABAC_MIGRATION_PLAN.md`](../analysis/ABAC_MIGRATION_PLAN.md) is the
**app-plane** dual: object-level, context-aware decisions (ownership,
assignment, author-of-record, tenant discipline for 404/no-disclosure) that
run after the RBAC/tier/tenant guards and before RLS. The two planes are
independent and both stay in force — a policy decision is not an RLS bypass
and vice versa (break-the-glass audits and bypasses RLS intentionally, as
documented in ADR-0013 C1). See the [`ABAC_RETIREMENT_LEDGER.md`](../analysis/ABAC_RETIREMENT_LEDGER.md)
for the legacy-guard decisions.

## Rollback

Set `RLS_ENABLED=false` and roll the API. The policies remain in place
but become inert because `app.rls_enabled` is never set to `'on'` for
the connection.

## Owner / migration role behavior

`FORCE ROW LEVEL SECURITY` is intentionally not enabled. Migrations and
seed scripts therefore continue to run as the owner with full table
visibility. If we ever decide to enforce RLS for the owner too, that is a
separate migration plus a follow-up runbook update.

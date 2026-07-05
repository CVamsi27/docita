# Runbook: `add_patient_user_link` migration re-issue

**Date:** 2026-07-05 · **Change:** the un-timestamped migration folder
`packages/db/prisma/migrations/add_patient_user_link/` was re-issued as
`20260705120000_add_patient_user_link/` with identical, idempotent SQL.

## Why

Prisma applies migrations in lexicographic directory order. A folder named
`add_patient_user_link` sorts **after** every `2026…` folder, so each newly
added timestamped migration slotted in *before* it. Fresh databases therefore
applied migrations in a different order than existing environments recorded in
`_prisma_migrations`. The SQL is fully idempotent (`IF NOT EXISTS` guards), so
nothing broke — but the ordering divergence was a latent risk for any future
migration that touches `Patient.userId`.

## What deployed environments will see

`prisma migrate deploy` treats `20260705120000_add_patient_user_link` as a new,
unapplied migration and runs it. Every statement is an idempotent no-op on
databases that already ran the legacy folder. **No action is strictly
required** — the deploy pipeline (`.github/workflows/db-migrations.yml`)
handles it.

## Optional: marking it applied without executing

If you prefer the new folder to be recorded without executing (e.g. on a
change-frozen environment):

```bash
pnpm --filter @workspace/db exec prisma migrate resolve \
  --applied 20260705120000_add_patient_user_link
```

Run against the target `DATABASE_URL`. Verify afterwards with
`prisma migrate status` — both `add_patient_user_link` and
`20260705120000_add_patient_user_link` should show as applied.

## Rules going forward

- Every migration folder MUST use the `YYYYMMDDHHMMSS_snake_case` prefix
  (enforced direction: `pnpm check:migration-prefix-collision`).
- The legacy folder is kept permanently (see the README inside it); deleting it
  would desync environments that recorded it in `_prisma_migrations`.

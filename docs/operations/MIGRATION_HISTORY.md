# Migration history notes

Operational context for Prisma migrations that cannot be renamed after they have been applied in shared environments.

## Duplicate timestamp `20251123161005`

Two migration directories share the prefix `20251123161005`:

| Directory | Role |
|---|---|
| `20251123161005_add_tiers_and_super_admin` | Applies the original schema changes (`SUPER_ADMIN` role, `PaymentSession`, clinic subscription fields, etc.). |
| `20251123161005_add_tiers_and_internal` | Historical no-op placeholder (`SELECT 1`) kept so `_prisma_migrations` rows on databases that applied the internal path stay valid. |

### Fresh database ordering

Prisma applies migrations in **lexicographic order** of the directory name. For the shared prefix, `_internal` sorts **before** `_super_admin`, so the placeholder runs first on a clean database, then the substantive migration.

Later migrations complete the `SUPER_ADMIN` → `INTERNAL` rename path:

- `20260408192900_add_internal_to_role_enum`
- `20260408193000_replace_super_admin_with_internal`

### Prevention

`pnpm check:migration-prefix-collision` fails when any **new** timestamp prefix is reused. The `20251123161005` pair is the only tolerated historical collision.

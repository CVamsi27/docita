# @workspace/db

Prisma schema, generated client, and database scripts.

**Rule:** never import `@workspace/db` outside `apps/api` repositories or approved DB scripts. Frontend packages and API controllers must not touch Prisma directly.

## Schema lock — additive only since 2026-03-22

The schema is locked to additive-only changes. This means:

- Do not remove enum members, columns, relations, or models.
- Do not rename columns or change column types in a way that drops data.
- New fields must be nullable or have a default so existing rows stay valid.
- Every migration must pass `db:guardrail` before merging.

See [memory: DB Schema Locked](../memory/project_db_schema_locked.md) for context.

## Migration workflow

```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Validate before applying:
pnpm --filter @workspace/db run db:migrate:dry-run

# 3. Apply safely:
pnpm --filter @workspace/db run db:migrate:safe

# 4. Guardrail check:
pnpm --filter @workspace/db run db:guardrail

# 5. Regenerate client:
pnpm --filter @workspace/db run db:generate
```

After any schema change, update affected Zod schemas in `packages/types` and repository mappers in `apps/api/src/domains/<domain>/infrastructure/repositories`.

## Performance tools (DB scripts)

```bash
pnpm --filter @workspace/db run db:analyze-indexes
pnpm --filter @workspace/db run db:check-query-plans
pnpm --filter @workspace/db run db:check-integrity
pnpm --filter @workspace/db run db:profile-queries
```

## Who can import this package

- `apps/api` — domain repositories only (never controllers or services directly)
- `packages/db/scripts/` — one-off data migration and maintenance scripts
- No frontend package, no `apps/app`, no `apps/internal`, no `apps/worker` runtime code

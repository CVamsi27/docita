# @workspace/db

Prisma schema, generated client, and database scripts.

## Schema Lock

The database schema is additive-only for this audit program. Do not remove enum members, columns, or relations as part of cleanup.

## Safe Migration Commands

```bash
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @workspace/db run db:migrate:safe
pnpm --filter @workspace/db run db:guardrail
```

Application services and frontend packages must not import Prisma directly. Prisma access belongs in `packages/db`, API repositories, and approved DB scripts.

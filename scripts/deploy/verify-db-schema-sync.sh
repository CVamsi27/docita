#!/usr/bin/env bash
# Verifies production (or any) DATABASE_URL has all Prisma migrations applied and
# matches packages/db/prisma/schema.prisma. Fails deploy when schema drift remains.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for schema verification." >&2
  exit 1
fi

echo "==> Prisma migrate status"
STATUS_FILE="$(mktemp -t docita-migrate-status.XXXXXX)"
pnpm --filter @workspace/db exec prisma migrate status 2>&1 | tee "$STATUS_FILE"

if grep -Eiq "following migrations? have not yet been applied|Database schema is not up to date" "$STATUS_FILE"; then
  echo "Pending Prisma migrations detected; run db:migrate:safe before deploying API code." >&2
  exit 1
fi

echo "==> Prisma schema drift check (database vs schema.prisma)"
pnpm --filter @workspace/db exec prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code

echo "Database schema is in sync with Prisma schema."

# Dependency upgrade tracker (DP4–DP8)

| Item | Status | Notes |
|------|--------|-------|
| TypeScript `5.7.3` | **Done** | Root pin; workspace packages `types`, `utils`, `db`, `auth`, `hooks` aligned |
| App/internal/landing TS | **Done** | `5.7.3` or `^5.7.3` on Next apps |
| NestJS 12 | **Planned** | Requires coordinated API/worker upgrade + e2e pass; not mixed into audit fixes |
| Prisma major | **N/A** | Stay on repo-pinned Prisma 7.x until dedicated migration |

Track breaking upgrades in their own PR with full `pnpm test` and API e2e.

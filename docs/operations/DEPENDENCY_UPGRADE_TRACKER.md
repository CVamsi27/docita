# Dependency upgrade tracker (DP4–DP8)

| Item | Status | Notes |
|------|--------|-------|
| TypeScript `6.0.3` | **Done** | Workspace-wide 5.7.3 → 6.0.3 (2026-08-04, P3.3 step 11): all 13 manifests aligned on `^6.0.3`; `ignoreDeprecations: "6.0"` on configs using `baseUrl`/`moduleResolution: node`; explicit `types` arrays added (`types` now defaults to `[]`); worker `rootDir: "../"`; exceljs Buffer boundary fix. 26/26 check-types, all builds + test suites green. TS 7.0 deferred until NestJS supports the native compiler API |
| App/internal/landing TS | **Done** | `^6.0.3` on app, internal, landing |
| NestJS 12 | **Planned** | Requires coordinated API/worker upgrade + e2e pass; not mixed into audit fixes |
| Prisma major | **N/A** | Stay on repo-pinned Prisma 7.x until dedicated migration |

Track breaking upgrades in their own PR with full `pnpm test` and API e2e.

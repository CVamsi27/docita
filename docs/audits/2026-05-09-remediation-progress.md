---
date: 2026-05-09
base_audit: docs/audits/2026-04-02-security-performance-audit.md
prior_progress: docs/audits/2026-04-02-remediation-progress.md
branch: chore/audit-fixes-2026-05-09
---

# Audit Remediation Progress — 2026-05-09

Sweep over the open P1/P2 items from the 2026-04-02 audit. P0 items had already been addressed in the 2026-04-02 progress pass.

## Summary

| ID | Status | Notes |
|---|---|---|
| SEC-007 | Implemented | CSP `'unsafe-inline'` removed from global helmet; relaxed CSP scoped to `/docs` (dev-only) |
| SEC-008 | Already done | No `describe.skip` in `apps/api/test/`; named suites are enabled on `main` |
| PERF-001 | Already done | Composite index `Appointment_clinicId_status_startTime_idx` exists in schema and migrations |
| PERF-002 | Implemented | Bundle budget gate now runs on PRs against a cached baseline from `main` (was a no-op) |
| PERF-003 | Implemented | `profile-queries.ts` produces an actionable error if `pg_stat_statements` is unavailable instead of a raw Prisma exception |
| PERF-004 | Already done | `WebVitalsReporter` is mounted in `apps/app/app/layout.tsx` and `InternalWebVitalsReporter` in `apps/internal/app/providers.tsx` |

## What changed in this pass

### SEC-007: CSP scoping

- `apps/api/src/main.ts`: global helmet CSP no longer allows `'unsafe-inline'` on `script-src`/`style-src`, and no longer allows the jsdelivr CDN.
- A second helmet middleware is mounted at `/docs` only when `isDevelopment()` is true; this path retains the CSP needed by Swagger UI.
- API serves no HTML other than Swagger, so global responses (JSON) gain no functional cost from the tighter policy.

### PERF-002: bundle budget gate

The pre-existing `app-bundle-analysis` job in `.github/workflows/ci.yml` was a no-op:
1. It ran only on push to `main`.
2. It captured a fresh baseline from the current build before running budget enforce against that same baseline.

Updates:
- The job now runs on `pull_request` as well.
- On PR runs, the prior baseline is restored from `actions/cache` (key prefix `perf-baseline-`); the budget enforce step compares the PR build against that prior baseline.
- On `push` to `main`, the baseline is captured and saved to cache for future PRs.

### PERF-003: pg_stat_statements

`packages/db/scripts/profile-queries.ts` previously surfaced a raw Prisma error when the extension was not available (e.g. on managed Postgres without the preload). The script now:
- Wraps `CREATE EXTENSION IF NOT EXISTS pg_stat_statements` in a try/catch and prints actionable guidance referencing `docker-compose.yml`.
- Continues with the seq-scan section so the script still produces useful output when the extension cannot be created.

## Verification

- `pnpm --filter @docita/api run check-types`: PASS
- `pnpm exec turbo run lint --filter=@docita/api`: PASS
- `.github/workflows/ci.yml`: parses as valid YAML
- `apps/api/src/main.ts` re-formatted by `eslint --fix` to match prettier rules

## Dependency Advisory Burn-down (refresh after 2026-04-02 snapshot)

A fresh `pnpm audit --prod` against the post-remediation tree from 2026-04-02 returned 11 advisories (3 high, 7 moderate, 1 low). Most are transitive through `@prisma/client > prisma > @prisma/dev > hono` (developer tooling) and Next/Sentry build-time dependencies; one path (`@aws-sdk/client-s3 > fast-xml-builder/fast-xml-parser`) reaches production runtime.

Root `pnpm.overrides` updated:

| Package | Before | After | Why |
|---|---|---|---|
| `fast-uri` | (none) | `^3.1.2` | Path traversal + host confusion (HIGH × 2) — via Sentry webpack plugin |
| `fast-xml-builder` | (none) | `^1.1.7` | Quote-bypass in attribute values (HIGH) — via AWS S3 SDK at runtime |
| `fast-xml-parser` | `^5.5.6` | `^5.7.0` | XML comment / CDATA injection (MODERATE) — via AWS S3 SDK at runtime |
| `hono` | `^4.12.12` | `^4.12.18` | JSX HTML injection, body-limit bypass, CSS injection, JWT validation, cache cross-user leak |
| `postcss` | (none) | `^8.5.10` | XSS via unescaped `</style>` (MODERATE) — via Next |
| `basic-ftp` | `^5.2.2` | `^5.3.1` | Pulled along with other override refresh |

Post-fix `pnpm audit --prod`: `info=0 low=0 moderate=0 high=0 critical=0`.

## Items not addressed in this pass

Out of scope for this audit-remediation branch:
- Broader refactoring (SOLID/DRY/KISS) of the wider codebase.
- Repo-wide unification of frontend/backend response types (recommended to handle per-route as part of normal feature work, with API contract assertions in `apps/api/test/contract-assertions.ts`).

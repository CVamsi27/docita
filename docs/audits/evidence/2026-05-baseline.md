# 2026-05 Baseline Metrics

Generated for `docs/UpcomingPlans/security-and-performance-audit-merry-lobster.md` on 2026-05-15.

## Commands

```bash
git ls-files | wc -l
git ls-files 'apps/api/src/**/*.controller.ts' | wc -l
git ls-files 'apps/api/src/**/*.service.ts' | wc -l
git ls-files 'apps/api/src/**/*repository*.ts' | wc -l
git ls-files 'apps/app/app/**/page.tsx' | wc -l
rg -n "as any|as unknown as|@ts-ignore|@ts-expect-error|console\\.|fetch\\s*\\(|transition-all|animate-pulse|animate-in|slide-in-from-bottom|text-\\[(10|11|13|15)px\\]" apps packages scripts
pnpm check:file-size-budget
pnpm check:frontend-fetch
pnpm check:audit-coverage
```

## Tracked File Counts

| Metric               | Count |
| -------------------- | ----: |
| Total tracked files  |  2936 |
| API controllers      |    76 |
| API services         |   196 |
| API repository files |    68 |
| App route pages      |    70 |

## Counts By Top-Level Area

| Area              | Files |
| ----------------- | ----: |
| `apps`            |  2280 |
| `packages`        |   526 |
| `docs`            |    49 |
| `scripts`         |    38 |
| `.github`         |    11 |
| `loadtest`        |     9 |
| root/config/other |    23 |

## Counts By Extension

| Extension  | Files |
| ---------- | ----: |
| `.ts`      |  1722 |
| `.tsx`     |   788 |
| `.sql`     |   104 |
| `.json`    |    54 |
| `.md`      |    51 |
| `.mjs`     |    49 |
| `.prisma`  |    27 |
| `.gitkeep` |    23 |
| `.js`      |    20 |
| `.png`     |    17 |
| `.astro`   |    15 |
| `.yml`     |    10 |
| `.tsv`     |     9 |
| `.toml`    |     8 |
| `.css`     |     6 |

## Forbidden Pattern Baseline

These counts are the pre-cleanup baseline. New guardrails either fail immediately where the repo is already clean or run in report mode until the tracked findings are resolved.

| Pattern                       | Count |
| ----------------------------- | ----: |
| `as any`                      |     0 |
| `as unknown as`               |   102 |
| `@ts-ignore`                  |     0 |
| `@ts-expect-error`            |     0 |
| `console.`                    |    96 |
| `fetch(`                      |   133 |
| `transition-all`              |    17 |
| forbidden animation utilities |    43 |
| forbidden text-size literals  |     6 |

## Current Report-Mode Findings

| Check                         |                            Findings |
| ----------------------------- | ----------------------------------: |
| `pnpm check:file-size-budget` |                  56 oversized files |
| `pnpm check:frontend-fetch`   | 13 frontend fetch boundary findings |
| `pnpm check:audit-coverage`   |          31 top-level ledger misses |

## Status

This baseline is intentionally factual. It does not by itself approve the findings; it records the starting point for the phased cleanup and gives reviewers a stable before/after reference.

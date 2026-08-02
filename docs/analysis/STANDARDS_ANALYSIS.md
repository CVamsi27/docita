# Standards Analysis — Rules vs. Automation

Point-in-time: **2026-08-02**. AGENTS.md codifies ~150 rules; 97 scripts automate the mechanical subset. This doc maps the enforcement surface, test coverage, CI matrix, and where enforcement is manual.

## % Completed

| Area | % | Notes |
|---|---|---|
| Lint compliance | **100%** | 0 errors (84 warnings — react-refresh) |
| Type check compliance | **100%** | 0 errors (app-vite + api) |
| Knip (unused code) | **0%** | 278 exports + 287 types remain (low priority) |
| Test coverage (files) | **41%** | 113/275 app-vite tests ported |
| E2E coverage | **90%** | 45/50 app specs ported |
| Check scripts | **100%** | 97 scripts operational |
| CI workflows | **100%** | 8 workflows operational |

## 1. The enforcement surface — 97 named check scripts

`scripts/checks/` holds 96 `check-*.mjs` + `check-prisma-boundary.js` + a test runner (`standard-checks.test.mjs`, 11 tests). The full chain runs via `pnpm verify:standard` (80+ commands) plus side gates:

| Category | Examples (15 of 97) | Enforces |
|---|---|---|
| Layering | `check-prisma-boundary`, `check-api-domain-layout`, `check-feature-boundaries`, `check-package-boundaries`, `check-cross-domain-application-imports` | Prisma/domain/feature/package walls |
| Architecture | `check-circular-deps` (0-cycle baseline, 2 allowlisted), `check-controller-cqs`, `check-facade-delegation`, `check-repository-di-tokens`, `check-ad-hoc-service-cache` | SOLID posture, DI, CQS |
| Contracts | `check-contracts-strict`, `check-type-duplicates`, `check-abdm-fhir-contract`, `check-application-event-constants` | Zod-first SSOT, no parallel types |
| RBAC/gating | `check-controller-rbac`, `check-tier-comparisons`, `check-workspace-profile-gating`, `check-tools-route-gate` | auth posture, no numeric tier compares, no legacy symbols |
| Security | `check-auth-tenant-safety`, `check-phi-read-audit`, `check-sensitive-logging`, `check-no-console-runtime`, `check-browser-telemetry-same-origin`, `check-sentry-scrubber-parity` | tenant safety, PHI logging, telemetry origin |
| Data | `check-n-plus-1`, `check-migration-reversibility`, `check-migration-safety`, `check-new-date-in-domain-infrastructure`, `check-cron-schedules`, `check-promise-all-in-schedulers` | query health, reversible migrations, scheduler hygiene |
| Frontend | `check-frontend-fetch`, `check-query-key-factory`, `check-native-ui-affordances`, `check-responsive-data-tables`, `check-i18n-translation-keys`, `check-client-storage-usage` | no inline fetch, no native-UI substitutions, i18n parity |
| Hygiene | `check-hygiene`, `check-file-size-budget` (400-line backstop), `check-as-cast-density`, `check-empty-catches`, `check-detached-promises`, `check-fallow` (dead code) | repo junk, size, type escapes |

**Known automation blind spots (manual review required)**: SOLID/KISS judgment per §12.6, unused-export semantics across the port boundary (knip can't see the git-HEAD Next tree), duplicate-primitive judgment in `apps/<app>/src/components` (partially automated), dark-mode functional wiring, bundle-vs-budget deltas (automated, budget-owned).

## 2. Local hooks (husky)

- `pre-commit`: `pnpm lint` only (~70 ms warm).
- `pre-push`: lint + `check:i18n-translation-keys` + `check:duplication` + `check:standard-gate-wiring` + `test:standards-checks` (~30–40 s warm). Full `verify:standard` is the CI merge gate.

## 3. Test coverage — 646 spec files (refreshed 2026-08-02)

| Area | Spec files | Framework |
|---|---|---|
| apps/api/src (unit/integration) | 381 | Jest |
| apps/api/test (E2E) | 18 e2e-specs + 15 helpers (33 files) | Jest (api-e2e workflow) |
| packages/* | 79 (ui 27, utils 23, types 19, data-access 8, auth 1, hooks 1) | Vitest/Jest |
| apps/app-vite/src | 122 | Vitest + Testing Library |
| apps/internal-vite/src | 8 | Vitest |
| E2E (Playwright) | 45 app + 3 internal specs of 50 Next + 2 internal | Playwright 1.48.2 |

**Test density** (tests per 1,000 source lines):
- API: **1.9** per 1K lines (381 tests / 200,492 lines)
- app-vite: **1.0** per 1K lines (122 tests / 121,222 lines)

**API domain test coverage** (test files / source files):

| Domain | Tests | Source | Coverage | Risk |
|---|---|---|---|---|
| analytics | 33 | 73 | 45% | Low |
| public-booking | 5 | 11 | 45% | Low |
| patient-portal | 26 | 73 | 35% | Medium |
| appointments | 30 | 89 | 33% | Medium |
| custom-fields | 2 | 6 | 33% | Medium |
| insurance-claims | 3 | 9 | 33% | Medium |
| clinical | 23 | 72 | 31% | Medium |
| abdm | 5 | 17 | 29% | Medium |
| reminders | 34 | 116 | 29% | Medium |
| prescriptions | 3 | 11 | 27% | Medium |
| subscriptions | 3 | 11 | 27% | Medium |
| lab-portal | 3 | 11 | 27% | Medium |
| billing | 7 | 27 | 25% | Medium |
| enterprise-contracts | 2 | 8 | 25% | Medium |
| ipd | 1 | 4 | 25% | Medium |
| patients | 6 | 27 | 22% | High |
| payments | 5 | 23 | 21% | High |
| webhooks | 19 | 86 | 22% | High |
| doctors | 5 | 26 | 19% | High |
| doctor-clinics | 7 | 40 | 17% | High |
| documents | 2 | 14 | 14% | High |
| medical-documents | 3 | 25 | 12% | High |
| feedback | 1 | 11 | 9% | Critical |

Per-feature density gates (`check-feature-test-density`) and rules-unit-test gates (`check-domain-rules-tests`) run in `verify:standard`. Pure-helper files (`*-helpers.ts`, rules) must have standalone unit tests (§15.10).

## 4. CI matrix — 8 workflows

| Workflow | Purpose | Trigger |
|---|---|---|
| ci.yml | path-scoped per-app quality (lint/type/tests/build), repo-standards (verify:standard, knip), security-audit, osv-scan, validate-migrations, bundle analysis | PR + dispatch |
| deploy.yml | prod deploys: Fly API/worker, DB migrations, Cloudflare frontends (path-filtered) | push to main |
| api-e2e.yml | full API E2E suite (Postgres in CI) | manual |
| frontend-critical-e2e.yml | Playwright critical flows | weekly Mon 02:00 UTC + manual |
| db-migrations.yml | prod migration apply + schema-sync verify | manual |
| container-scan.yml | Trivy scans of API/worker images → SARIF | weekly Mon 06:00 UTC |
| scale-api-hours.yml | Fly API 1↔0 machines IST business hours | daily 03:00/15:00 UTC + manual |
| synthetic-monitoring.yml | prod synthetic probes (API + app) | 3×/business day + manual |

Cost/scope discipline (§11.2): heavy jobs (verify:standard, E2E, build) run on push-to-main or path-scoped; dependency audits gate on `dependencies` scope; knip runs only on `knipChange` scope.

## 5. Docs inventory (~140 tracked files under docs/)

- `docs/analysis/` (this series, 9 docs), `docs/audits/` (19 — point-in-time), `docs/architecture/` (28 incl. 12 ADRs), `docs/operations/` (26), `docs/compliance/` (8), `docs/product/` (11), `docs/ui/` (7), `docs/UpcomingPlans/` (8), `docs/plan/`, `docs/testing/`, `docs/api/`, runbooks, plus 8 top-level docs (PORTING_PLAN, REPO_GAPS, CODEBASE_CLEANUP_PLAN, FUTURE_FEATURE_REQUIREMENTS, ONBOARDING, PAGES_AND_FEATURES, one-pager, marketing).

**Doc drift found 2026-08-01**: ~~`DEPLOYMENT.md` says API region Mumbai + `min_machines_running = 1`~~ ✅ Fixed; ~~`design-tokens.ts` vs globals.css mismatch~~ ✅ Deleted; AGENTS.md §13 command list was re-synced 2026-07-31 and verified.

## 5.5 Current Compliance Snapshot — 2026-08-02

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 84 warnings (82 `react-refresh/only-export-components` in app-vite, 2 in internal-vite) |
| `pnpm --filter @docita/app-vite run check-types` | PASS (0 errors) |
| `pnpm --filter @docita/api run check-types` | PASS (0 errors) |
| `pnpm knip` | 278 unused exports, 287 unused types |
| Inline `fetch()` in features | 1 violation (`use-download-opd-slip.ts:20`); `check:frontend-fetch` is git-based and misses untracked `apps/app-vite/src` — fix will surface once src is committed or check becomes fs-based |
| Raw `<button>` in production code | **0** (all 50 instances are in test files only) |
| Missing `aria-label` on interactive elements | 108 instances (0 raw `<button>`, ~31 `<a>` tags, ~77 `<Link>` tags — multiline-aware re-scan 2026-08-02) |
| Features without i18n | **1** of 45 (`legal` — intentional, allowlisted in `check:i18n-coverage`) |
| Native `title=` tooltip in features | 0 (238 matches are all component props) |
| Native `<select>` in features | 0 |
| `console.log/error` in features | 0 |
| `as any` in features | 0 |
| `@ts-expect-error` in features | 0 |
| TODO/FIXME/HACK in features | 0 |

Note: the `react-refresh/only-export-components` warnings are files that export both React components and non-component items (hooks, types, constants). These are code organization issues, not functional bugs. The remaining inline `fetch()` violation and 108 missing `aria-label` instances are tracked in `SECURITY_ANALYSIS.md` §4.5 / `UI_UX_ANALYSIS.md` §6.5.

**Dependency counts per workspace package**:

| Package | Dependencies | Notes |
|---|---|---|
| apps/api | 85 | NestJS + Prisma + 30+ domain modules |
| apps/worker | 66 | Shares API infra |
| packages/ui | 54 | Radix + Tailwind + lucide-react |
| packages/hooks | 12 | Framework-agnostic React hooks |
| packages/utils | 11 | Pure helpers |
| packages/data-access | 10 | Axios + React Query |
| packages/types | 7 | Zod + inferred types only |
| packages/auth | 6 | JWT + session helpers |

## 6. What "standards" means operationally

1. **Merge gate**: `verify:standard` (CI) + husky pre-push subset — 97 checks + per-app gates.
2. **SSOT doctrine**: every data point one canonical source (`packages/types` Zod schemas; tokens in globals.css; status labels in types; `discountTypeSchema`; `getPatientFullName`; support email constants). Violations are check-blocked (type-duplicates, colors, patient-name-ssot, i18n).
3. **Existing-user compatibility** (§9.4): schema/onboarding/tier changes must trace pre-change accounts; enforce via required-setting rollout checklist.
4. **Branch discipline** (§11.3): `main` + `staging` mirror + ≤2 open PRs; consolidated branches per playbook.

**Recommendation backlog** (from this pass): ~~fix DEPLOYMENT.md drift~~ ✅, ~~remove stale `ignoreGhsas` entries~~ ✅, ~~decide `design-tokens.ts` fate~~ ✅ deleted, ~~wire dark mode~~ ✅ wired, add a check for `next-themes`-style framework-specific deps in `packages/*` manifests (package-boundary blind spot), expand `check:native-ui-affordances` to cover `features/` (currently only checks `components/`).

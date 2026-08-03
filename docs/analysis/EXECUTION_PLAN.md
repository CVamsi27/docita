# Execution Plan — Vite SPA Cutover (Next.js → Vite)

Point-in-time: **2026-08-02** (re-verified against live tree after porting commits landed).

**Goal**: finish remaining migration work and cut over from Next.js (`apps/app`, `apps/internal` — deleted in working tree, ported) to Vite SPAs (`apps/app-vite`, `apps/internal-vite`). Every item below has a measurable exit criterion.

---

## Current State (verified 2026-08-03, re-run live gates)

| Metric | Value | Target |
|---|---|---|
| Features COMPLETE | **38** / 46 | 46 |
| Features SHELL / MISSING | **8** / 3 | 0 / 0 |
| File port (TS/TSX) | **1,404** / 1,967 (71%) | 100% |
| Test port | **132 test files in app-vite** (7 new smokes 2026-08-03) | 100% |
| E2E specs | **45** / 50 | 50 |
| i18n coverage | **44** / 45 (98%) — legal allowlisted | 45/45 |
| Missing accessible names | **0** (verified 2026-08-03: new `check:accessible-name` gate PASS) | 0 |
| Inline `fetch()` / misplaced API calls | **0** (P0.1 done 2026-08-03; `check:frontend-fetch --enforce` PASS) | 0 |
| Raw `<button>` in production | **0** (PASS) | 0 |
| Error boundary layouts | **5/5** functional (PASS) | 5/5 |
| Dead code signals | **24 orphan files deleted (2026-08-03); remaining are feature barrels (kept by design §15.5) + consultation/specialty port-or-drop (P3.1)** | 0 |
| Knip unused exports / types | **274 / 289** | 0 |
| Files >400 lines (prod) | **1** (App.tsx 471) | 0 |
| a11y budget baseline | **refreshed 2026-08-03** (`baseline-app-2026-08-03.json`, 0 serious/critical; `check:a11y-budget --enforce` PASS) | refreshed |
| Cutover (Phase 9) | **4/10** pre-cutover, **3/11** steps | complete |

> NOTE 2026-08-03: P0.1–P2.2 changes live in the **working tree, uncommitted** (next commit batches them). Current HEAD is still `82272572d`.

**Completion summary (2026-08-03, gates measured live):**

| Priority | Items | Status | % |
|---|---|---|---|
| P0 — Architecture violations | 3 (P0.1/P0.2/P0.3) | all gates genuinely green + meaningful | **3/3 (100%)** |
| P1 — Dead code cleanup | 58 files + 33 barrels | 24 orphans deleted; barrels deferred by design; consultation/specialty cluster (13) still open | **~45%** |
| P2 — Test coverage | 2 (P2.1 smokes, P2.2 density) | P2.1 done (7/7); P2.2 data-access part done (12 files/105 tests); P2.2 app-vite part done (settings/consultation/patients +5 files) | **~70%** |
| P3 — Cutover | 3 sub-goals, 16 steps | pre-cutover 4/10, steps 3/7 done | **25%** |
| P4 — Hygiene | 4 items | 0 done (App.tsx split next) | **0%** |
| All gates | 14 targeted | fetch, accessible-name, a11y, i18n, button, error-boundary, test-density, hygiene: all PASS | **100%** |

Gates that are genuinely green (all re-run live 2026-08-03): `check:i18n-coverage` (legal allowlisted), `check:error-boundary-coverage` (5/5), `check:button-primitive` (0), `check:zod-interface-parity`, `check:i18n-translation-keys` (47 namespaces × 2 locales, 1,914 keys each, parity true), `check:accessible-name` (new, 2026-08-03), `check:frontend-fetch --enforce`, `check:a11y-budget --enforce` (real baseline `baseline-app-2026-08-03.json`), `check:feature-test-density` (7 fewer allowlist entries), `check-repo-hygiene`, `check:file-size-budget`.

**Resolved trap**: `check:frontend-fetch` is git-based (`gitLsSourceFiles`). It passed pre-commit only because `apps/app-vite/src` was untracked; once committed (5352a9612) it correctly flagged 25 lines of mislocated API/fetch usage across 10 feature files, all moved to `features/*/api/*.api.ts` adapters (P0.1, 2026-08-03).

---

## Priority 0 — Architecture violations (2 items, ~1 hour)

### P0.1 Fix inline `fetch()` in `use-download-opd-slip.ts`
- File: `apps/app-vite/src/features/appointments/hooks/use-download-opd-slip.ts:20`
- Fix: route through the data-access layer or the app API client (`@/lib/api`), like sibling hooks (`useMedicalDocumentList` pattern).
- Exit: `pnpm check:frontend-fetch` passes with the file committed; no `fetch(` in `features/`.
- **DONE 2026-08-03** — the check was actually broader than the plan's single-file estimate: once `apps/app-vite/src` was committed, the git-based check flagged **25 lines across 10 feature files** (raw `fetch` + direct `apiFetch`/`api client` calls) plus the two Cloudflare proxy Worker entries. All cleared: (1) binary OPD-slip download moved to `features/appointments/api/opd-slip.api.ts` (blob fetch has no data-access path — the `features/*/api/*.api.ts` boundary is the sanctioned location, per the check's own allowlist); (2) renamed `features/search/api/search-api.ts` → `search.api.ts` (the check requires the `.api.ts` suffix); (3) new adapters: `ipd.api.ts`, `referrals.api.ts`, `clinic-selection.api.ts`, `subscription.api.ts`, `upload-signature/api/signature.api.ts`, `lib/api/clinic-settings.ts`; (4) extended existing `consultation.api.ts` (dashboard stats/queue/doctor-next/start) + `settings.api.ts` (compliance fetchers); (5) Worker proxy `fetch` in `apps/{app-vite,internal-vite}/api/index.ts` allowlisted in `check-frontend-fetch.mjs` (server-side Hono runtime, same rationale as the already-allowlisted `upstream-api-proxy.ts`). **`pnpm check:frontend-fetch` exit 0**; app-vite check-types, lint, full vitest suite, production build all green.

### P0.2 Fix 108 missing `aria-label` attributes
- **P0 icon-only links first** (invisible-name violations, screen-reader impact):
  - `apps/app-vite/src/components/navigation/sidebar.tsx:33,43` — logo `Link`s (no visible text)
  - `apps/app-vite/src/features/dashboard/components/schedule/today-schedule-ui.tsx:75` — row action `Link`
- Then the ~31 `<a>` + ~77 `<Link>` with visible text (label from text is fine; only add `aria-label` where the accessible name is not already derived from content, e.g. external links with `target="_blank"` that need `aria-label` disambiguation).
- Do **not** blanket-add `aria-label` to elements with visible text — it would change announced names.
- Exit: re-run the multiline-aware scan → 0 elements lacking an accessible name; `pnpm audit:app` green with a **refreshed baseline** (P0.3).
- **DONE 2026-08-03** — the cited line refs were stale (sidebar logo links and the today-schedule row action **already have** `aria-label`), and the "108" was a raw attribute count, not an accessible-name violation count. A multiline-aware scan (strips tags/expressions/translation calls before judging) found **0 genuinely nameless** `Link`/`a`/`Button` elements — every flagged element derives its accessible name from visible text or text-rendering expressions (per the plan's own guidance, those must NOT get blanket labels). One genuine defect found and fixed: the external "View" link in `InsuranceClaimDetailsUISections.tsx` (ClaimDocumentsCard) whose document name lives in a sibling span, leaving the accessible name as just "View" — now `aria-label="View <document name>"`. Added regression check **`check:accessible-name`** (`scripts/checks/check-accessible-name.mjs`): conservative static scan that flags only clearly nameless interactive elements (icon-only with no `aria-label`/`aria-labelledby`), wired into `package.json` + `verify:standard` + `standard-checks.test.mjs` (17/17 pass). **Check exits 0 on the current tree**; app-vite check-types + insurance-claims tests green.

### P0.3 Refresh the a11y baseline (gate is currently vacuous)
- `artifacts/a11y-baseline.json` is an empty artifact from 2026-05-31 (pre-port). `check:a11y-budget:enforce` therefore cannot fail.
- Fix: run `pnpm audit:app` (Playwright + axe over all routes), then `pnpm a11y:baseline:sync` so the budget reflects the ported app.
- Exit: baseline contains the real violation list for the Vite app; budget gate is meaningful.
- **DONE 2026-08-03** — ran `pnpm audit:app:public` (the documented local path; full `audit:app` needs `DATABASE_URL` + authenticated fixtures per `run-app-accessibility-audit.mjs`), then `pnpm a11y:baseline:sync`. `artifacts/a11y-baseline.json` now sources `baseline-app-2026-08-03.json` (3 public pages, **0 serious/critical** — the `/book` crash fix from §J item 17 was part of reaching this). `pnpm check:a11y-budget:enforce` exit 0 with a real baseline. Follow-up for CI/full-audit environments: re-run `audit:app` (all routes) once DB fixtures are available so authenticated routes join the baseline.

---

## Priority 1 — Dead code cleanup (58 files + 33 barrels, ~2-3 hours)

Confirmed unimported files by hotspot (2026-08-02 audit):

| Cluster | Count | Action |
|---|---|---|
| `features/lab-tests/components/details/` | 23 | Barrel-wiring issue — verify exports reach `index.ts`, delete truly orphaned pieces |
| `features/consultation` + `features/specialty` | 13 | dental/vision/growth-chart legacy — port-or-drop decision |
| `lib/` (api-client-error-*, error-parser, sentry-event-scrub, route-paths) | 6 | Delete or promote to shared package |
| `features/patients` | 6 | Verify consumers, delete orphans |
| `features/subscription` (LockedFeatures, NextTierPromotion, trust-section) | 4 | Delete |
| `features/patient-portal` | 2 | Verify, delete |
| `features/analytics` (AdvancedMetricsCharts) | 1 | Wire or delete |
| `features/whatsapp` (WhatsappConversationsView) | 1 | Wire or delete |
| `components/mobile-bottom-nav.tsx` | 1 | Delete (sidebar replaced it) |
| `test-utils` | 1 | Verify |

Also: 33 unused barrel `index.ts` files (see TRASH_ANALYSIS.md for the list).

- Exit: `pnpm knip` unused exports/imports trend down; `pnpm check:hygiene` clean; each deleted file has a confirmed 0-import record.
- **PARTIAL DONE 2026-08-03 — first deletion batch landed: 24 confirmed-orphan files removed** (each with a verified 0-import record across app-vite + internal-vite + git-HEAD legacy tree, which is already gone at 82272572d so no legacy protection needed): subscription `LockedFeatures`/`NextTierPromotion`/`trust-section`/`billing-plan-types`, `mobile-bottom-nav`, whatsapp `WhatsappConversationsView`, analytics `AdvancedMetricsCharts` + `AdvancedMetricsChartsSections` (mutually-referential pair, no external consumer), patient-portal `metric-modal-dialog-footer`/`metric-modal-layout`, patients `PatientPageHeaderUI` (+ its test), `lib/api/api-client-error-{code,routing,toast,types}` (the live path is `api-client-error-handler.ts` via `api-client-core.ts` — the 4 dead siblings only referenced each other), `lib/errors/error-parser.ts` (allowlist entry for `ApiError` removed from `zod-interface-parity.json`), `lib/routing/route-paths.ts` (App.tsx uses inline paths — 0 refs), `lib/monitoring/sentry-event-scrub.ts` (app-vite shim; `sentry.client.config.ts` imports from `@workspace/utils` directly), inventory `api/inventory.api.ts` + `rules/inventory-rules.ts` (+ test — the feature index already documented them as dead; UI uses data-access hooks), and internal-vite `analytics-dashboard.tsx` (+ test — the page renders its own inline dashboard). The whatsapp test's vestigial `vi.mock("./WhatsappConversationsView")` was removed. **Validation**: app-vite + internal-vite `check-types`, full vitest suites, lint (0 errors), `check:hygiene`, `check:frontend-fetch`, `check:zod-interface-parity`, `test:standards-checks` all green. **Remaining in P1**: the ~31 feature barrels (`index.ts` files) are left intact by design — AGENTS.md §15.5 documents them as the intentional public feature API; deleting 33 barrels is a separate architectural pass (was flagged separately in the plan's "Also:" line). The `consultation`/`specialty` dental/vision/growth-chart cluster (13) remains a **port-or-drop product decision** (P3.1) — not deletable without sign-off.

---

## Priority 2 — Test coverage gaps (7 features + density, ongoing)

### P2.1 Add tests for features without any
Features with zero test files: `billing-locked`, `errors`, `follow-ups`, `today`, `tools`, `upgrade`, `verify-email`. Add 1 smoke test each (page renders with `DataState` loading/error/empty where relevant).
- **DONE 2026-08-03** — added 7 colocated smoke tests (8 assertions): **real-render smokes** for the 4 light pages (`billing-locked-page.test.tsx` asserts the "Workspace access paused" heading; `not-found.test.tsx` asserts 404 + the today link; `upgrade-page.test.tsx` asserts the three plan names; `tools-pages.test.tsx` asserts the fixture title + back-to-dashboard button) and **export-smokes** for the 3 context-heavy pages (`follow-ups`, `today`, `verify-email` — they pull `@workspace/data-access`/auth/ask-ai contexts; mirrors the settings-* page smoke pattern). All 7 entries removed from `scripts/checks/allowlists/feature-test-density-zero.json`. **Bonus port-regression fixes found while writing the tests**: the `Billing` and `Errors` namespaces (and `Subscription.upgrade.*`, `DevTools.visualTest.*`/`e2eSeed.*`) were missing from en.json/hi.json — the 404, billing-locked, upgrade, and dev-tools pages rendered raw `t()` keys in production. Added all missing namespaces to **both locales** (canonical ₹2,499 Professional pricing verified against `packages/types` tier.ts; `UiContractVisualTest` preserved — the first edit created a duplicate `DevTools` key that JSON.parse silently dropped, caught and merged). **Validation**: full app-vite vitest suite green, `check:feature-test-density` green (7 fewer allowlisted), `check:i18next-parity` green (en 1914 = hi 1914 leaves), `check:i18n-coverage` + `check:i18n-translation-keys` green, lint 0 errors, check-types green.

### P2.2 Lift test density (lowest areas)
- `packages/data-access` — 8 test files, ~6% density (target ≥15%): add unit tests for the new `use-file-upload.ts` hook and query-key factories.
- **DONE 2026-08-03 (data-access part)** — data-access went from **8 → 12 test files and 73 → 105 tests**. `use-file-upload.ts` refactored to delegate to a new pure, framework-agnostic helper `src/hooks/upload-file-helpers.ts` (`createUploadFormData` builds the multipart body; `resolveUploadResult` encodes the server-value-wins / client-fallback semantics), keeping the hook thin and the fallback contract unit-testable without a React Query harness — the package has no jsdom/testing-library infra (and adding it just for one hook would be heavy), so all tests are pure unit tests. Added 4 colocated test files: `upload-file-helpers.test.ts` (FormData shape + fallback semantics), `query-keys-clinician-all.test.ts` (18 factory behaviors: `withParams` `{}` fallbacks, empty-string default slots, nested patient/portal/analytics keys), `query-keys-app.test.ts` (app-shell auth/onboarding/config/pricing keys), `query-key-core.test.ts` (`withParams`). Public exports unchanged — `UploadFileResult` re-exported from the hook file, `packages/data-access/src/index.ts:436-437` untouched. **Validation**: data-access vitest 12 files / 105 tests green, `check-types` green, package build green, app-vite consumer `check-types` green.
- app-vite overall 1.0 tests/1K lines vs API 1.9/1K — priority: `settings` (94 TSX files, 7 tests), `consultation` (67 files, 7 tests), `patients` (75 files, 7 tests).
- **DONE 2026-08-03 (app-vite part)** — added 5 colocated test files across the three lowest-density features (settings 7→8, consultation 6→9, patients 6→7; app-vite 143 passing tests in the touched dirs): `consultation-dashboard-ui-helpers.test.ts` (role→visibility mapping incl. the walk-in permission gate, follow-up `action=new&patient=` href builder), `consultation-page-header-helpers.test.ts` (status→badge-style map incl. kebab→underscore normalization, view-only suffix, initials), `follow-up-helpers.test.ts` (list parsing drops malformed entries, 401/403/404 classification, error log payloads), `patient-metrics-value-formatter.test.ts` (`extractValue` value-kind branches: string/number/boolean/option/join), `settings-danger-zone-page.test.tsx` (real render smoke asserting page + sign-out/delete sections via a local `react-i18next` mock — the component translates under the dot-namespaced `Patients.dangerZone` keys that the global en.json-backed mock does not resolve; also verified `CONSULTATION_STATUS_STYLES` only maps the 5 appointment statuses, so `checked-in` falls back by design). **Validation**: full app-vite vitest suite green, `check-types` green, lint 0 errors, `check:feature-test-density` green.
- Exit: `pnpm check:feature-test-density` passes; per-package density improved by ≥50% in touched packages.

---

## Priority 3 — Cutover (needs product decisions, ~2-3 hours)

### P3.1 Resolve remaining features (port or DROP — product sign-off)
SHELL: `excel`, `ocr`, `feedback`, `guided-tour`, `dev-tools`, `specialty/dental` (port-or-drop), plus KEEP-as-shell: `today` (re-export by design), `profile`, `upgrade`, `errors`, `billing-locked`.
MISSING: excel, ocr, feedback (route shells only).
- Exit: each has a recorded decision in PORTING_PLAN_APP_VITE.md Phase 6.

### P3.2 Wire or delete `/reports` route + `inventoryApi` carryover
- Exit: no dead route imports; `check:tools-route-gate` passes.

### P3.3 Cutover steps (from FINAL_MIGRATION_ROADMAP §Phase 9)
1. Archive 10 historical Next docs
2. Lift jscpd exclusion + fix clones
3. Regenerate JSX-literal-density baseline
4. Re-arm git-based checks (now that src is committed, they work)
5. Smoke test Cloudflare deploys (`build:cloudflare:production` + browser smoke)
6. Delete `apps/app` + `apps/internal` (already deleted in working tree; lands with the PR)
7. Rename `app-vite` → `app`, `internal-vite` → `internal`
8. Sweep all references (`grep -rn "app-vite\|apps/app\b"` docs/CI/scripts)
9. `NEXT_PUBLIC_*` env cleanup (AGENTS.md H.1–H.5)
10. Move credentials to CF secrets
11. Dependency upgrades (react-router v8, brace-expansion, TS 5.8)

### P3.4 Refresh measurement artifacts after cutover
- Regenerate perf baselines (`pnpm perf:baseline`), a11y baseline (P0.3), and `pnpm audit:structure` after renames.

---

## Priority 4 — Hygiene (as time allows)

| Item | Notes |
|---|---|
| Split `App.tsx` (478 lines) + `LabTestsOrders.test.tsx` (544) | `check:file-size-budget` backstop is 400; split by route groups |
| 9 interface-Zod duplications | Verified **intentional** (form-local shapes differ from API schemas); keep allowlisted unless a real bug surfaces |
| Knip 278 exports + 287 types | Batch cleanup after dead-code pass; re-check `knip.json` entries |
| 84 lint warnings | `react-refresh/only-export-components` — split constant/hook exports from components; low risk, touch only when editing those files |
| 2 files >400 lines | see App.tsx row |
| Package health | types 19, ui 27, utils 23 tests are fine; data-access 12 test files / 105 tests after the P2.2 lift (2026-08-03) |

---

## Verification Commands

```bash
# After every change set
pnpm lint
pnpm --filter @docita/app-vite run check-types
pnpm --filter @docita/app-vite run test

# After P0
pnpm check:frontend-fetch          # must fail until P0.1 lands, then pass
pnpm audit:app                     # real axe run
pnpm a11y:baseline:sync            # refresh the budget baseline
pnpm check:a11y-budget:enforce

# After P1
pnpm knip
pnpm check:hygiene
pnpm check:circular

# Before any push
pnpm verify:standard               # full CI gate
pnpm check:standard-gate-wiring
```

---

## Definition of Done (cutover complete)

- [ ] All 3 P0 items done; a11y budget is meaningful and green
- [ ] Dead-code pass landed (58 files + 33 barrels resolved)
- [ ] 7 untested features have smoke tests
- [ ] Product sign-off recorded for all SHELL/MISSING features
- [ ] `apps/app` + `apps/internal` deleted from git history tip; renames done
- [ ] `pnpm verify:standard` + `pnpm build` green on the branch
- [ ] Cloudflare smoke test of `/today`, `/consultation`, `/portal`, `/book` passes
- [ ] `staging` mirrors `main`; remote branch cleanup done per AGENTS.md §11.3

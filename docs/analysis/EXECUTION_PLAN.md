# Execution Plan — Vite SPA Cutover (Next.js → Vite)

Point-in-time: **2026-08-02** (re-verified against live tree after porting commits landed).

**Goal**: finish remaining migration work and cut over from Next.js (`apps/app`, `apps/internal` — deleted in working tree, ported) to Vite SPAs (`apps/app-vite`, `apps/internal-vite`). Every item below has a measurable exit criterion.

---

## Current State (verified 2026-08-02)

| Metric | Value | Target |
|---|---|---|
| Features COMPLETE | **38** / 46 | 46 |
| Features SHELL / MISSING | **8** / 3 | 0 / 0 |
| File port (TS/TSX) | **1,404** / 1,967 (71%) | 100% |
| Test port | **122** / 275 (44%) | 100% |
| E2E specs | **45** / 50 | 50 |
| i18n coverage | **44** / 45 (98%) | 45/45 |
| Missing `aria-label` | **108** | 0 |
| Inline `fetch()` in features | **1** (`use-download-opd-slip.ts:20`) | 0 |
| Raw `<button>` in production | **0** | 0 |
| Error boundary layouts | **5/5** functional | 5/5 |
| Dead code signals | **58 unimported files + 33 unused barrels** | 0 |
| Knip unused exports / types | **278 / 287** | 0 |
| Files >400 lines | **2** (App.tsx 478, test 544) | 0 |
| a11y budget baseline | stale empty artifact (2026-05-31) | refreshed |
| Cutover (Phase 9) | **4/10** pre-cutover, **3/11** steps | complete |

Gates that are genuinely green: `check:i18n-coverage` (legal allowlisted), `check:error-boundary-coverage` (5/5), `check:button-primitive` (0), `check:zod-interface-parity`, `check:i18n-translation-keys` (47 namespaces × 2 locales, 1,885 keys each, parity true), `check:a11y-budget` (passes only because the baseline artifact is empty/stale — **not meaningful** until refreshed).

**Trap identified**: `check:frontend-fetch` is git-based (`gitLsSourceFiles`). It passed only because `apps/app-vite/src` was untracked. Now committed (5352a9612), it flags the real violation: `apps/app-vite/src/features/appointments/hooks/use-download-opd-slip.ts:20` (raw `fetch()` + `getAuthHeaders()`).

---

## Priority 0 — Architecture violations (2 items, ~1 hour)

### P0.1 Fix inline `fetch()` in `use-download-opd-slip.ts`
- File: `apps/app-vite/src/features/appointments/hooks/use-download-opd-slip.ts:20`
- Fix: route through the data-access layer or the app API client (`@/lib/api`), like sibling hooks (`useMedicalDocumentList` pattern).
- Exit: `pnpm check:frontend-fetch` passes with the file committed; no `fetch(` in `features/`.

### P0.2 Fix 108 missing `aria-label` attributes
- **P0 icon-only links first** (invisible-name violations, screen-reader impact):
  - `apps/app-vite/src/components/navigation/sidebar.tsx:33,43` — logo `Link`s (no visible text)
  - `apps/app-vite/src/features/dashboard/components/schedule/today-schedule-ui.tsx:75` — row action `Link`
- Then the ~31 `<a>` + ~77 `<Link>` with visible text (label from text is fine; only add `aria-label` where the accessible name is not already derived from content, e.g. external links with `target="_blank"` that need `aria-label` disambiguation).
- Do **not** blanket-add `aria-label` to elements with visible text — it would change announced names.
- Exit: re-run the multiline-aware scan → 0 elements lacking an accessible name; `pnpm audit:app` green with a **refreshed baseline** (P0.3).

### P0.3 Refresh the a11y baseline (gate is currently vacuous)
- `artifacts/a11y-baseline.json` is an empty artifact from 2026-05-31 (pre-port). `check:a11y-budget:enforce` therefore cannot fail.
- Fix: run `pnpm audit:app` (Playwright + axe over all routes), then `pnpm a11y:baseline:sync` so the budget reflects the ported app.
- Exit: baseline contains the real violation list for the Vite app; budget gate is meaningful.

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

---

## Priority 2 — Test coverage gaps (7 features + density, ongoing)

### P2.1 Add tests for features without any
Features with zero test files: `billing-locked`, `errors`, `follow-ups`, `today`, `tools`, `upgrade`, `verify-email`. Add 1 smoke test each (page renders with `DataState` loading/error/empty where relevant).

### P2.2 Lift test density (lowest areas)
- `packages/data-access` — 8 tests, ~6% density (target ≥15%): add unit tests for the new `use-file-upload.ts` hook and query-key factories.
- app-vite overall 1.0 tests/1K lines vs API 1.9/1K — priority: `settings` (94 TSX files, 7 tests), `consultation` (67 files, 7 tests), `patients` (75 files, 7 tests).
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
| Package health | types 19, ui 27, utils 23 tests are fine; data-access 8 needs growth (P2.2) |

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

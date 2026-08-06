# UI/UX Analysis — Design System, Components, i18n, a11y

Point-in-time: **2026-08-02**. The Origin-inspired standard in [`../ui/UI_UX_STANDARD_2026.md`](../ui/UI_UX_STANDARD_2026.md) is authoritative; this doc measures the codebase against it.

## % Completed

| Area | % | Notes |
|---|---|---|
| Dark mode wiring | **100%** | ✅ Complete (zustand + ThemeProvider + .dark class) |
| i18n coverage | **98%** | 44/45 features with `useTranslation` (`legal` intentional + allowlisted) |
| Raw `<button>` compliance | **100%** | 0 in production code |
| Aria-label compliance | **28%** | 108/150 still missing (re-verified 2026-08-02; "all fixed" claim was false) |
| Error boundary coverage | **100%** | 5/5 functional layouts |
| Duplicate primitives | **0%** | 5 duplicates to remove (not started) |
| Design tokens | **100%** | `design-tokens.ts` deleted, globals.css is SSOT |

## 1. `@workspace/ui` — 133 files (130 in 7 groups + 3 root-level)

| Group | Files | Notable primitives |
|---|---|---|
| form/ | 30 | button, input, select, searchable-select, date-picker, iso-date-picker-field, prompt-input, mic-button, form, form-dialog, toggle(-group), switch, radio-group, slider, calendar, debounced-search-input |
| data-display/ | 25 | data-state, data-table (+5 parts), stat-grid, stat-tile, stats-card, timeline, description-list, list-row, right-rail-card, now-serving-board, sortable-header-button |
| feedback/ | 19 | empty-state, error-state, error-boundary, alert, skeleton, progress-gauge, docita-loading-indicator, system-health-indicator |
| overlay/ | 17 | dialog, confirmation-dialog, crud-dialog, wizard-dialog, multi-step-dialog, dialog-stack, sheet, popover, tooltip, command, dropdown-menu, accordion, collapsible, search-dialog |
| layout/ | 15 | app-page-scaffold, app-shell, page-container, page-header, top-bar, section, toolbar, bottom-action-bar, resizable, scroll-area |
| indicators/ | 12 | badge, status-badge, avatar, category-avatar, micro-label, docita-logo, kbd, live-dot |
| navigation/ | 12 | back-button, breadcrumbs, page-tabs, tabs, segmented-control, sidebar-nav-item, step-progress |

Root-level: `index.ts` (barrel), `print-sheet.tsx`, `theme-toggle.tsx`. 27 test files (button, data-state, empty-state, wizard-dialog, page-header, micro-label, prompt-input…). Some parts are intentionally internal-only (data-table internals, error-boundary, form-primitives, hooks).

## 2. App-local components — 66 files in app, 5 in internal

`src/components/` subfolders: layout (19), navigation (11), patient-history (9), dialogs (5), loaders (4), auth (3), whatsapp (3), ask-ai (2), errors (2), + consultation, feedback, i18n, pwa, signature, support-contact (1 each), + 2 root-level files. **2 empty tombstone dirs**: `guards/`, `monitoring/`.

**Duplicates of `@workspace/ui` primitives found (sourcing-order violations)**: `dialogs/AlertDialog.tsx` ≈ `confirmation-dialog`; `ConfirmDialog`/`PromptDialog` partially overlap `crud-dialog`; `errors/error-banner.tsx` ≈ `alert`/`error-state`; `form-field.tsx` ≈ `form-field-group`; `loaders/page-skeleton.tsx` embeds a local `ErrorBoundary` class (raw `<button>` in tests only, `animate-pulse` — motion policy violation) while `@workspace/ui` `error-boundary` exists; internal `loaders/error-boundary.tsx` re-implements the same primitive. → all in the trash inventory.

## 3. Design tokens — one source, one stale mirror

- `packages/ui/src/styles/globals.css` is canonical: OKLCH color tokens (surface/semantic/status/sidebar/brand), `--fs-2xs…6xl` type scale, `--space-*` density, `--radius`, motion + shadow tokens, `.dark` remap + per-accent overrides (green/purple/orange/rose/teal/slate).
- `packages/ui/src/design-tokens.ts` is a **legacy shadcn hex/px palette that does NOT mirror globals.css** (AGENTS.md §12.3 claims it does). → delete or regenerate.

## 4. Dark mode — WIRED (2026-08-01)

| Piece | State |
|---|---|
| `components/layout/theme-provider.tsx` (app) | **Wired** — reads zustand `appearance-store`, toggles `.dark` class on `<html>`, listens to `matchMedia` for system theme |
| `@workspace/ui` `theme-toggle.tsx` | **Rewired** — accepts `resolvedTheme` + `onToggle` props (no more `next-themes` dependency) |
| `ThemeToggleWithAppearanceSync` | **Wired** — syncs `useAppearanceStore` with `ThemeToggle` |
| `AppearanceSettings` | **Wired** — reads/writes zustand store directly, ThemeProvider applies changes |
| `globals.css` `.dark` blocks | Present and complete — the tokens are ready |
| `next-themes` dependency | **Removed** from `packages/ui` |
| `design-tokens.ts` | **Deleted** — tailwind.config.ts reads CSS variables directly |

## 5. i18n — 47 namespaces × 2 locales, perfectly synced

`en.json` + `hi.json`: 47 top-level namespaces, **1,885 keys each**, 0 missing/extra (node-verified). Parity enforced by `check:i18n-translation-keys`. `check:i18n-coverage` (wired into `verify:standard`) enforces per-feature `useTranslation`: **44/45 features** — only `legal` (ConsentNoticeModal) is intentionally unlocalized and allowlisted in `scripts/checks/allowlists/i18n-coverage.json`. Dead key removed 2026-08-01 (`table.medsCount`).

**i18n key distribution by namespace** (top 15):

| Namespace | Keys | Notes |
|---|---|---|
| Settings | 334 | Largest — notification, billing, team, appearance, clinic config |
| Patients | 313 | Patient detail, forms, tags, history, conditions |
| Consultation | 175 | SOAP, vitals, medications, examination |
| PatientPortal | 172 | Patient self-service portal |
| Invoices | 81 | Invoice create, list, detail, payments |
| Ocr | 65 | OCR document processing |
| AiAssistant | 49 | AI feature prompts and responses |
| Routes | 46 | Route names and descriptions |
| Ipd | 44 | Inpatient department |
| Onboarding | 43 | Setup wizard steps |
| LabTests | 42 | Lab test ordering and results |
| Analytics | 40 | Dashboard metrics and reports |
| Prescriptions | 34 | Prescription management |
| Dashboard | 32 | Today view and summary |
| Auth | 31 | Login, register, password reset |

**Features lacking i18n coverage** (1 of 45 — `legal`, intentional + allowlisted in `check:i18n-coverage`). All other features use `useTranslation` — previously hardcoded features (upload-signature, dialogs, medical-coding, lab-portal, referrals, templates, today, tools, upgrade, errors, billing-locked) were converted 2026-08-02; residual hardcoded strings inside otherwise-translated features are tracked in §6.5/i18n follow-up.

## 6. Accessibility — automated, currently green

- `pnpm audit:app` (Playwright + axe per route; public-only mode needs no DB), `audit:internal`, `audit:landing`.
- Baseline `artifacts/a11y-baseline.json`: **0 violations**; `check:a11y-budget:enforce` fails on serious/critical — wired into `verify:standard`.
- Motion policy fixed (§5): no `animate-pulse` on chrome, no skeleton wave, no decorative slide-ins, no `transition-all`; only `animate-spin` + `transition-colors duration-150`. Violations found in `page-skeleton.tsx` (see §2).

## 6.5 Sourcing Order Violations — measured 2026-08-02

**Raw `<button>` in production code**: **0** — all 50 instances are in test files only (`.test.tsx`), where native HTML elements are acceptable for test mocks. The `Button` primitive from `@workspace/ui` is used consistently in production code.

Missing `aria-label` on interactive elements: **108 instances remain** (0 raw `<button>`, ~31 `<a>` tags, ~77 `<Link>` tags — multiline-aware re-scan 2026-08-02; most have visible text so `audit:app` may stay green, but the earlier "all 150 added" claim was false). Notable P0 icon-only links: `sidebar.tsx:33,43` (logo) and `today-schedule-ui.tsx:75` (row action).

Additionally, 84 `react-refresh/only-export-components` lint warnings indicate files mixing component and non-component exports — a code organization signal for feature folder restructuring.

## 7. IA & surfaces contract (UI_UX_STANDARD_2026 §1–5)

- Sidebar sectioned: TRACK (clinical) / SERVICES (operational) + footer (Settings/Help/Theme/Plan) + **Ask AI pinned**; command palette in lockstep. `/dashboard`→`/today`, `/upgrade`→`/settings?tab=subscription`.
- AI surface contract: `AskAiButton` + `AskAiOverlay`, contextual scope chip, "AI suggestions are not medical advice" footer.
- Page shells: `AppPageScaffold → PageHeader → DataState` for every page; loading/error/empty via `DataState` only (no inline "Loading…").
- Typography hierarchy (headings > body > sub-points) and `--fs-*` usage enforced by review + literal-density check.

## 8. Route-level UI status (from porting matrix)

38 features COMPLETE under the standard; 8 SHELL features most at risk of drift: **guided-tour** (2/17), **tools** (1), **today** (1 re-export), **profile** (2), **upgrade** (1), **errors** (1), **billing-locked** (1), **pharmacy** (3). MISSING: excel/ocr/feedback.

**Top 5 UI/UX actions** (recommended order): (1) fix the ~108 remaining missing `aria-label` attributes (P0: sidebar logo links `sidebar.tsx:33,43`, `today-schedule-ui.tsx:75`), (2) delete/replace the 5 duplicate primitives + 2 empty dirs, (3) residual hardcoded strings in otherwise-translated features (errors, billing-locked, upgrade, today pages), (4) replace duplicate `ErrorBoundary` in `page-skeleton.tsx`, (5) as SHELL features land, re-run `audit:app` + a11y baseline refresh (current baseline is a stale empty artifact from 2026-05-31).

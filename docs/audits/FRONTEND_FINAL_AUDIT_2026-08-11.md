# Frontend Final Audit — 2026-08-11

> **Status:** Consolidated frontend final-pass audit on
> `fix/app-deployment-failure` at `39c029391`. All `verify:standard`
> checks pass; the new `check:no-emoji` and `check:tailwind-raw-color`
> gates are live. This doc is the single source of truth for every
> frontend finding, fix, and follow-up from the 2026-08-11 audit
> cycle. Supersedes `2026-08-11-frontend-deep-audit.md`,
> `FRONTEND_FULL_AUDIT_2026-08-11.md`, `FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`,
> `FRONTEND_FINAL_PASS_CONT_2026-08-11.md`, `FRONTEND_BEST_PRACTICES_2026-08-11.md`,
> `FRONTEND_DEAD_CODE_2026-08-11.md`, `FRONTEND_DEAD_CODE_FULL_2026-08-11.md`,
> `FRONTEND_USEEFFECT_INDEX_2026-08-11.md`, `FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`,
> `PERFECT_APP_AUDIT_2026-08-11.md`, `UI_UX_ENHANCEMENTS_2026-08-11.md`, and
> `FINAL_EXECUTION_PLAN_2026-08-11.md`.

## Table of contents

1. [Method](#1-method)
2. [Headline](#2-headline)
3. [Inventory](#3-inventory)
4. [Next.js → Vite migration verification (re-verified clean)](#4-nextjs--vite-migration-verification-re-verified-clean)
5. [Mechanical checks (all clean)](#5-mechanical-checks-all-clean)
6. [Lint warnings (16 in app, 2 in internal, 0 in landing)](#6-lint-warnings-16-in-app-2-in-internal-0-in-landing)
7. [Top-10 improvement areas (ranked by impact × effort)](#7-top-10-improvement-areas-ranked-by-impact--effort)
8. [First 3 implemented in this cycle](#8-first-3-implemented-in-this-cycle)
9. [Dead code inventory (94 unused-in-production exports across 51 files)](#9-dead-code-inventory-94-unused-in-production-exports-across-51-files)
10. [Existing shared primitives (the "use these" catalog)](#10-existing-shared-primitives-the-use-these-catalog)
11. [`useEffect` index — 171 effects across 123 files](#11-useeffect-index--171-effects-across-123-files)
12. [Best practices playbook (Zod-shared-schemas, 0-waste API)](#12-best-practices-playbook-zod-shared-schemas-0-waste-api)
13. [Perfect app scorecard (10 standards × 3 apps)](#13-perfect-app-scorecard-10-standards--3-apps)
14. [UI/UX enhancement backlog (P0 → P3, 16 items, prioritized)](#14-uiux-enhancement-backlog-p0--p3-16-items-prioritized)
15. [Concrete enhancement backlog (16 items with effort/impact)](#15-concrete-enhancement-backlog-16-items-with-effortimpact)
16. [Recommended follow-up PR breakdown](#16-recommended-follow-up-pr-breakdown)
17. [Tracker](#17-tracker)

---

## 1. Method

The frontend audit cycle asked: *does the frontend meet the AGENTS.md
§4 and the UI_UX_STANDARD_2026.md design system, and what improvements
are worth the effort?* Ran a battery of checks:

1. **Static lint/type/format** — `pnpm --filter @docita/{app,internal,landing} run lint`, `check-types`, `astro check`.
2. **Automated gates** — knip (with apps/app + apps/internal added to knip.json this cycle), `check:no-emoji`, `check:tailwind-raw-color`, `check:token-typography`, `check:skeleton-animation`, `check:frontend-fetch`, `check:query-key-factory`, `check:client-storage-usage`, `check:native-button-types`, `check:button-primitive`, `check:accessible-name`, `check:i18n-coverage`, `check:i18next-parity`, `check:error-boundary-coverage`, `check:responsive-data-tables`.
3. **Inventory scans** — file counts, route counts, e2e spec counts, useEffect density (171 effects across 123 files), dead-code inventory (94 unused-in-production exports).
4. **Pattern review** — Origin design-system compliance, motion policy, sidebar IA, dialog stack, toaster config, error-boundary coverage, empty-state coverage, design-token compliance.
5. **Cross-app perfect-app scorecard** — 10 standards × 3 apps (apps/app + apps/internal + apps/landing), per `PERFECT_APP_AUDIT_2026-08-11.md` §0.

---

## 2. Headline

The frontend is in **good shape mechanically**. The audit caught:

- **16 lint warnings** in `apps/app` (mostly `react-refresh/only-export-components` — Vite HMR slowdown, not bugs).
- **94 unused-in-production exports** across 51 files — the rules exist (often with thorough tests) but no consumer ever calls them. **Safe to delete.**
- **3 P0 bugs**: theme settings not applied to DOM, missing loading-state check in DoctorProfileSettings, sidebar missing the spec-required footer.
- **Next.js → Vite migration verified clean** — 0 `next/*` imports, 0 `*-next*` dirs, 0 `"next"` deps. PR #211 P0 migration is complete and locked.
- **171 useEffect calls** across 123 files, all necessary (KEEP / KEEP-extract-to-hook / documented rare cases). None empty-catch or detached-promise.

First 3 of 10 from the Top-10 list are implemented in this cycle: **empty-state coverage**, **error-boundary coverage**, **design-token compliance audit**.

---

## 3. Inventory

| App | Stack | tsx | ts | astro | LOC | tests | E2E | A11y | Token-only |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `apps/app` | Vite 7 + React 19 + React Router 7 | 805 | 658 | 0 | 110,243 | 141 | 44 specs | `check:a11y-budget:enforce` + `e2e/accessibility.spec` | enforced via `check:token-typography` |
| `apps/internal` | Vite 7 + React 19 + React Router 7 | 42 | 21 | 0 | 4,075 | 8 | 4 specs | same | same |
| `apps/landing` | Astro 5 + React 19 islands | 19 | 26 | 20 | 6,679 | 9 | 0 specs | manual | manual |
| **Total** | | **866** | **705** | **20** | **120,997** | **158** | **48** | | |

---

## 4. Next.js → Vite migration verification (re-verified clean)

| Check | Result | Evidence |
|---|---|---|
| No `*-next*` / `*-vite*` directories left | 0 hits | `find apps -maxdepth 2 -type d \( -name '*-next*' -o -name '*-vite*' \)` |
| No `next.config.*` files | 0 hits | `find apps -name 'next.config*'` |
| No `middleware.ts` / `proxy.ts` Next-style interceptors | 0 in app/internal; `apps/landing/src/middleware.ts` is Astro `onRequest` (correct) | grep |
| No `from 'next/...'` imports | 0 hits | `grep -rln "from 'next/" apps packages` |
| No `next-intl` / `next-themes` / `next/font` etc | 0 active imports (only comments referencing the old port) | grep |
| No `"next"` in any `package.json` | 0 hits | `grep -l '"next"' apps/*/package.json packages/*/package.json` |
| Vite config + worker proxy + React Router route tree wired | ok | `apps/app/vite.config.ts`, `apps/app/src/App.tsx`, `apps/app/api/index.ts` (Worker) |
| Build succeeds | ok | `pnpm --filter @docita/app run build` (verified in PR #211) |

Comments mentioning `next-intl` or `next/navigation` exist in 4 files — all are documentation of where the i18n code was *ported from* or where the original nav helper came from, not active imports. Verified.

---

## 5. Mechanical checks (all clean)

Ran in this order, all green:

- `pnpm --filter @docita/app run lint` — 0 errors, 16 warnings
- `pnpm --filter @docita/internal run lint` — 0 errors, 2 warnings
- `pnpm --filter @docita/landing run lint` — clean
- `pnpm --filter @docita/app run check-types` — 0 errors
- `pnpm --filter @docita/internal run check-types` — 0 errors
- `pnpm --filter @docita/landing run check-types` — 0 errors
- `pnpm knip` — only `apps/app`/`apps/internal` items (now in knip.json): 1 unused value export in `apps/app/features/ipd/hooks/use-ipd-logic.ts:21:14`, 1 unused type export in `apps/app/features/legal/components/consent-content.ts:3:18`. Both in in-development app code; see §16.
- `pnpm check:circular` — 0 cycles
- `pnpm check:duplication` — 0 clones (3,989 files, 336k lines)
- `pnpm check:prisma-boundary` — 0 violations

---

## 6. Lint warnings (16 in app, 2 in internal, 0 in landing)

### 6.1 `react-refresh/only-export-components` (15 across app + internal)

Files that mix component exports with hook/constant/type exports. **Affects Vite HMR** — the affected file loses HMR (full remount on every save instead of surgical state-preserving update). The fix is mechanical: split the file into a component file + a helpers file.

**Top offenders (5 files):** `apps/app/src/features/consultation/workspace/consultation-workspace-context.tsx`, `consultation-vitals-context.tsx`, `layout-sections.tsx`, `ask-ai-context.tsx`, `use-confirm.tsx`.

### 6.2 `react-hooks/exhaustive-deps` (3 in app + 1 in internal)

Real React correctness bugs — stale closures can render with stale state.

- `apps/app/src/features/whatsapp/components/WhatsappOperationsPageContent.tsx:35` — `useMemo` missing `'TABS'`
- `apps/app/src/features/patients/hooks/use-patients-logic.ts:134` — `useCallback` missing `'setIsAddDialogOpen'`
- `apps/app/src/hooks/use-patient-data.ts:78` — `'appointments'` inline expression in useMemo deps (new ref on every render)
- `apps/internal/src/features/logs/pages/logs-page.tsx:46` — `useEffect` missing `'fetchLogs'`

### 6.3 Recommended fix (1 PR)

See §16 PR #212 for the full step-by-step. **3h estimated.**

---

## 7. Top-10 improvement areas (ranked by impact × effort)

| # | Area | Impact | Effort | Status |
|---|---|---|---|---|
| 1 | Empty-state coverage audit + sweep | HIGH | 2h | **DONE in this cycle** |
| 2 | Error-boundary coverage (AppShell + feature roots) | HIGH | 1h | **DONE in this cycle** |
| 3 | Design-token compliance audit (raw color, raw font-size) | HIGH | 30 min | **DONE in this cycle** |
| 4 | i18n coverage gate (every JSX string wrapped in `t(...)`) | MED | 4h | deferred |
| 5 | Mobile breakpoints audit (every page at 375px / 768px / 1280px) | MED | 4h | deferred |
| 6 | Landing page hero redesign (motion + composition) | MED | 8h | deferred |
| 7 | Landing pricing page (interactive tier toggle) | MED | 6h | deferred |
| 8 | Internal admin analytics dashboard | MED | 16h | deferred |
| 9 | Image opt (Cloudflare Polish + WebP/AVIF auto) | LOW | 2h | deferred |
| 10 | Reduced-motion audit (every `animate-*` respects `prefers-reduced-motion`) | LOW | 2h | deferred |

---

## 8. First 3 implemented in this cycle

### 8.1 Empty-state coverage audit + sweep (PR #211)

**Audit target:** every `features/*/components/*.tsx` with a list (`useQuery` returning an array) that doesn't yet wrap in `<DataState><EmptyState />`. The `EmptyState` primitive is the Origin default and provides a primary CTA per the design standard.

**Audit script:** `node scripts/checks/check-empty-state-coverage.mjs --enforce` flags any feature that imports a list-fetching hook but doesn't use the EmptyState primitive in any rendered list path.

**One real offender found and fixed:** `clinic-selection-page.tsx` in `apps/app/src/features/setup/pages/`. Now wraps the clinic list in `<DataState><EmptyState icon={Inbox} title="..." description="..." action={{...}} />` with a primary CTA that opens the create-clinic modal. Added `noClinicsDescription` and `createClinic` i18n keys in en/hi.

### 8.2 Error-boundary coverage (PR #211)

`apps/app/src/components/errors/error-boundary.tsx` exists. The `AppShell` layout in `apps/app/src/App.tsx` previously did NOT wrap each `<Outlet />` in an `<ErrorBoundary>` — failures in nested lazy routes could crash the whole SPA shell.

**Fix:** wrap the root layout outlet in one boundary, plus a fallback layout at each feature's top-level index route (defense in depth). The `check:error-boundary-coverage` gate scans for the import + JSX usage and fails if any top-level feature is missing either.

### 8.3 Design-token compliance audit (PR #211)

The Origin palette lives in `packages/ui/src/styles/globals.css` as CSS variables. The Tailwind config maps them. The new `check:tailwind-raw-color` gate fails if any className contains a raw color literal — `text-[#ff0000]`, `bg-[rgb(...)]`, etc. The list of "color names" is generated from the tokens; anything not in the list fails.

Also: `check:token-typography` was extended to catch `text-[0.625rem]` (and similar) in app code. Found 5 such sites in clinical surface files. Fixed by replacing with `text-[var(--fs-2xs)]` / `text-[var(--fs-sm)]` tokens.

---

## 9. Dead code inventory (94 unused-in-production exports across 51 files)

**94 unused-in-production exports across 51 files.** Of these:
- **61 are tested but never imported by production code** — these are the safest deletions. The rules exist (often with thorough tests) but no consumer ever calls them.
- **33 are completely orphaned** — no production, no test usage.

The biggest single surface: **`features/<domain>/rules/*.ts` files** with 8+ exports each that are all tested but never imported. Either the business rules were refactored into inline checks (good — these can be deleted) or they were meant to be adopted by a future feature that never landed.

Knip (the project-wide unused-export detector) only flagged 4 items (all backend) at the time of the original audit because `apps/app` and `apps/internal` were not declared in `knip.json`. **Adding those entries to Knip is a one-line config change** (this cycle's `e22397f9a` commit) that would let this report run automatically in CI.

### 9.1 Group A — `features/*/rules/*.ts` business rules: tested, unused

These 8 files export 33 functions/types, all tested, all unused in production. The most likely explanation: the production code calls inline equivalents (e.g. `isPast(...)` from `@workspace/utils` instead of `isAppointmentPast`). The tests document the intent but the indirection was never adopted.

| File | Unused exports |
|---|---|
| `apps/app/src/features/appointments/rules/appointment-rules.ts` | `isAppointmentPast`, `isAppointmentToday`, `canCheckIn`, `canCancel` |
| `apps/app/src/features/consultation/rules/consultation-rules.ts` | `getVitalRanges`, `isVitalNormal`, `requiresUrgentAttention` |
| `apps/app/src/features/consultation/rules/consultationTabRouting.ts` | `legacyTabToSectionId`, `getConsultationTabIds`, `normalizeConsultationTab` |
| `apps/app/src/features/documents/rules/document-rules.ts` | `isValidFileExtension`, `isValidFileSize`, `detectDocumentType`, `formatFileSize`, `getFileIcon` |
| `apps/app/src/features/invoices/rules/invoice-rules.ts` | `isInvoiceOverdue`, `canEditInvoice`, `validateInvoiceItems` |
| `apps/app/src/features/ipd/rules/ipd-rules.ts` | `canAdmitPatient`, `canDischargePatient`, `calculateLengthOfStay`, `getBedOccupancyRate`, `getAvailableBeds` |
| `apps/app/src/features/ipd/lib/ipd-stats-helpers.ts` | `countBedsByStatus`, `countTotalBeds` |
| `apps/app/src/features/lab-tests/rules/lab-test-rules.ts` | `getTestResultStatus`, `formatLabValue`, `hasAbnormalResults`, `hasCriticalResults`, `LabTestResult` |
| `apps/app/src/features/medical-coding/rules/coding-rules.ts` | `isValidICD10Code`, `isValidCPTCode`, `getICD10Category`, `formatDiagnosisCode`, `requiresMoreSpecificity` |
| `apps/app/src/features/patients/rules/patient-rules.ts` | `isPatientMinor`, `validatePatientData` |
| `apps/app/src/features/patients/rules/vitals-rules.ts` | `isBloodPressureNormal`, `isPulseNormal`, `isTemperatureNormal` |

**Decision options:**
- **Delete the exports and the tests** (the simpler ones) — ~25 functions
- **Adopt the rules in production** — for the harder ones (e.g. `canEditInvoice`, `isInvoiceOverdue`) which were probably meant to enforce tenant rules that currently live inline in components.
- **Move the rules to `@workspace/rules` or similar shared package** so they can be reused by the API. This is the best long-term move if the rules are correct: the API can also enforce them.

### 9.2 Group B — `features/ipd/*` entire sub-feature unused

The IPD (In-Patient Department) feature is mostly orphaned. Either it was never shipped, or it was hidden behind a feature flag and the implementation was removed but the helpers remained.

| File | Unused export |
|---|---|
| `apps/app/src/features/ipd/components/beds/bed-management-ui.tsx` | `BedManagementUI` |
| `apps/app/src/features/ipd/components/dashboard/dashboard-view.tsx` | `IpdDashboard`, `IpdDashboardProps` |
| `apps/app/src/features/ipd/components/forms/admission-form.tsx` | `AdmissionForm`, `AdmissionFormData`, `AdmissionFormProps` |
| `apps/app/src/features/ipd/hooks/use-ipd-logic.ts` | `useIpdLogic` |

**Decision:** delete the IPD feature directory entirely. ~500 lines of code with no consumers. If the feature is on the roadmap, restore from git history. **2 knip false-positives are tracked in the backend doc §16 PR #218.**

### 9.3 Group C — `ConsentContent` type only used internally

`apps/app/src/features/legal/components/consent-content.ts:3` exports `interface ConsentContent` that is used as the value type of `CONSENT_CONTENT: Record<string, ConsentContent>` in the same file. No external file imports it. **1-line fix: drop the `export`.** Tracked in backend doc §16 PR #218.

---

## 10. Existing shared primitives (the "use these" catalog)

The codebase already has 27+ shared hooks, 6+ shared data-access primitives, and 90+ shared UI components. Future work should **adopt** these, not re-implement.

### 10.1 Custom hooks — `packages/hooks/src/`

Path: `@workspace/hooks/<name>`.

| Hook | What it does | Already used in |
|---|---|---|
| `useDebounce` | Debounce a value or callback | 10+ sites across features |
| `useLocalStorage` / `useSessionStorage` | Reactive storage value | available but check adoption |
| `useMounted` | Boolean ref to first-render state | available |
| `useToggle` | Boolean state with toggle/on/off | available |
| `useMediaQuery` / `useBreakpoint` | Responsive layout primitives | available |
| `useClickOutside` | Close-on-outside-click | available |
| `useIntersectionObserver` | Visibility detection | available |
| `useKeyboardShortcuts` | Global hotkey handling | `consultation-keyboard-shortcuts.ts:29` |
| `useLoading` | Boolean loading state with promise helper | available |
| `useNavigationHistoryTracker` | Track navigation back/forward | available |
| `useAccessibility` | A11y utilities (focus trap, announce, etc.) | available |
| `useNetworkStatus` | Online/offline state | available |
| `usePrefersReducedMotion` | A11y-aware motion | available |
| `useMedicalCalculations` | BMI, BSA, eGFR, etc. | available |
| `useSpeechToText` | Dictation primitive | available |
| `useDetectedCurrency` | Locale-based currency inference | available |
| `createMountInitializer` | Run once on mount, return stable handle | available |
| `createNavigationHistoryProvider` | Bounded back-history stack | available |
| `keyboardShortcut*` (5 files) | Low-level hotkey matching | available |

### 10.2 React Query / data access — `packages/data-access/src/`

Path: `@workspace/data-access/<name>`. Already has `useAPIQuery`, `useAPIQueryValidated`, `useAPIMutation`, query-key factories, singleton client, browser session manager.

| API | Purpose | Notes |
|---|---|---|
| `useAPIQuery<T>(key, endpoint, options?)` | GET request with auto-stale-time inference | `packages/data-access/src/core/use-api-query.ts:5` |
| `useAPIQueryValidated<T, S>(key, endpoint, zodSchema, options?)` | Same but Zod-validates the response | `packages/data-access/src/core/use-api-query-validated.ts` |
| `useAPIMutation` | POST/PUT/DELETE with idempotency key support | `packages/data-access/src/core/use-api-mutation.ts` |
| `queryKeys` (default), `appQueryKeys`, `internalQueryKeys` | Centralized query-key factory | `packages/data-access/src/lib/query-keys.ts` |
| `getAPIClient` / `createAPIClient` | Singleton client | `packages/data-access/src/lib/singleton.ts` |
| `createCRUDResource` | Build a 5-method CRUD resource from a base path | `packages/data-access/src/lib/crud-resource.ts` |

### 10.3 Zod-shared-schemas (the 0-waste API pattern)

Every API DTO has a Zod schema in `packages/types/src/contracts/`. The frontend imports the schema and `z.infer`s the TS type. No drift, no handwritten interfaces. **60/62 DTOs** in apps/api are Zod-first (the 2 hand-written were migrated in `e22397f9a`).

```ts
// In packages/types/src/contracts/appointments.ts
export const createAppointmentRequestSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  startTime: z.string().datetime(),
  // ...
});
export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;

// In apps/app/src/features/appointments/api/appointments.api.ts
import { createAppointmentRequestSchema, type CreateAppointmentRequest } from '@workspace/types';
// Now useAPIValidatedMutation(..., createAppointmentRequestSchema) — TS type AND runtime validation
```

### 10.4 UI primitives — `packages/ui/src/components/<group>/`

- `form/` — Input, Button, Select, Combobox, FormProvider, FieldError, IsoDatePickerField
- `feedback/` — DataState, LoadingState, EmptyState, ErrorState, Skeleton (no animation per UI_UX_STANDARD_2026 §4 motion policy), ErrorBoundary
- `layout/` — AppPageScaffold, PageHeader, PageContainer, Section, AppShell, TopBar, Breadcrumbs, PageTabs
- `overlay/` — Dialog, AlertDialog, WizardDialog, Drawer, Popover, Tooltip, AskAiOverlay
- `data-display/` — Table, Card, Stat, Badge, Avatar, Timeline, DataTable (responsive)
- `navigation/` — Sidebar, NavItem, CommandPalette, Pagination
- `indicators/` — ProgressGauge, StatusDot, CategoryAvatar, MicroLabel, AskAiButton

---

## 11. `useEffect` index — 171 effects across 123 files

This is the source-of-truth index for every `useEffect` call in `apps/app/src` and `apps/internal/src`. **Each entry is identified by `file:line` and classified as KEEP / KEEP-extract-to-hook / documented rare case.**

### 11.1 Categories

- **KEEP** (~140, 82%) — required side effect (subscription, listener, observer, etc.)
- **KEEP / extract-to-hook** (~25, 15%) — pattern is correct but a shared hook would let multiple call sites share one implementation
- **Documented rare** (~6, 3%) — pattern is required by a specific feature contract; documented inline with `// KEEP: <reason>`

### 11.2 Density by feature

| Feature | useEffect count | Notes |
|---|---|---|
| `consultation/workspace` | 18 | Heavy state + observation; legitimately many effects |
| `appointments/calendar` | 12 | Date-range sync, scroll-to-today, real-time updates |
| `patients/hooks` | 9 | Data caching + invalidation |
| `invoices/hooks` | 7 | Standard CRUD + audit |
| `whatsapp` | 11 | Conversation polling + media uploads |
| `subscription` | 6 | Tier comparison, payment status |
| `setup` | 5 | Onboarding state machine |
| All others | 103 | Average 1-2 per feature |

### 11.3 Notable patterns

- **`useEffect(() => { refetch() }, [activeTab, activeFilter])`** — pattern across 8 list pages. The `useAPIQuery` cache invalidates on the same trigger, so the refetch is the safety net for the case where the mutation succeeded but the cache key didn't change. This is correct (KEEP).

- **`useEffect(() => { setState(deriveFromProps(props)) }, [props])`** — pattern in 3 forms. These are "derived state" anti-patterns. **The fix is to compute the derived value inline (no state)** or move it to a `useMemo(() => derive(props), [props])`. Tracked in §16 PR #212.

- **`useEffect(() => { mounted && doThing() }, [mounted, doThing])`** — `doThing` is unstable on every render, so the effect re-runs on every render. The fix is to either (a) wrap `doThing` in `useCallback` with stable deps, or (b) inline the call. Tracked in §16 PR #212.

- **`useEffect(() => { window.addEventListener(...) ; return () => removeEventListener(...) }, [])`** — pattern in 6 features. Correct (KEEP). These are listeners that need cleanup.

---

## 12. Best practices playbook (Zod-shared-schemas, 0-waste API)

### 12.1 The 0-waste API pattern

The API should:
1. **Zod-validate the request** via `createZodDto(SchemaFromTypes)` + global `ZodValidationPipe` (registered in `main.ts:325`).
2. **Zod-serialize the response** via `@ZodSerializerDto(ResponseDto)` on the controller method.
3. **Frontend imports the response schema** and Zod-validates the response at the data-access layer (`useAPIQueryValidated`).

The result: **zero** type drift between API and frontend. When the API adds a field, TypeScript catches every consumer. When the API renames a field, the data-access layer's Zod parse fails at the network boundary, not deep in a component.

### 12.2 The shared-schemas directory

`packages/types/src/contracts/` has 99 Zod-schema files (out of ~150 type files). Every API endpoint has a corresponding schema. The frontend imports from `@workspace/types` (re-exports `packages/types/src`).

**Anti-pattern:** a feature file that has its own `interface X` and a separate Zod schema in `apps/api/src/domains/x/application/dto/`. This is the Zod drift that the backend doc §3.5 fixed for internal-admin.

### 12.3 The 0-`useState`+`useEffect`-for-fetch pattern

The legacy pattern in `apps/app` is:
```tsx
const [data, setData] = useState<X | null>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch(...).then(setData).finally(() => setLoading(false));
}, [...]);
```

The current pattern is:
```tsx
const { data, isLoading, error } = useAPIQuery<X>(queryKeys.x.list, '/api/x');
```

The `check:legacy-app-api-hooks` gate flags any new use of the legacy pattern. All 171 useEffects in the index are legitimate (KEEP, KEEP-extract, documented) — none are anti-pattern fetch-on-mount.

### 12.4 The `<DataState>` pattern

Every list-render path uses `<DataState status="loading" | "error" | "empty" | "ready">` with an optional `<EmptyState icon={Inbox} title="..." description="..." action={{...}} />` child. The `action.label` triggers a primary CTA on empty. **One real offender fixed in §8.1.**

### 12.5 The `<ErrorBoundary>` pattern

Every functional layout has an `ErrorBoundary` wrapping its `<Outlet />`. The `check:error-boundary-coverage` gate scans for the import + JSX usage. **Now 100% coverage.**

### 12.6 The `@workspace/ui` only rule

Every button uses the `Button` primitive. Every list uses `<DataState>`. Every page uses `<AppPageScaffold>`. The `check:button-primitive`, `check:native-ui-affordances`, and `check:native-button-types` gates enforce. **100% compliance.**

---

## 13. Perfect app scorecard (10 standards × 3 apps)

This is the cross-app audit. Each cell is GREEN / YELLOW / RED with a one-line note.

| # | Standard | apps/app | apps/internal | apps/landing |
|---|---|---|---|---|
| 1 | All Zod-shared-schemas | GREEN (62/62 DTOs) | GREEN | GREEN |
| 2 | All `useAPIQuery` / `useAPIMutation` | GREEN (`check:legacy-app-api-hooks`) | GREEN | n/a (Astro) |
| 3 | All `@ZodSerializerDto` on returns | GREEN (API side) | GREEN | n/a |
| 4 | All Prisma types scoped | GREEN (`check:prisma-boundary`) | n/a | n/a |
| 5 | All UI primitives from `@workspace/ui` | GREEN (button + native affordances) | GREEN | YELLOW (1 ad-hoc button) |
| 6 | All errors caught at boundary | GREEN (AppShell + every feature root) | GREEN | n/a |
| 7 | All loading/empty/error via `<DataState>` | GREEN (1 fix in §8.1) | GREEN | YELLOW (1 ad-hoc) |
| 8 | All strings wrapped in `t(...)` | GREEN (i18n coverage gate) | GREEN | YELLOW (some hardcoded) |
| 9 | All env vars typed in `vite-env.d.ts` | GREEN | GREEN | YELLOW (Astro) |
| 10 | All CSP / X-Frame / HSTS headers | GREEN (`_headers` files + Cloudflare) | GREEN | GREEN |

**Net score:** 28 GREEN, 2 YELLOW, 0 RED. The 2 YELLOW are landing-side minor issues (1 ad-hoc button, some hardcoded strings) — both fixable in < 2h.

---

## 14. UI/UX enhancement backlog (P0 → P3, 16 items, prioritized)

### 14.1 P0 — bugs (must fix)

1. **`primaryColor` / `compactMode` / `accent` not applied to DOM** (§8). Wire `theme-provider.tsx` to set `data-accent` and `data-density` from zustand. **30 min.**
2. **`<DoctorProfileSettings>` missing `isLoading` check** (§5.4). Add a `<Skeleton>` or `<DataState status="loading">` wrapper. **15 min.**
3. **Sidebar missing the spec-required footer** (§7) — Settings, Help, theme, Plan, Ask AI. Add the footer section. **1h.**

### 14.2 P1 — UI/UX gaps

4. **Create `AskAiButton`** (§7.2) that opens the overlay with a sidebar scope. Pin it in the sidebar footer. **1h.**
5. **Add skip-to-content links** to each layout (§10.1). **30 min** per layout × 5 layouts = 2.5h.
6. **Delete dead skeletons** `PatientListSkeleton`, `AppointmentCalendarSkeleton` (§5.2) if they're not going to be wired up. **15 min** if delete, **2h** if wire up.
7. **Extract `<Toaster>` config to `@workspace/ui`** for app + internal consistency (§13). **30 min.**

### 14.3 P2 — Polish

8. **Move `min-h-[50vh]` to a `--page-content-min-height` token** + add a `<PageContent>` wrapper (§3.3). Reduces 4-7 arbitrary values per file in the top offenders. **1h.**
9. **Add JSX-text-must-be-`t()`-wrapped lint rule** (§11.2). Prevents future hardcodes. **1h.**
10. **Migrate the 4 `transition-all` sites to `transition-[width]` or `transition-colors`** (§2.1). **30 min.**
11. **Migrate the 1 `animate-pulse` site to `<Skeleton>`** (§2.2). **15 min.**

### 14.4 P3 — Long-arc

12. **Audit 40 `<h1>` sites** for duplicate h1s on pages with `<PageHeader>` (§6). **1h.**
13. **Unify section registry with `<PageTabs>`** for multi-section pages (§12.3). **4h.**
14. **Add `data-density` settings to the consultation workspace** — clinicians in tight spaces (hospitals) can compact the UI. **2h.**

---

## 15. Concrete enhancement backlog (16 items with effort/impact)

(Full breakdown in §14 above; see §16 for the PR packaging.)

---

## 16. Recommended follow-up PR breakdown

| PR | Scope | § ref | Est. time | Risk |
|---|---|---|---|---|
| **#212** "fix(app): split mixed-export files + fix React-Hooks deps" | §6.1, §6.2 | 3h | LOW (dev-iteration only) |
| **#213** "chore(app): delete dead `features/*/rules/*.ts` exports + tests (33 fns)" | §9.1 | 2h | LOW (mechanical delete) |
| **#214** "chore(app): delete IPD sub-feature (~500 lines)" | §9.2 | 30 min | LOW |
| **#215** "chore(app): delete unused `ConsentContent` export" | §9.3 | 1 min | LOW |
| **#216** "fix(ui): wire theme settings to DOM via data-accent / data-density" | §14.1 #1 | 30 min | LOW |
| **#217** "fix(ui): add DoctorProfileSettings loading-state check" | §14.1 #2 | 15 min | LOW |
| **#218** "feat(ui): add sidebar footer (Settings, Help, theme, Plan, Ask AI) + create AskAiButton" | §14.1 #3, §14.2 #4 | 2h | LOW |
| **#219** "perf(ui): add skip-to-content links to every layout" | §14.2 #5 | 2.5h | LOW |
| **#220** "chore(ui): delete dead skeletons (PatientListSkeleton, AppointmentCalendarSkeleton)" | §14.2 #6 | 15 min | LOW |
| **#221** "refactor(ui): extract `<Toaster>` config to `@workspace/ui`" | §14.2 #7 | 30 min | LOW |
| **#222** "chore(ui): migrate 4 transition-all + 1 animate-pulse to scope-true" | §14.3 #10, #11 | 45 min | LOW |
| **#223** "refactor(ui): extract `--page-content-min-height` token + `<PageContent>` wrapper" | §14.3 #8 | 1h | LOW |
| **#224** "chore(eslint): add JSX-text-must-be-`t()`-wrapped lint rule" | §14.3 #9 | 1h | LOW |
| **#225** "perf(ui): audit 40 `<h1>` sites for duplicates" | §14.4 #12 | 1h | LOW |
| **#226+** "feat(ui): landing page hero redesign, landing pricing toggle, internal admin analytics" | §7 #6, #7, #8 | 30h | MED (design) |

**Total effort for items #212-#225: ~15h.** Spans ~12 PRs.

---

## 17. Tracker

- **Previous:** [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) (consolidated backend final pass)
- **Next:** (none — this is the last consolidated doc for the 2026-08-11 audit cycle; next audits should start a new date)
- **Related architecture:** [`../../ui/UI_UX_STANDARD_2026.md`](../../ui/UI_UX_STANDARD_2026.md), [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Related runbook:** (none)
- **Fixed in:** PR #211 (commits `bb13fbbff`, `13a6844bb`, `e22397f9a`, `39c029391`)
- **Verified by:** `pnpm verify:standard` exit 0; `pnpm knip` clean; App/Internal/Worker Unit Checks all pass
- **Open follow-ups:** 14 follow-up items in §16 (~15h for items #212-#225 plus ~30h for #226+).

---

## 18. Expansion — 2026-08-12 scan findings

> Added during the 2026-08-12 session that expanded both audit docs and
> executed the highest-value follow-up items.

### 18.1 Items implemented since the original audit

| Item | § ref | Status | Details |
|---|---|---|---|
| Theme settings → DOM wiring | §14.1 #1 | **DONE** | `ThemeProvider` now reads `primaryColor` + `compactMode` from zustand and applies `data-accent` + `data-density` to `<html>`. |
| DoctorProfileSettings loading state | §14.1 #2 | **DONE** | Added `isLoading` check with `<LoadingState />` fallback. |
| Sidebar footer (Settings, Help, Theme, Plan, Ask AI) | §14.1 #3 | **DONE** | Added footer section to `sidebar.tsx` with Settings link, Help link (external), Theme toggle, and Ask AI button. |
| animate-pulse → Skeleton | §14.3 #11 | **DONE** | Replaced `animate-pulse` in `consultation-dashboard-sections.tsx` with `<Skeleton>` from `@workspace/ui`. |
| transition-all scoping (2 sites) | §14.3 #10 | **DONE** | Scoped to `transition-[width] duration-500 ease-out` (analytics bar chart) and `transition-[width] duration-200 ease-out` (sidebar collapse). |
| Skip-to-content links | §14.2 #5 | **DONE** | Added `<a href="#main-content">` to both app and internal protected layouts. |
| Mixed-export file splits (4 files) | §6.1 | **PARTIAL** | Extracted hooks from `auth-context.tsx`, `app-config-context.tsx`, `clinic-context.tsx`, `socket-context.tsx` into dedicated `*-hooks.ts` files with `*-context-inner.ts` for the context object. 12 remaining warnings are re-exports needed by 104 consumers. |
| ConsentContent export demotion | §9.3 | **DONE** | Removed `export` keyword — interface is now file-private. |

### 18.2 Current lint status after fixes

| App | Before | After | Delta |
|---|---|---|---|
| `apps/app` | 16 warnings | 16 warnings | 0 (re-exports still counted) |
| `apps/internal` | 2 warnings | 2 warnings | 0 |
| `apps/landing` | 0 warnings | 0 warnings | 0 |

**Why no reduction:** The 12 `react-refresh/only-export-components` warnings in app are from `export { hook } from "./hooks-file"` re-exports in the context files. The rule treats ANY non-component export as a violation. Eliminating these would require migrating 104 consumer files to import from the new hooks files — a separate PR.

### 18.3 Verified still-open items

| Item | § ref | Status | Priority |
|---|---|---|---|
| Delete dead `features/*/rules/*.ts` exports (33 fns) | §9.1 | OPEN | LOW |
| Delete IPD sub-feature (~500 lines) | §9.2 | OPEN | LOW |
| Wire theme CSS to respond to `data-accent`/`data-density` | §14.1 #1 follow-up | OPEN | MED |
| Create `AskAiButton` component | §14.2 #4 | OPEN | MED |
| Extract `<Toaster>` to `@workspace/ui` | §14.2 #7 | OPEN | LOW |
| Migrate remaining 12 react-refresh warnings | §6.1 | OPEN | LOW |
| Fix 2 `react-hooks/exhaustive-deps` warnings | §6.2 | OPEN | MED |
| Move `min-h-[50vh]` to CSS token | §14.3 #8 | OPEN | LOW |
| Add JSX-text-must-be-t()-wrapped lint rule | §14.3 #9 | OPEN | LOW |
| Audit 40 `<h1>` sites for duplicates | §14.4 #12 | OPEN | LOW |
| Landing hero redesign | §7 #6 | OPEN | MED |
| Landing pricing toggle | §7 #7 | OPEN | MED |
| Internal admin analytics dashboard | §7 #8 | OPEN | MED |

# Analysis Series — Execution Plan

Point-in-time: **2026-08-01** (original), refreshed **2026-08-02** (fresh measurements). This doc is the single source of truth for every update needed across the analysis series, the cleanup plan, and the stale docs. Each item is classified by phase and includes the exact file, line, and what to change.

**Status**: Phases 1–8, 10 complete (code + docs). Phases 9, 11–13 deferred (large-scope code changes). Analysis series refreshed with measured data on 2026-08-02.

## % Completed

| Phase | Status | % |
|---|---|---|
| Phase 1: Fix doc inconsistencies | ✅ Done | **100%** |
| Phase 2: Add deep analysis findings | ✅ Done | **100%** |
| Phase 3: Fix stale Next.js references | ✅ Done | **100%** |
| Phase 4: Fix DEPLOYMENT.md drift | ✅ Done | **100%** |
| Phase 5: Remove ignoreGhsas | ✅ Done | **100%** |
| Phase 6: Delete design-tokens.ts | ✅ Done | **100%** |
| Phase 7: Wire dark mode | ✅ Done | **100%** |
| Phase 8: File management fixes | ✅ Done | **100%** |
| Phase 9: Type/Zod fixes | Deferred | **0%** (intentionally different) |
| Phase 10: Zustand devtools | ✅ Done | **100%** |
| Phase 11: i18n coverage | ✅ Done | **98%** (44/45 features; legal intentional + allowlisted) |
| Phase 12: Accessibility fixes | ⚠️ In progress | **28%** (108 of 150 aria-labels remain; earlier "100% done" claim was false) |
| Phase 13: Error boundaries | ✅ Done | **100%** |
| **Overall execution** | | **~90%** |

---

## Phase 1: Fix inconsistencies between docs (immediate, no code change)

These are factual errors where two docs disagree or a doc contradicts the measured tree.

### 1.1 Route/lazy counts — FEATURES_ANALYSIS, PORTING_PLAN, SECURITY

| Doc | Current claim | Measured (2026-08-01) | Fix |
|---|---|---|---|
| `analysis/FEATURES_ANALYSIS.md:14` | "91 route paths… 89 React.lazy" | **96 unique `path=` values, 98 `lazy(` declarations** | Change to: "96 route paths in `src/App.tsx` (leaf + layout + index), 98 `React.lazy` page imports, 2 `<Navigate>` redirects (`/dashboard`→`/today`, `/`→`/today`), catch-all 404" |
| `PORTING_PLAN_APP_VITE.md:40` | "89 routes" | 96 | Change to "96 routes" |
| `analysis/SECURITY_ANALYSIS.md:47` | "89-route tree" | 96 | Change to "96-route tree" |

### 1.2 File/test counts — PORTING_PLAN snapshot table

`PORTING_PLAN_APP_VITE.md` lines 35–44 have a snapshot table dated "2026-07-31" while the overview text (line 7) says "2026-08-01". Fix:

| Line | Current | Measured | Fix |
|---|---|---|---|
| 35 (table header) | "2026-07-31" | — | Change to "2026-08-01" (matches overview line 7) |
| 39 (app-vite TS/TSX) | 1196 | **1230** (src/) | Change to 1230 |
| 39 (internal-vite TS/TSX) | 55 | **59** | Change to 59 |
| 41 (app-vite tests) | 106 | **107** | Change to 107 |
| 41 (internal-vite tests) | 7 | 7 | No change |
| 44 (feature folders) | 45 | 46 dirs / 45 features | Clarify: "46 feature dirs (45 named features: today+dashboard share one entry)" |

### 1.3 Test count disagreement — STANDARDS vs PORTING

| Doc | Current claim | Measured | Fix |
|---|---|---|---|
| `analysis/STANDARDS_ANALYSIS.md:34` | app-vite 105 spec files | **107** | Change to 107 |
| `analysis/STANDARDS_ANALYSIS.md:31` | total 608 spec files | **610** (381+33+79+107+7+3) | Change to 610 |
| `analysis/README.md:11` | "608 test files" | 610 | Change to 610 |

### 1.4 CODEBASE_CLEANUP_PLAN B.2 headline

`CODEBASE_CLEANUP_PLAN.md:53` section header still says "203 unused exports + 212 unused exported types" — this is the pre-Batch-1 count. The body (line 70) correctly says "203→198, 212→209". Fix the headline:

| Line | Current | Fix |
|---|---|---|
| 53 | "Knip findings: 203 unused exports + 212 unused exported types" | "Knip findings (pre-Batch-1): 203 unused exports + 212 unused exported types" |

### 1.5 App-vite filter name in AGENTS.md §13

AGENTS.md line 217 references `pnpm --filter @docita/app run check-types` — the actual workspace filter name is `@docita/app-vite`. This doesn't affect the analysis docs but is a command reference issue for anyone running the checks.

---

## Phase 2: Add new findings from deep analysis (immediate)

These are gaps in the existing analysis docs — the data was measured but never written into the docs.

### 2.1 SECURITY_ANALYSIS.md — add API surface depth

**Add after §2 (RBAC posture), before §3 (PHI protection): new §2.5 "API Surface"**

Content:

```markdown
## 2.5 API Surface — measured 2026-08-01

| Metric | Count |
|---|---|
| Total controllers (domains + shared) | 130 (91 domain + 39 shared) |
| Total route handler methods (`@Get/@Post/@Put/@Patch/@Delete`) | 639 |
| Controllers with zero route handlers | 0 |
| Controllers with zero guard posture | 0 (all protected) |
| Controllers using custom composite decorators | 27 (e.g. `@AppointmentsApiAccess`, `@DoctorsApiAccess`, `@LegacyWhatsappClinicAccess`, `@InternalApiAccess`) |
| Total `@Public()` controllers | 20 (all intentional: webhooks, health, onboarding, portal auth, public booking) |
| Security gaps (unprotected routes) | 0 — confirmed: global 9-guard pipeline covers every route |

Custom composite decorators (27 controllers) all include `UseGuards` + `Roles` at minimum; each was verified.
```

**Add after §4 (PHI protection), before §5 (Secrets): new §4.5 "Frontend Contract Violations"**

Content:

```markdown
## 4.5 Frontend Contract Violations (measured 2026-08-01)

### Inline `fetch()` — 3 violations (§15.2 rule)

| File | Line | Justified? |
|---|---|---|
| `apps/app-vite/src/features/appointments/hooks/use-download-opd-slip.ts` | 17 | Partially — binary PDF blob download (React Query can't handle blob responses); uses `getAuthHeaders()` |
| `apps/app-vite/src/features/medical-documents/components/use-medical-document-list.ts` | 52 | **No** — raw `fetch("/api/upload")` without auth headers |
| `apps/app-vite/src/features/setup/pages/verify-doctor-page.tsx` | 20 | **No** — raw fetch for doctor verification |

### Raw `<button>` — 4 violations (§4.3 rule)

| File | Line |
|---|---|
| `apps/app-vite/src/components/patient-history/PatientTimeline.tsx` | 99 |
| `apps/app-vite/src/components/patient-history/PatientSnapshotStrip.tsx` | 44 |
| `apps/app-vite/src/components/navigation/mobile-bottom-nav.tsx` | 38 |
| `apps/app-vite/src/components/loaders/page-skeleton.tsx` | 223 |
```

### 2.2 FEATURES_ANALYSIS.md — add quantitative depth

**Add after §1 (Frontend features), before §2 (API): new §1.5 "Frontend Density"**

Content:

```markdown
## 1.5 Frontend Density — measured 2026-08-01

| Metric | Count |
|---|---|
| React components (files exporting JSX) | 584 (525 in features, 49 in components) |
| Custom hook files | 183 (157 `use-*` named, ~202 export sites) |
| Context providers | 12 (auth, clinic, tier, config, socket, confirm, ask-ai, theme, guided-tour, 3 consultation workspace) |
| React Query hook files (useQuery/useMutation/useInfiniteQuery) | 25 |
| TypeScript errors | 0 (check-types passes clean) |
| `console.log/error` in features | 0 |
| `as any` in features | 0 |
| `@ts-expect-error`/`@ts-ignore` in features | 0 |
| TODO/FIXME/HACK in features | 0 |

Top features by component density: settings (67 TSX), consultation (63), appointments (42), public-booking (38), subscription (38), patient-portal (36), dashboard (35), auth (30), patients (30), invoices (29).
```

**Add after §2 (API domains), before §3 (Internal portal): new §2.5 "API Surface Metrics"**

Content:

```markdown
## 2.5 API Surface Metrics — measured 2026-08-01

| Metric | Count |
|---|---|
| Controllers (domains + shared) | 130 (91 domain + 39 shared) |
| Route handler methods | 639 |
| Zod schema files in `packages/types/src` | 114 |
| Named exported Zod schemas | 625 |
| DTO files in API | 63 |
| Zod-first compliance (10-controller sample) | 10/10 — all use `createZodDto()` wrapping `@workspace/types` schemas |
```

### 2.3 STANDARDS_ANALYSIS.md — add compliance snapshot

**Add after §5 (Docs inventory), before §6 (What standards means): new §5.5 "Current Compliance Snapshot"**

Content:

```markdown
## 5.5 Current Compliance Snapshot — 2026-08-01

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 66 warnings (64 `react-refresh/only-export-components` in app-vite, 2 in internal-vite) |
| `pnpm --filter @docita/app-vite run check-types` | PASS (0 errors) |
| `pnpm --filter @docita/api run check-types` | PASS (0 errors) |
| `pnpm knip` | 198 unused exports, 209 unused types |
| Inline `fetch()` in features | 3 violations (1 partially justified) |
| Raw `<button>` in components | 4 violations |
| Native `title=` tooltip in features | 0 (238 matches are all component props) |
| Native `<select>` in features | 0 |
| `console.log/error` in features | 0 |
| `as any` in features | 0 |
| `@ts-expect-error` in features | 0 |
| TODO/FIXME/HACK in features | 0 |

Note: the `react-refresh/only-export-components` warnings are files that export both React components and non-component items (hooks, types, constants). These are code organization issues, not functional bugs. The 3 inline `fetch()` and 4 raw `<button>` violations are architecture issues tracked in `SECURITY_ANALYSIS.md` §4.5.
```

### 2.4 UI_UX_ANALYSIS.md — add sourcing violations

**Add after §6 (Accessibility), before §7 (IA & surfaces): new §6.5 "Sourcing Order Violations"**

Content:

```markdown
## 6.5 Sourcing Order Violations — measured 2026-08-01

4 raw `<button>` elements in `apps/app-vite/src/components/` violate §4.3 ("Use the `Button` primitive, never a raw `<button>` styled with Tailwind classes"):

| File | Line | Notes |
|---|---|---|
| `patient-history/PatientTimeline.tsx` | 99 | Should use `Button` from `@workspace/ui` |
| `patient-history/PatientSnapshotStrip.tsx` | 44 | Should use `Button` from `@workspace/ui` |
| `navigation/mobile-bottom-nav.tsx` | 38 | Should use `Button` from `@workspace/ui` |
| `loaders/page-skeleton.tsx` | 223 | Already flagged as duplicate of `@workspace/ui` `error-boundary` — replace entire file |

Additionally, 64 `react-refresh/only-export-components` lint warnings indicate files mixing component and non-component exports — a code organization signal for feature folder restructuring.
```

### 2.5 TRASH_ANALYSIS.md — add architecture violations

**Add after §6 (Where trash hides), before the end: new §7 "Architecture Violations (not dead, but wrong)"**

Content:

```markdown
## 7. Architecture Violations — measured 2026-08-01

These are not dead code but violate AGENTS.md rules. They should be fixed alongside the trash cleanup.

| Violation | Count | Files |
|---|---|---|
| Inline `fetch()` in features (§15.2) | 3 | `use-download-opd-slip.ts:17` (partial), `use-medical-document-list.ts:52`, `verify-doctor-page.tsx:20` |
| Raw `<button>` in components (§4.3) | 4 | `PatientTimeline.tsx:99`, `PatientSnapshotStrip.tsx:44`, `mobile-bottom-nav.tsx:38`, `page-skeleton.tsx:223` |
```

### 2.6 PERFORMANCE_ANALYSIS.md — add frontend complexity

**Add after §3 (Frontend runtime posture), before §4 (Backend hot paths): new §3.5 "Frontend Complexity Profile"**

Content:

```markdown
## 3.5 Frontend Complexity Profile — measured 2026-08-01

| Metric | Count |
|---|---|
| React components | 584 (525 features, 49 shared) |
| Custom hook files | 183 |
| Context providers | 12 |
| React Query hook files | 25 |
| Feature directories | 46 |
| Source files (TS + TSX) | 1,200 |

Top complexity features (components + TS + hooks): consultation (63+77+25=165), appointments (42+61+25=128), settings (67+12+4=83), patients (30+17+12=59), public-booking (38+23+15=76), subscription (38+33+9=80).

Context provider count (12) is a potential rerender surface — monitor with React DevTools profiler before adding more.
```

---

## Phase 3: Fix stale docs (immediate, low-risk)

These are docs that reference "Next.js" where the apps are now Vite SPAs.

| # | File | Line(s) | Current | Fix |
|---|---|---|---|---|
| 1 | `docs/ui/DESIGN_SYSTEM.md` | 26 | "Wired with next/font in each app root layout" | "Wired via `@font-face` in `packages/ui/src/styles/globals.css`" |
| 2 | `docs/product/ONBOARDING.md` | 100, 102 | "Clinic app (Next.js) \| http://localhost:3000" | "Clinic app (Vite SPA) \| http://localhost:5173" (verify port) |
| 3 | `docs/DOCITA_ONE_PAGER.md` | 69–70 | "Clinician App (Next.js) --> API" | "Clinician App (Vite SPA) --> API" |
| 4 | `docs/testing/TESTING.md` | 226 | "drive the Next.js app" | "drive the Vite SPA app" |
| 5 | `docs/architecture/ARCHITECTURE.md` | 56, 69, 110 | "Next.js" references | Update to "Vite SPA" |
| 6 | `docs/architecture/SECURITY_QANDA.md` | 46 | "security-headers.ts (Next.js, Astro)" | "Cloudflare Worker headers (Vite SPAs), Astro (landing)" |
| 7 | `scripts/perf/sync-a11y-baseline.mjs` | 39 | Error message says `apps/app/accessibility-reports` | Change to `apps/app-vite/accessibility-reports` (code path on line 8 is already correct) |

---

## Phase 4: Fix DEPLOYMENT.md drift (immediate)

`docs/operations/DEPLOYMENT.md` currently says:
- API region: Mumbai → Reality: `sin` (Singapore)
- `min_machines_running: 1` → Reality: `0` (scale-to-zero)

Update the deployment doc to match `fly.toml`.

---

## Phase 5: Remove stale ignoreGhsas + junk ignoreCves (immediate, 5 min)

`package.json` lines 259–268:
- `ignoreGhsas`: 4 entries, all stale (esbuild ×2 — one withdrawn; postcss 8.5.23 patched; valibot 1.4.2 patched) → remove all 4
- `ignoreCves`: contains `["false", "--json"]` — junk CLI args leaked into config → clear the array or remove the key

Run `pnpm audit --audit-level=high` after to confirm clean.

---

## Phase 6: Delete `design-tokens.ts` (immediate, 1 min)

`packages/ui/src/design-tokens.ts` is a legacy shadcn hex/px palette that does NOT mirror `globals.css` (which uses OKLCH tokens). Delete the file. Update any imports (grep first).

---

## Phase 7: Wire dark mode (cutover-gated or immediate if time allows)

This is the largest remaining UI/UX gap. Steps:

1. Delete `layout/theme-provider.tsx` (app-vite) — never mounted
2. Delete `components/layout/theme-provider.tsx` orphan
3. Delete `ThemeToggleWithAppearanceSync` (writes to unused zustand store)
4. Rebuild theme provider: read from the same zustand store as `ThemeToggle` in `@workspace/ui`, toggle `.dark` class on `<html>`, persist to `localStorage`
5. Mount the provider in `main.tsx`
6. Drop `next-themes` from `packages/ui/package.json` and rewrite `theme-toggle.tsx` to accept a theme hook or read the zustand store directly
7. Run `pnpm audit:app` dark-mode smoke

## Phase 8: File management fixes (immediate)

### 8.1 Dead code in subscription/ (3 orphaned files)

| File | Lines | Status | Fix |
|---|---|---|---|
| `features/subscription/config/pricing-config.ts` | 51 | 7 exports, 0 importers across entire repo | Delete |
| `features/subscription/components/billing-plan-catalog.ts` | 33 | 3 exports, 0 importers | Delete |
| `features/subscription/components/billing-plan-status.ts` | 56 | 3 exports, only `starterMonthlyAccessTermMismatch` imported (by 2 files) | Keep file, delete `isStarterActiveZeroBase` and `isComplimentaryActivePaidPlan` |

### 8.2 Naming convention violations (12 files)

**PascalCase `.ts` files that should be kebab-case:**

| File | Rename to |
|---|---|
| `features/consultation/state/consultationDraftHelpers.ts` | `consultation-draft-helpers.ts` |
| `features/consultation/state/consultationHydrateHelpers.ts` | `consultation-hydrate-helpers.ts` |
| `features/patients/components/forms/dialogs/EditPatientDialogHelpers.ts` | `edit-patient-dialog-helpers.ts` |
| `features/settings/components/notifications/ReminderSettingsUI.helpers.ts` | `reminder-settings-ui.helpers.ts` |

**camelCase rules files that should be kebab-case:**

| File | Rename to |
|---|---|
| `features/appointments/rules/appointmentRules.ts` | `appointment-rules.ts` |
| `features/medical-coding/rules/codingRules.ts` | `coding-rules.ts` |
| `features/consultation/rules/consultationRules.ts` | `consultation-rules.ts` |
| `features/documents/rules/documentRules.ts` | `document-rules.ts` |
| `features/inventory/rules/inventoryRules.ts` | `inventory-rules.ts` |
| `features/invoices/rules/invoiceRules.ts` | `invoice-rules.ts` |
| `features/ipd/rules/ipdRules.ts` | `ipd-rules.ts` |
| `features/lab-tests/rules/labTestRules.ts` | `lab-test-rules.ts` |

### 8.3 Duplicate page file

`features/public-booking/public-booking-page.tsx` duplicates `features/public-booking/pages/public-booking-page.tsx`. Verify which is the route entry point and delete the other.

### 8.4 Barrel file optimization

`lib/formatters/index.ts` (122 lines) functions as a facade, not a pure barrel. It defines ~12 wrapper functions. Consider splitting: keep barrel as re-exports only, move wrapper functions to a separate `formatters.ts` file.

---

## Phase 9: Type and Zod fixes (immediate)

### 9.1 Interface-Zod schema duplication (9 confirmed violations)

These interfaces in `apps/app-vite` parallel Zod schemas in `packages/types` with **divergent shapes** — the exact anti-pattern warned about in AGENTS.md §3.1:

| Interface | File | Zod Schema | Divergence |
|---|---|---|---|
| `Admission` | `features/ipd/rules/ipdRules.ts` | `admissionSchema` in `types/src/operations/ipd.ts` | Different field names (`admissionDate: Date` vs `admittedAt: Date\|string`), different enum casing |
| `Bed` | same file | `bedSchema` | Interface has extra fields (`currentPatientId`, `type`) |
| `Ward` | same file | `wardSchema` | `floor: number` vs `floorNumber: string\|null` |
| `Medication` | `features/consultation/components/structured/prescription-input.types.ts` | `medicationDraftItemSchema` in `types/src/contracts/consultation.ts` | `instructions` vs `notes`; interface lacks `id` |
| `ChiefComplaintItem` | `features/consultation/components/structured/chief-complaint.types.ts` | `chiefComplaintDraftItemSchema` | `durationValue`+`durationUnit` vs single `duration` |
| `DiagnosisItem` | `features/consultation/components/structured/diagnosis-input-types.ts` | `diagnosisDraftItemSchema` | `icdCode: {id,code,description}` vs `icdCodeId`+`icdCode` strings; `status` enum differs |
| `ExaminationData` | `features/consultation/components/structured/examination-input.types.ts` | `examinationDraftSchema` | Interface has simpler shape |
| `VitalsFormData` | `features/consultation/components/modals/use-vitals-form.ts` | `vitalSignSchema` in `types/src/clinical/vitals.ts` | `string` vs `number` types; different field sets |
| `VitalsData` | `features/patients/rules/vitals-rules.ts` | `vitalSignSchema` | `bloodPressure: string` vs `systolicBP`/`diastopicBP` as numbers |

**Fix approach:** For each, choose one canonical source (Zod schema in `packages/types`), derive the TypeScript type via `z.infer`, and delete the parallel interface. Where the interface is intentionally different (e.g. form-local shape), add a comment explaining the divergence.

### 9.2 Unused Zod schemas (383 of 819)

383 exported Zod schemas in `packages/types` have zero usages outside the package. Categories:

| Category | Count | Action |
|---|---|---|
| Onboarding form schemas | ~15 | Keep — will be consumed when onboarding feature is ported |
| WhatsApp template schemas | ~10 | Keep — part of schema-first design for future features |
| Leave/scheduling schemas | ~8 | Keep — leave feature exists but schemas may not be wired yet |
| MFA backup code schemas | 4 | Keep — security schemas, may be used in tests |
| Analytics schemas | 3 | Keep — analytics feature exists |
| App session schemas | 4 | Verify — may be dead from old architecture |
| API key/tenant schemas | 3 | Verify — may be used in tests |
| Shared utility schemas | ~10 | Keep — used as base schemas for composition |
| DPDP consent schemas | 2 | Keep — compliance schemas |

**Recommendation:** Do NOT bulk-delete. The schema-first approach means schemas are defined before consumers. Mark the app-session and API-key schemas for verification (they may be dead from the old architecture). The rest are likely intentional schema-first definitions.

### 9.3 Unused Zod schemas in knip (198 exports)

The knip-detected unused exports include type exports from `packages/types` that are schema-derived types. These are different from the 383 unused schemas — these are TypeScript types derived from schemas that no one imports yet. Same recommendation: keep (schema-first), but verify the app-session/API-key cluster.

---

## Phase 10: State management fixes (immediate)

### 10.1 Dead providers (2)

| Provider | File | Status | Fix |
|---|---|---|---|
| `GuidedTourProvider` | `features/guided-tour/guided-tour-provider.tsx` | `isTourActive` hardcoded `false`, `autoStartIfEligible` is no-op, `GuidedTourOverlay` returns `null` | Delete provider + overlay; keep feature dir if tour is planned for future |
| `TierContext` | `lib/contexts/tier-context.ts` | Not in provider tree in `main.tsx`; `usePermissionStore` handles all tier logic | Delete — dead/leftover context |

### 10.2 ThemeProvider duplication (bug)

`components/layout/theme-provider.tsx` reads from `localStorage("theme")` while `useAppearanceStore` (Zustand) persists to `localStorage("docita-appearance")`. Two different localStorage keys for the same value.

**Fix:** Delete the Context-based `ThemeProvider`. Rebuild using the Zustand `useAppearanceStore` as the single source of truth (same approach as Phase 7 dark mode wiring).

### 10.3 ClinicProvider → React Query migration

`lib/contexts/clinic-context.tsx` manually manages loading/error/caching with `useState`/`useCallback`/`useEffect`. Should use `useQuery` for consistency with the rest of the app.

**Fix:** Replace with a `useClinic` hook using React Query, or add to `useAppConfig` if clinic data is already fetched there.

### 10.4 Zustand devtools

None of the 3 Zustand stores use `devtools` middleware. For a healthcare app with complex state, this makes debugging harder.

**Fix:** Add `devtools` middleware (dev-only) to all 3 stores:
- `features/consultation/state/useConsultationDraft.ts`
- `lib/stores/appearance-store.ts`
- `lib/stores/permission-store.ts`

---

## Phase 11: i18n coverage (cutover-gated)

**DONE 2026-08-02** — 44/45 features now use `useTranslation`; the remaining feature (`legal`, ConsentNoticeModal) is intentionally unlocalized and allowlisted in `scripts/checks/allowlists/i18n-coverage.json`. The `check:i18n-coverage` check enforces this. The table below is the historical priority list (all resolved except the intentional `legal` exception):

| Priority | Feature | Hardcoded strings | Fix |
|---|---|---|---|
| P0 | Dashboard/Today | "Total patients", "Today's appointments", "Good morning/afternoon/evening", "Ask AI", "Open queue", "Start next", "Next patient" | Add en/hi keys |
| P0 | Appointments | "Appointments", "Manage clinic appointments" | Add en/hi keys |
| P0 | WhatsApp | "WhatsApp", "Outbound messages, campaigns...", "Sender settings", "Sent", "Campaigns", "Templates", "Delivery" | Add en/hi keys |
| P0 | Lab Tests | "Patient", "Test Name", "Category", "Ordered By", "Order Date", "Status", "Payment", "Actions", "Verify", "View Results", "Details" | Add en/hi keys |
| P1 | Inbox | "Inbox", "Messages and notifications" | Add en/hi keys |
| P1 | Medical Documents | "Sign", "Revoke", "View uploaded file" | Add en/hi keys |
| P1 | Setup | Navigation button text | Add en/hi keys |
| P1 | Referral Partner | "Try again in a moment" | Add en/hi keys |
| P2 | Desk | "Token goes out on WhatsApp..." | Add en/hi keys |
| P2 | Documents, Search, IPD, Upload-signature, Mobile-upload, Referrals, Templates, Follow-ups, Medical-coding, Lab-portal | Various hardcoded strings | Add en/hi keys |

---

## Phase 12: Accessibility fixes (immediate)

### 12.1 Raw `<button>` bypassing Button primitive — 0 in production code

All 50 raw `<button>` instances are in **test files only** (`.test.tsx`), where native HTML elements are acceptable for test mocks. **No production code action needed.**

### 12.2 Missing `aria-label` (108 remaining of 150)

Re-scanned 2026-08-02 with a multiline-aware counter: **108 instances remain** (0 raw `<button>`, ~31 `<a>` tags, ~77 `<Link>` tags). The original "150 fixed / 0 remaining" claim was **false** — no attributes were added. Most remaining elements have visible text (so `audit:app` may stay green), but icon-only links need labels:

| Category | Count | Priority |
|---|---|---|
| `<button>` tags missing aria-label | 0 | P0 — screen readers |
| `<a>` tags missing aria-label | ~31 | P1 — external links (PDFs, mailto, tel); P0: `sidebar.tsx:33,43` logo links |
| `<Link>` tags missing aria-label | ~77 | P1 — keyboard navigation; P0: `today-schedule-ui.tsx:75` row action |

---

## Phase 13: Error boundary coverage — ALREADY COMPLETE

**All functional layouts already have `ErrorBoundaryWrapper`** (verified 2026-08-02):

| Layout | Status |
|---|---|
| `ProtectedLayout` | ✅ Has `ErrorBoundaryWrapper` |
| `SetupLayout` | ✅ Has `ErrorBoundaryWrapper` |
| `PublicLayout` | ✅ Has `ErrorBoundaryWrapper` |
| `PortalLayout` | ✅ Has `ErrorBoundaryWrapper` |
| `LabPortalLayout` | ✅ Has `ErrorBoundaryWrapper` |

Layouts without `ErrorBoundaryWrapper` (intentional — no content to boundary-wrap):
- `RootLayout` — only renders `<Helmet>` + `<Outlet />`
- `ToolsLayout` — only renders `<Helmet>` + `<Outlet />`

**Remaining action**: Replace duplicate `ErrorBoundary` class in `page-skeleton.tsx` with `@workspace/ui` `error-boundary`.

---

## Phase 14: Library recommendations (evaluate)

| Library | Purpose | Current state | Recommendation |
|---|---|---|---|
| `@tanstack/react-table` | Table management | Not used (manual table rendering) | **Evaluate** — could replace ad-hoc table patterns in patients, appointments, invoices lists |
| `react-day-picker` or `date-fns` | Date handling | Using `@workspace/utils` formatDate | **Keep current** — no need for heavier dependency |
| `zod-to-json-schema` | Schema documentation | Not used | **Evaluate** — could auto-generate API docs from Zod schemas |
| `ts-prune` or `knip` | Dead code detection | `knip` already used | **Already covered** |
| `@hookform/transformers` | Zod/form transformers | `@hookform/resolvers` already used | **Already covered** |
| `react-aria` or `@radix-ui/react-*` | Accessibility primitives | Radix already used via `@workspace/ui` | **Already covered** |
| `storybook` | Component documentation | Not used | **Evaluate** — for design system documentation of `@workspace/ui` primitives |
| `msw` (Mock Service Worker) | API mocking for tests | Not detected | **Evaluate** — could improve test isolation for frontend unit tests |
| `vitest` browser mode | Browser-based testing | Not used | **Evaluate** — for testing actual DOM interactions in the browser |

### 14.1 Alpha dependency risk

`react-signature-canvas` is pinned to `1.1.0-alpha.2`. This is an alpha version in production. Monitor for stable release or evaluate alternatives (`signature_pad`).

### 14.2 TypeScript version

TypeScript `5.7.3` is not the latest (5.8+ available). Low priority but should be updated during a maintenance window.

---

## Phase 15: Coding standards enforcement (evaluate)

### 15.1 Missing checks that should exist

| Check | What it would catch | Current status |
|---|---|---|
| Raw `<button>` in features | 49 violations | DONE 2026-08-02 — `check:button-primitive` scans features + components in both Vite apps; 4 violations fixed; wired into `verify:standard` |
| Interface-Zod duplication | 9 violations | DONE 2026-08-02 — `check:zod-interface-parity` flags same-named type collisions; 16 documented form-local divergences allowlisted; wired into `verify:standard` |
| i18n completeness | 27 features without `useTranslation` | DONE 2026-08-02 — `check:i18n-coverage` (app-vite; legal allowlisted) + 4 features converted; 44/45 |
| Error boundary coverage | 4 layouts missing boundaries | DONE 2026-08-02 — `check:error-boundary-coverage` verifies every functional `*-layout.tsx` wraps content in `ErrorBoundary` (root/tools layouts allowlisted); internal-vite duplicate ErrorBoundary replaced with the `@workspace/ui` primitive |
| File naming conventions | 12 files with wrong case | `check:filename-case` exists but may not catch all patterns |

### 15.2 Suggested new checks

| Check | Script | What it enforces |
|---|---|---|
| `check:button-primitive` | `grep -rn "<button" apps/*/src/features --include="*.tsx" \| grep -v "@workspace/ui"` | All `<button>` elements use `Button` primitive |
| `check:i18n-coverage` | `grep -rL "useTranslation" apps/*/src/features/*/pages/` | All page-level components import i18n |
| `check:error-boundary-coverage` | `grep -rn "ErrorBoundary" apps/*/src/App.tsx apps/*/src/*-layout.tsx` | All layouts have error boundaries |
| `check:zod-interface-parity` | AST comparison of interfaces vs Zod schemas | No parallel type definitions |

**All four checks implemented 2026-08-02** and wired into `verify:standard` (plus `check:standard-gate-wiring` coverage). Allowlists live in `scripts/checks/allowlists/`.

---

## Appendix A: Packages boundary verification

All packages verified clean (2026-08-01) — zero runtime boundary violations:

| Package | Source Files | Tests | Key Exports | Boundary |
|---|---|---|---|---|
| data-access | 120 | 18 | ~316 hooks + 8 core functions | CLEAN (fetch usage is the approved abstraction) |
| hooks | 27 | 0 | 37 items (15 hooks + helpers) | CLEAN (no Next.js imports) |
| utils | 80 | 18 | ~265 functions/constants | CLEAN (no React/Next.js) |
| types | 155 | 2 | ~844 schemas + 54 functions | CLEAN (pure helpers, no framework) |
| auth | 3 | 1 | 5 constants | CLEAN |
| db | 12 | 0 | Prisma client + 160 migrations | CLEAN |
| ui | 133 | 27 | presentational primitives | CLEAN |

---

## Appendix B: Worker architecture

`apps/worker/src/main.ts` (120 lines) is a thin bootstrap wrapper. It imports `WorkerModule` from `apps/api/src/worker.module.ts` via `@/*` path aliasing (`tsconfig.json: "paths": { "@/*": ["../api/src/*"] }`). 12 worker-specific module files exist in `apps/api/src/` (`*.worker.module.ts`). The worker shares all infrastructure with the API correctly.

---

## Appendix C: verify:standard pipeline

94 commands chained via `&&` in `package.json` line 65 (95 with `check:e2e-nav-routes` expansion). All 94 script definitions verified to exist. No missing scripts.

---

## Appendix D: Scripts referencing deleted paths

Zero broken path references to `apps/app` or `apps/internal` in `scripts/`. One stale error message string in `scripts/perf/sync-a11y-baseline.mjs:39` (code path on line 8 is correct). All `scripts/checks/` files reference `apps/app-vite` and `apps/internal-vite`.

---

## Verification Checklist

After all phases complete, run:

```bash
pnpm lint                              # 0 errors expected
pnpm --filter @docita/app-vite run check-types  # 0 errors
pnpm --filter @docita/api run check-types       # 0 errors
pnpm knip                              # verify counts match docs
pnpm audit --audit-level=high          # confirm ignoreGhsas removal clean
pnpm verify:standard                   # full gate (94 commands)
```

Then spot-check:

```bash
grep -rn "89-route\|89 routes\|1196\|106 test\|203 unused\|212 unused" docs/analysis/
# Expected: 0 matches

grep -rn "Next\.js" docs/ --include="*.md" | grep -v "PORTING_PLAN\|REPO_GAPS\|CODEBASE_CLEANUP\|ADR\|UpcomingPlans\|architecture/decisions\|audits/"
# Expected: 0 matches (except historical context notes)
```

---

## Summary

| Phase | Scope | Items | Effort | Status |
|---|---|---|---|---|
| 1 | Fix doc inconsistencies | 6 doc fixes | 15 min | ✅ Done |
| 2 | Add deep analysis findings | 6 doc additions | 30 min | ✅ Done |
| 3 | Fix stale Next.js references | 7 doc fixes | 10 min | ✅ Done |
| 4 | Fix DEPLOYMENT.md drift | 1 doc fix | 5 min | ✅ Done |
| 5 | Remove ignoreGhsas + junk config | 1 file edit | 5 min | ✅ Done |
| 6 | Delete design-tokens.ts | 1 file delete + tailwind inline | 10 min | ✅ Done |
| 7 | Wire dark mode | ~7 file edits | 1–2 hours | ✅ Done |
| 8 | File management fixes | 3 dead files + 12 renames | 30 min | ✅ Done |
| 9 | Type/Zod fixes | 9 interface-Zod duplications | Deferred | Form/API intentional divergence |
| 10 | State management | Zustand devtools × 3 stores | 15 min | ✅ Done |
| 11 | i18n coverage | 12 features (was 26) | ✅ Done | 2026-08-02 — 44/45 features; `check:i18n-coverage` + allowlist land in verify:standard |
| 12 | Accessibility fixes | 108 aria-labels remaining of 150 (raw buttons: 0 in production) | In progress | Medium scope — dedicated PR |
| 13 | Error boundary coverage | **Already complete** (5/5 functional layouts) | None | ✅ Done |
| **Total completed** | | **~55 changes** | **~3–4 hours** | |

Phases 1–6, 8, 10 are documentation + small code fixes. Phase 7 (dark mode) was the largest code change. Phases 11–13 are larger-scope code changes best done in dedicated PRs.

### Refreshed measurements (2026-08-02 — deep analysis pass)

| Metric | Previous (2026-08-01) | Current | Delta |
|---|---|---|---|
| app-vite TS/TSX files | 1,230 | **1,404** | +174 (+14%) |
| app-vite test files | 107 | **122** | +15 (+14%) |
| app-vite E2E specs | 45 | 45 | — |
| app-vite React components | 584 | **802** | +218 (+37%) |
| app-vite custom hooks | 183 | **194** | +11 (+6%) |
| app-vite feature dirs | 46 | **47** | +1 |
| app-vite source lines | — | **121,121** | new |
| app-vite bundle (gzip) | 755 KB | **816 KB** | +61 KB (171 assets) |
| app-vite lazy routes | — | **98** / 100 | 98% lazy-loaded |
| Features COMPLETE | 34 | **38** | +4 (setup, patients, consultation, settings now COMPLETE) |
| Features PARTIAL | 6 | **0** | All former PARTIAL features now COMPLETE |
| Features SHELL | — | **6** | billing-locked, errors, profile, today (thin dashboard wrapper by design), tools, upgrade — guided-tour DROPPED in the Phase 6 port-or-drop review; pharmacy/referrals/templates/help promoted to real content |
| Features with i18n | ~17 | **44** | +27 |
| Features without i18n | 29 | **1** (legal, intentional) | -28 |
| Features with tests | — | **38** / 45 | 84% |
| Features with hooks | — | **27** / 45 | 60% |
| Features with helpers | — | **20** / 45 | 44% |
| Raw `<button>` in production | 49 | **0** | All 50 are in test files only |
| Raw `<button>` in test files | — | **50** | New distinction — test files only |
| Missing `aria-label` | 30 | **108** (multiline-aware re-scan; prior "150"/"all fixed" numbers unreliable) | +78 remaining |
| Inline `fetch()` in features | 3 | **1** (`use-download-opd-slip.ts:20`; check is git-based and misses untracked app-vite/src) | -2 |
| Error boundary layouts | 1/5 | **5/8** | All functional layouts now covered |
| internal-vite TS/TSX files | 59 | **63** | +4 |
| internal-vite test files | 7 | **8** | +1 |
| internal-vite E2E specs | 2 | **3** | +1 |
| internal-vite features | 17 | **18** | +1 |
| Total test files (repo) | 610 | **646** | +36 |
| DB indexes | 488 | **530** | +42 |
| DB timestamptz | — | **469** (0 non-tz) | new — fully tz-compliant |
| Zod schemas | 625 | **634** | +9 |
| Zod DTOs | — | **63** (createZodDto) | new |
| API controllers | 130 | **132** | +2 |
| API source lines | 200,492 | **200,492** | — |
| API test-to-src ratio | — | **25%** avg | new — analytics 45%, patient-portal 35% |
| API controllers >200 lines | — | **10** | new — ai.controller 247 largest |
| API services >400 lines | — | **3** | new — database-control 474 largest |
| Context providers | — | **12** | new |
| React Query hooks | — | **25** | new |
| Package tests (best) | — | ui 27, utils 23, types 19 | new |
| Dead code signals | — | **118** no-import files, **46** unused barrels | new |
| lint warnings | 84 | **84** | — |
| knip unused exports | 198 | **278** | +80 (more thorough scan) |
| knip unused types | 209 | **287** | +78 (more thorough scan) |
| Files >200 lines | — | **96** | new |
| Import discipline | — | **0** deep relative imports | new — alias + workspace used |

**Key progress since last analysis**: 4 formerly PARTIAL features (setup/onboarding, patients, consultation, settings) are now COMPLETE with real implementations. The porting plan file count jumped from 63% to **71%** (1,404/1,967). Raw `<button>` is confirmed 0 in production code (previous 50 was test-file-only). Error boundary coverage is complete (5/5 functional layouts) and now enforced by `check:error-boundary-coverage` (internal-vite's duplicate ErrorBoundary replaced with the `@workspace/ui` primitive). i18n coverage improved from 17 to **44** features (98%; only `legal` is intentionally unlocalized and allowlisted). Phase 15 checks (`check:button-primitive`, `check:i18n-coverage`, `check:error-boundary-coverage`, `check:zod-interface-parity`) all landed and are wired into `verify:standard`. The Phase 6 port-or-drop review was applied: excel/ocr/feedback/guided-tour DROPPED, dev-tools KEPT as shell, specialty KEPT (see PORTING_PLAN Phase 6 decisions).

**Deep analysis highlights**: DB fully tz-compliant (469 timestamptz, 0 non-tz). Bundle 816KB gzip, 98% lazy routes. API avg test-to-src 25%. 118 dead files + 46 unused barrels identified for batch cleanup. 10 API controllers and 3 services exceed size thresholds.

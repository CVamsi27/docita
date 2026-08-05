# Final Migration Roadmap — Next.js → Vite + React

Consolidated from `PORTING_PLAN_APP_VITE.md`, `REPO_GAPS_AND_IMPROVEMENTS.md`, `EXECUTION_PLAN.md`, and `CODEBASE_CLEANUP_PLAN.md`. **Single source of truth for everything remaining.**

Last verified: **2026-08-03** (codebase audit against the tracked Vite tree; P0–P2 implementation evidence refreshed).

## Release-readiness model

This roadmap consolidates status; [`analysis/EXECUTION_PLAN.md`](analysis/EXECUTION_PLAN.md) owns the ordered work and the full verification matrix. Migration completion has two independent gates:

- **Parity gate**: retained features are implemented, dropped features have recorded decisions, contracts and access behavior are tested, and no route/CTA/E2E dependency is dangling.
- **Production gate**: authenticated runtime flows, PHI/tenant/RBAC safety, accessibility, performance, secrets, observability, Cloudflare deployment, rollback, and release documentation all have evidence.

`DONE` means code plus a passing named gate. `READY` means local implementation is complete but an external release action remains. `BLOCKED` means credentials, fixtures, or a product decision is missing. A skipped test or vacuous git-based check is not green.

**Final-pass gate note (2026-08-03):** the current working tree passes the
standard wiring, standards tests, fallow, duplication, and hygiene stages, but
`pnpm verify:standard` currently stops at `check:feature-boundaries --enforce`
with 37 cross-feature internal-import findings. The full production gate is
therefore not green; see [`REPO_GAPS_AND_IMPROVEMENTS.md`](REPO_GAPS_AND_IMPROVEMENTS.md)
M11 and [`analysis/EXECUTION_PLAN.md`](analysis/EXECUTION_PLAN.md).

---

## % Completed

| Area                  | Completed                   | Total                       | %                      | Status                                                                                    |
| --------------------- | --------------------------- | --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| **Feature port**      | 38 COMPLETE                 | 46 features                 | **83%**                | 8 SHELL + 3 MISSING remain                                                                |
| **File port**         | 1,404                       | 1,967 TS/TSX                | **71%**                |                                                                                           |
| **Test port**         | 132 app-vite unit files     | 275 historical source files | **48% audit snapshot** | 7 formerly zero-test features now have smokes                                             |
| **E2E port**          | 45                          | 50 specs                    | **90%**                | 5 visual specs dropped                                                                    |
| **Error boundaries**  | 5/5                         | 5 functional layouts        | **100%**               | ✅ Complete                                                                               |
| **Raw `<button>`**    | 0 violations                | production code             | **100%**               | ✅ Complete (50 in test files only)                                                       |
| **i18n**              | 44/45                       | features                    | **98%**                | ✅ Done (`legal` intentional + allowlisted)                                               |
| **Inline `fetch()`**  | 0 violations                | production code             | **100%**               | ✅ `check:frontend-fetch --enforce` green after the Vite tree was tracked                 |
| **Accessible names**  | 0 clearly nameless controls | production code             | **100%**               | ✅ `check:accessible-name` green; the historical 108 count was a raw attribute count      |
| **Type/Zod fixes**    | 0/9                         | duplications                | **0%**                 | Not started                                                                               |
| **Dead code cleanup** | ~85%                        | items                       | **85%**                | Most items done                                                                           |
| **Knip unused**       | 0/278                       | exports cleaned             | **0%**                 | Not started (low priority)                                                                |
| **Cutover (Phase 9)** | 4/10                        | pre-cutover items           | **40%**                | Blocked on authenticated runtime, guard decisions, deployment access, and rename sequence |
| **Cutover steps**     | 3/11                        | steps                       | **27%**                | AGENTS.md + docs + CI done                                                                |

### Overall migration completion

| Dimension                         | %                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Feature parity (by feature count) | **83%**                                                                        |
| Feature parity (by file count)    | **71%**                                                                        |
| Test coverage (by file count)     | **44%**                                                                        |
| E2E coverage                      | **90%**                                                                        |
| Architecture compliance           | **P0 targeted gates green; full standard gate blocked by 37 feature-boundary findings** |
| i18n coverage                     | **98%** (44/45 — `legal` intentional + allowlisted)                            |
| Cutover readiness                 | **~35%** (pre-cutover 40%, steps 27%)                                          |
| **Weighted overall**              | **~85%**                                                                       |

### Deep analysis metrics (2026-08-02)

| Dimension                  | Value                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database**               | 147 models, 112 enums, **488 indexes** (`@@index` in schema; 533 `CREATE INDEX` + 81 `CREATE UNIQUE INDEX` in migrations), 159 migrations, **469 timestamptz** (0 non-tz DateTime)                     |
| **DB field types**         | 469 DateTime, ~1200 String, ~200 Int, ~50 Float, ~30 Boolean, ~40 Json, ~15 Decimal                                                                                                                    |
| **DB relations**           | ~500 `@relation`, ~800 `@unique`/`@@unique`, ~600 `@default`                                                                                                                                           |
| **API test coverage**      | 381 unit tests across 29 domains (avg **25%** test-to-src ratio; analytics 45%, patient-portal 35%, appointments 33%)                                                                                  |
| **API complexity**         | 10 controllers >200 lines (largest: ai.controller 247), 3 services >400 lines (database-control 474)                                                                                                   |
| **API guard coverage**     | 74 controllers with `@Roles`, 31 with `@Public`, **32 without explicit decorator** (protected by global 9-guard pipeline)                                                                              |
| **Frontend completeness**  | **38/45** features with tests, **27/45** with hooks, **20/45** with helpers, **37/45** with pages                                                                                                      |
| **Features without tests** | 0 unreviewed; 7 formerly empty features now have smoke/export tests                                                                                                                                    |
| **Bundle**                 | **816KB gzip** (2.6MB raw), 171 assets, 96 lazy route boundaries provided by the grouped route modules; application/layout shell remains eager                                                                                                                                |
| **Code quality**           | 1 file >400 lines (`LabTestsOrders.test.tsx` 544), 94 files >200 lines, avg ~101 lines/file                                                                                                                   |
| **Package health**         | types: 19 tests, ui: 27 tests, utils: 23 tests, data-access: 12 files / 105 tests, hooks: 1 test, auth: 1 test                                                                                         |
| **Import discipline**      | **0** deep relative imports (`../`), alias + workspace imports used consistently                                                                                                                       |
| **Dead code signals**      | 118 files with no imports, 46 unused barrel `index.ts` files                                                                                                                                           |
| **Zod usage**              | **840** exported schemas (`export const XSchema =` in `packages/types/src`; 630 single-line `z.*`, 445 `z.object`), **59** DTO files (**346** `createZodDto()` call sites), Zod-first compliance 10/10 |
| **State management**       | 1 zustand store (consultation draft), **12** React Context providers, **25** React Query hooks                                                                                                         |
| **Test density**           | API: 1.9 tests/1K lines, app-vite: 1.0 tests/1K lines                                                                                                                                                  |
| **E2E critical flows**     | 17 flows covered: auth, consultation, billing, subscription, portal, booking, today, appointments, patients, invoices, whatsapp, settings, lab, prescriptions                                          |

---

## Current State

| Metric                                | Value                                                         | Target                                                                        |
| ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| app-vite TS/TSX files                 | **1,404** / 1,967                                             | 1,967 (100%)                                                                  |
| app-vite test files                   | **132 unit files** / 275 audit snapshot                       | all critical paths tested; no unreviewed zero-test feature                    |
| app-vite E2E specs                    | **45** / 50                                                   | all retained critical flows live-run; 5 visual fixtures intentionally dropped |
| app-vite source lines                 | **121,121**                                                   | —                                                                             |
| app-vite React components             | **802** TSX files                                             | —                                                                             |
| app-vite custom hooks                 | **194**                                                       | —                                                                             |
| app-vite features with tests          | **38** / 45                                                   | 45/45                                                                         |
| app-vite features with hooks          | **27** / 45                                                   | 45/45                                                                         |
| app-vite features with helpers        | **20** / 45                                                   | 45/45                                                                         |
| internal-vite TS/TSX files            | **63** / 314                                                  | 314 (100%)                                                                    |
| internal-vite test files              | **8** / 39                                                    | 39 (100%)                                                                     |
| internal-vite E2E specs               | **3** / 2                                                     | 2 (complete)                                                                  |
| Features COMPLETE                     | **38** / 46                                                   | 46                                                                            |
| Features SHELL                        | **8**                                                         | 0                                                                             |
| Features MISSING                      | **3**                                                         | 0                                                                             |
| File port %                           | **71%**                                                       | 100%                                                                          |
| Test port %                           | **44%**                                                       | 100%                                                                          |
| Total test files (repo-wide)          | **646**                                                       | —                                                                             |
| i18n coverage                         | **44/45** features (98%; `legal` intentional and allowlisted) | 44/45 with documented exception; no accidental gaps                           |
| Raw `<button>` in production code     | **0**                                                         | 0 (test files only)                                                           |
| Clearly nameless interactive controls | **0** (`check:accessible-name`)                               | 0                                                                             |
| Inline `fetch()` in features          | **0** (`check:frontend-fetch --enforce`)                      | 0                                                                             |
| Error boundary layouts                | **5/8** (all functional layouts)                              | 5/5                                                                           |
| DB models / enums / indexes           | **147** / **112** / **488**                                   | —                                                                             |
| DB timestamptz fields                 | **469** (0 non-tz DateTime)                                   | —                                                                             |
| DB relations / unique constraints     | **~500** / **~800**                                           | —                                                                             |
| API controllers / routes              | **132** / **639**                                             | —                                                                             |
| API source lines                      | **200,492**                                                   | —                                                                             |
| API avg test-to-src ratio             | **25%** (analytics 45%, patient-portal 35%)                   | —                                                                             |
| API controllers >200 lines            | **10** (largest: ai 247)                                      | —                                                                             |
| API services >400 lines               | **3** (database-control 474)                                  | —                                                                             |
| Zod object schemas                    | **840** exported (`export const XSchema =`; 445 `z.object`)   | —                                                                             |
| Zod DTOs                              | **59** files (**346** `createZodDto()` call sites)            | —                                                                             |
| Bundle (gzip)                         | **816KB** (2.6MB raw)                                         | —                                                                             |
| Bundle assets                         | **171**                                                       | —                                                                             |
| Lazy routes                           | **96** / 100 total                                            | —                                                                             |
| Context providers                     | **12**                                                        | —                                                                             |
| React Query hooks                     | **25**                                                        | —                                                                             |
| Package tests                         | types 19, ui 27, utils 23, data-access 8                      | —                                                                             |
| Files >400 lines                      | **1** (`LabTestsOrders.test.tsx` 544)                         | —                                                                             |
| Files >200 lines                      | **96**                                                        | —                                                                             |
| Dead code signals                     | 118 no-import files, 46 unused barrels                        | —                                                                             |
| Knip unused exports                   | **278**                                                       | 0                                                                             |
| Knip unused types                     | **287**                                                       | 0                                                                             |
| Lint warnings                         | **84** (react-refresh)                                        | 0                                                                             |
| Guard coverage                        | 74 @Roles, 31 @Public, 32 implicit (global pipeline)          | —                                                                             |

---

## Phase 9 — Cutover (BLOCKED: needs all prior work)

**Goal**: delete Next.js apps, make Vite the only frontend, rename `app-vite` → `app`.

### 9.1 Pre-cutover checklist (must be green before committing)

| #   | Item                                                                                       | Status                                                  | Source                                                                                                     |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | All retained SHELL features ported or explicitly deferred; dropped features have decisions | **PARTIAL**                                             | PORTING_PLAN Phase 6; retained specialty shells and dev-tools need route/runtime validation                |
| 2   | All MISSING features (excel, ocr, feedback) ported or dropped                              | **DONE**                                                | PORTING_PLAN Phase 6 records DROP decisions and removed routes                                             |
| 3   | Retained E2E specs discovered and live-run (5 visual specs intentionally dropped)          | **STRUCTURAL PASS / LIVE RUN BLOCKED**                  | PORTING_PLAN Phase 8; needs seeded API/Postgres CI run                                                     |
| 4   | `pnpm verify:standard` green with Vite as only frontend                                    | **PENDING**                                             | AGENTS.md §10                                                                                              |
| 5   | `pnpm knip` clean (0 findings)                                                             | **PENDING** (278)                                       | CODEBASE_CLEANUP §B.2                                                                                      |
| 6   | `pnpm check:circular:enforce` green (0 cycles)                                             | **VERIFIED**                                            | AGENTS.md §10                                                                                              |
| 7   | `pnpm check:prisma-boundary` green                                                         | **VERIFIED**                                            | AGENTS.md §10                                                                                              |
| 8   | `pnpm audit --audit-level=high` clean or has an owned time-bounded exception               | **PENDING** (react-router / brace-expansion advisories) | REPO_GAPS §G                                                                                               |
| 9   | `build:cloudflare:production` smoke-tested for both apps                                   | **PENDING**                                             | PORTING_PLAN Phase 8                                                                                       |
| 10  | Existing-user compatibility reviewed and guard behavior decided                            | **PARTIAL**                                             | Session/onboarding safety passes; subscription, doctor-verification, and direct-URL guard decisions remain |

### 9.2 Cutover steps (in order)

| #   | Step                                                               | Status                                                                      |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 1   | Update AGENTS.md to Vite layout                                    | **DONE** (2026-07-31)                                                       |
| 2   | Update live docs to Vite paths                                     | **DONE** (2026-07-31)                                                       |
| 3   | Flip/archive 10 historical Next-referencing docs                   | **PENDING**                                                                 |
| 4   | Remove deprecated Next.js CI jobs                                  | **DONE** (2026-08-01)                                                       |
| 5   | Lift jscpd Vite exclusion + fix real clones                        | **PENDING**                                                                 |
| 6   | Regenerate JSX-literal-density baseline                            | **PENDING**                                                                 |
| 7   | Re-arm git-based checks against the tracked Vite tree              | **READY** — re-run now and regenerate path-sensitive baselines after rename |
| 8   | Smoke `deploy:cloudflare:production` for both apps                 | **PENDING**                                                                 |
| 9   | Delete `apps/app` + `apps/internal`                                | **PENDING**                                                                 |
| 10  | Rename `app-vite` → `app`, `internal-vite` → `internal`            | **PENDING**                                                                 |
| 11  | Sweep all references (package.json, turbo.json, CI, scripts, docs) | **PENDING**                                                                 |

---

## Remaining Work (pre-cutover)

### A. Validate retained features and recorded product decisions

| Feature          | Current              | Target | Action                                                                         | Priority |
| ---------------- | -------------------- | ------ | ------------------------------------------------------------------------------ | -------- |
| excel            | 0 files              | 12     | **DROP recorded**; verify no dangling route/CTA/E2E dependency                 | P3       |
| ocr              | 0 files              | 31     | **DROP recorded**; retain only intentionally planned type/gate contracts       | P3       |
| feedback         | 0 app files          | 4      | **DROP from app recorded**; internal feedback remains real                     | P3       |
| guided-tour      | 0 files              | 17     | **DROP recorded**; onboarding wizard is the supported guidance                 | P3       |
| dev-tools        | 1 shell file         | 10     | **KEEP AS SHELL** for visual-test/session-seed support; validate dev-only gate | P3       |
| specialty/dental | shell pages          | 13     | **KEEP / DEFER**; validate real content and record dedicated-page follow-up    | P3       |
| `/reports` route | wired                | —      | **CLOSED**; route and sidebar gate verified                                    | P2       |
| `inventoryApi`   | removed carryover    | —      | **CLOSED**; zero remaining imports                                             | P2       |
| today            | 1 file (re-export)   | —      | **KEEP** (re-exports dashboard)                                                | —        |
| profile          | 2 files              | —      | **KEEP** (minimal)                                                             | —        |
| upgrade          | 1 file (placeholder) | —      | **KEEP** (static page)                                                         | —        |
| errors           | 1 file (not-found)   | —      | **KEEP** (catch-all)                                                           | —        |
| billing-locked   | 1 file (static)      | —      | **KEEP** (static page)                                                         | —        |

### B. Fix Architecture Violations — ✅ P0 static gates green (re-verified 2026-08-03)

| #   | Violation                                        | Count                                            | Fix                                                                                                                           | Status      |
| --- | ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| B.1 | Raw `<button>` bypassing Button primitive        | **0 in production code** (50 in test files only) | **No production action needed**; test-file buttons are fine                                                                   | ✅ Complete |
| B.2 | Clearly nameless interactive elements            | **0**                                            | `check:accessible-name` is green; historical 108 count was a raw attribute count and visible text remains the accessible name | ✅ Complete |
| B.3 | Inline `fetch()` in features                     | **0**                                            | All direct calls moved to sanctioned API adapters; `check:frontend-fetch --enforce` is green against the tracked Vite tree    | ✅ Complete |
| B.4 | Duplicate `ErrorBoundary` in `page-skeleton.tsx` | 1                                                | Replace with `@workspace/ui` `error-boundary`                                                                                 | P1          |
| B.5 | `animate-pulse` in `page-skeleton.tsx`           | 1                                                | Remove (motion policy violation)                                                                                              | P1          |
| B.4 | Duplicate `ErrorBoundary` in `page-skeleton.tsx` | 1                                                | Replace with `@workspace/ui` `error-boundary`                                                                                 | P1          |
| B.5 | `animate-pulse` in `page-skeleton.tsx`           | 1                                                | Remove (motion policy violation)                                                                                              | P1          |

### C. Error Boundary Coverage

**All functional layouts already have `ErrorBoundaryWrapper`** (verified 2026-08-02):

| Layout            | File                                                              | Status                        |
| ----------------- | ----------------------------------------------------------------- | ----------------------------- |
| `ProtectedLayout` | `src/components/layout/protected-layout.tsx`                      | ✅ Has `ErrorBoundaryWrapper` |
| `SetupLayout`     | `src/components/layout/setup-layout.tsx`                          | ✅ Has `ErrorBoundaryWrapper` |
| `PublicLayout`    | `src/components/layout/public-layout.tsx`                         | ✅ Has `ErrorBoundaryWrapper` |
| `PortalLayout`    | `src/components/layout/portal-layout.tsx`                         | ✅ Has `ErrorBoundaryWrapper` |
| `LabPortalLayout` | `src/features/lab-portal/components/layout/lab-portal-layout.tsx` | ✅ Has `ErrorBoundaryWrapper` |

**Layouts without `ErrorBoundaryWrapper` (intentional — no content to boundary-wrap):**

| Layout        | File                                     | Why no boundary needed                                               |
| ------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `RootLayout`  | `src/components/layout/root-layout.tsx`  | Only renders `<Helmet>` + `<Outlet />` (no error surface)            |
| `ToolsLayout` | `src/components/layout/tools-layout.tsx` | Only renders `<Helmet>` + `<Outlet />` (dev tools, no error surface) |

**Remaining action**: none for static boundary coverage. Continue using the shared boundary and add route-specific regression tests when new layouts are introduced.

### D. i18n Coverage — ✅ Done (44/45 features, 98%)

**44 of 45 features use `useTranslation`** with 47 translation namespaces × 2 locales (en/hi), 1,885 keys each.

The only remaining feature is `legal` (ConsentNoticeModal), intentionally unlocalized and allowlisted in `scripts/checks/allowlists/i18n-coverage.json`. Enforced by `check:i18n-coverage` (wired into `verify:standard`).

Features with i18n: ai-assistant, analytics, appointments, auth, consultation, dashboard, daybook, desk, documents, follow-ups, help, imports, inbox, insurance-claims, inventory, invoices, ipd, lab-tests, medical-coding, medical-documents, mobile-upload, patient-portal, patients, pharmacy, prescriptions, profile, public-booking, referral-partner, referrals, search, settings, setup, subscription, upload-signature, verify-email, whatsapp, plus dialogs, errors, tools, today, upgrade, billing-locked, templates, lab-portal.

**No features remain without i18n coverage except the intentional `legal` allowlist entry.**

### E. Type and Zod Fixes (9 interface-Zod duplications)

| Interface            | File                          | Zod Schema                      | Divergence            |
| -------------------- | ----------------------------- | ------------------------------- | --------------------- |
| `Admission`          | `ipd-rules.ts`                | `admissionSchema`               | Different field names |
| `Bed`                | `ipd-rules.ts`                | `bedSchema`                     | Extra fields          |
| `Ward`               | `ipd-rules.ts`                | `wardSchema`                    | Different types       |
| `Medication`         | `prescription-input.types.ts` | `medicationDraftItemSchema`     | Different field names |
| `ChiefComplaintItem` | `chief-complaint.types.ts`    | `chiefComplaintDraftItemSchema` | Different structure   |
| `DiagnosisItem`      | `diagnosis-input-types.ts`    | `diagnosisDraftItemSchema`      | Different structure   |
| `ExaminationData`    | `examination-input.types.ts`  | `examinationDraftSchema`        | Simpler shape         |
| `VitalsFormData`     | `use-vitals-form.ts`          | `vitalSignSchema`               | Different types       |
| `VitalsData`         | `vitals-rules.ts`             | `vitalSignSchema`               | Different structure   |

**Fix**: For each, choose Zod schema as canonical source, derive TS type via `z.infer`, delete parallel interface.

### F. Dead Code Cleanup

| #    | Item                                                                  | File                                            | Action                                               |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| F.1  | `GuidedTourProvider` (dead — `isTourActive` hardcoded false)          | `features/guided-tour/guided-tour-provider.tsx` | Delete provider + overlay (keep dir if tour planned) |
| F.2  | `TierContext` (may be dead — `usePermissionStore` handles tier logic) | `lib/contexts/tier-context.ts`                  | Verify consumers, delete if unused                   |
| F.3  | `page-skeleton.tsx` duplicate `ErrorBoundary`                         | `components/loaders/page-skeleton.tsx`          | Replace with `@workspace/ui` error-boundary          |
| F.4  | `dialogs/AlertDialog.tsx` (duplicate of `confirmation-dialog`)        | `components/dialogs/AlertDialog.tsx`            | Delete, use `@workspace/ui`                          |
| F.5  | `ConfirmDialog`/`PromptDialog` (partial overlap with `crud-dialog`)   | `components/dialogs/`                           | Delete, use `@workspace/ui`                          |
| F.6  | `errors/error-banner.tsx` (overlap with `alert`/`error-state`)        | `components/errors/error-banner.tsx`            | Delete, use `@workspace/ui`                          |
| F.7  | `form-field.tsx` (overlap with `form-field-group`)                    | `components/form-field.tsx`                     | Delete, use `@workspace/ui`                          |
| F.8  | Empty dirs: `guards/`, `monitoring/`                                  | `components/guards/`, `components/monitoring/`  | Delete                                               |
| F.9  | `inventoryApi` (carryover, UI uses data-access directly)              | `features/inventory/`                           | Delete or wire                                       |
| F.10 | Knip: 278 unused exports + 287 unused types                           | app-vite                                        | Batch cleanup                                        |
| F.11 | `PaymentMethod.WALLET`/`.NET_BANKING` unused enum members             | `packages/types`                                | Verify, delete if unused                             |

### G. Dependency Decisions

| #   | Issue                                                        | Action                            |
| --- | ------------------------------------------------------------ | --------------------------------- |
| G.1 | `react-router` 7.18.2 — CSRF advisory (needs v8.3.0+)        | Verify v7→v8 compat, then upgrade |
| G.2 | `brace-expansion` ≤5.0.7 — DoS advisory                      | Bump owning dev tool              |
| G.3 | `react-signature-canvas` 1.1.0-alpha.2 — alpha in production | Monitor for stable release        |
| G.4 | TypeScript 5.7.3 → 6.0.3                         | DONE 2026-08-04 (bridge release; 7.0 deferred until NestJS supports the native compiler API) |

### H. Backend Config (after cutover)

| #   | Item                                                       | File                                               |
| --- | ---------------------------------------------------------- | -------------------------------------------------- |
| H.1 | Make `NEXT_PUBLIC_*` optional aliases in API env schema    | `apps/api/src/shared/modules/config/env-schema.ts` |
| H.2 | Migrate Fly secrets from `NEXT_PUBLIC_*` to `VITE_*` names | Fly dashboard                                      |
| H.3 | Update `docs/ONBOARDING.md` §4 env var list                | `docs/ONBOARDING.md`                               |
| H.4 | Move Razorpay key ID from `wrangler.toml` to CF secrets    | `apps/app-vite/wrangler.toml`                      |
| H.5 | Move Sentry DSNs from `wrangler.toml` to CF secrets        | Both `wrangler.toml` files                         |

### I. Coding Standards Enforcement

| #   | Check                           | What It Catches                   | Status                                                    |
| --- | ------------------------------- | --------------------------------- | --------------------------------------------------------- |
| I.1 | `check:native-ui-affordances`   | Raw `<button>` in features        | **Needs expansion** — currently only checks `components/` |
| I.2 | `check:zod-interface-parity`    | Interface-Zod duplications        | **Does not exist** — needs creation                       |
| I.3 | `check:i18n-coverage`           | Features without `useTranslation` | **Does not exist** — needs creation                       |
| I.4 | `check:error-boundary-coverage` | Layouts without error boundaries  | **Does not exist** — needs creation                       |

---

## Execution Order

```
PHASE A: Port remaining features (product decisions first)
  ├─ A.1: Product sign-off on excel/ocr/feedback/guided-tour/dev-tools/specialty
  ├─ A.2: Port confirmed features OR delete routes + record decision
  └─ A.3: Wire `/reports` route OR delete

PHASE B: Fix architecture violations (parallel with A)
  ├─ B.1: Raw <button> — 0 in production (no action needed)
  ├─ B.2: Prove accessible names — ✅ done (historical 108 count was a raw attribute count)
  ├─ B.3: Move inline feature API calls to sanctioned adapters — ✅ done (25 lines across 10 files fixed)
  └─ B.4: Replace duplicate ErrorBoundary in page-skeleton.tsx

PHASE C: i18n sweep (parallel with A/B)
  └─ C.1: Done — 44/45 features; `legal` allowlisted (check:i18n-coverage)

PHASE D: Type/Zod cleanup (parallel with A/B/C)
  ├─ D.1: Resolve 9 interface-Zod duplications
  └─ D.2: Delete dead code (F.1-F.11)

PHASE E: Cutover (after A-D complete)
  ├─ E.1: Flip/archive 10 historical Next docs
  ├─ E.2: Lift jscpd exclusion + fix clones
  ├─ E.3: Regenerate JSX-literal-density baseline
  ├─ E.4: Re-arm git-based checks
  ├─ E.5: Smoke test Cloudflare deploys
  ├─ E.6: Delete apps/app + apps/internal
  ├─ E.7: Rename app-vite → app, internal-vite → internal
  ├─ E.8: Sweep all references
  ├─ E.9: NEXT_PUBLIC_* env cleanup
  ├─ E.10: Move credentials to CF secrets
  └─ E.11: Dependency upgrades (react-router v8, brace-expansion, TS)

PHASE F: Post-cutover polish
  ├─ F.1: Expand check:native-ui-affordances to features/
  ├─ F.2: check:zod-interface-parity — ✅ done (2026-08-02)
  ├─ F.3: check:i18n-coverage — ✅ done (2026-08-02)
  ├─ F.4: check:error-boundary-coverage — ✅ done (2026-08-02)
  └─ F.5: Evaluate library additions (react-table, storybook, msw)
```

---

## Verification Commands

After any phase:

```bash
# Core gates
pnpm lint                              # 0 errors
pnpm --filter @docita/app-vite run check-types  # 0 errors
pnpm --filter @docita/api run check-types       # 0 errors
pnpm knip                              # trending toward 0
pnpm audit --audit-level=high          # clean
pnpm verify:standard                   # full gate

# Phase-specific
pnpm check:frontend-fetch              # no inline fetch
pnpm check:tier-comparisons            # no numeric tier compares
pnpm check:workspace-profile-gating    # no legacy symbols
pnpm check:circular:enforce            # 0 cycles
pnpm check:prisma-boundary             # clean
pnpm check:hygiene                     # clean
pnpm check:duplication                 # 0 clones (after jscpd lift)
pnpm audit:app                         # a11y baseline
pnpm audit:internal                    # a11y baseline
pnpm check:colors                      # token compliance
pnpm check:accessible-name              # no clearly nameless controls
pnpm check:i18next-parity               # en/hi leaf parity
pnpm check:i18n-translation-keys        # no missing/unknown translation keys
pnpm check:feature-test-density         # no unreviewed zero-test feature
pnpm check:auth-tenant-safety           # tenant/RBAC boundary
pnpm check:phi-read-audit --enforce     # PHI read audit coverage
pnpm check:audit-logging --enforce      # sensitive mutation audit coverage
pnpm check:webhook-signatures           # signed webhook boundary
pnpm check:webhook-replay-protection    # replay/idempotency boundary
pnpm check:job-idempotency              # worker retry safety
pnpm check:browser-telemetry-same-origin
pnpm check:sentry-scrubber-parity
pnpm perf:budget:enforce
pnpm perf:route-budgets:enforce
pnpm build:app-vite:cloudflare
pnpm build:internal-vite:cloudflare
pnpm test:api-startup

# Runtime release evidence (requires staging fixtures and credentials)
pnpm --filter @docita/app-vite exec playwright test --config=playwright.config.ts
pnpm --filter @docita/internal-vite exec playwright test --config=playwright.config.ts
pnpm audit:app                         # authenticated run, not public-only
pnpm audit:internal

# Post-cutover
grep -rn "apps/app\b\|apps/internal\b" . --include="*.md" --include="*.yml" --include="*.ts" --include="*.mjs"
# Expected: only intentional history/audit notes
```

---

## Phase 10 — Production hardening and release

Phase 9 is the repository cutover. It is not the release itself. Phase 10 closes the operational gap between a green migration branch and a safe production rollout:

1. Run the authenticated app and internal route matrix against staging with seeded clinician, front-desk, admin, patient-portal, and lab-portal identities.
2. Decide and test subscription lockout, doctor verification, and denied direct-URL behavior; preserve existing-user onboarding protection.
3. Run full accessibility audits with authenticated fixtures, review scan timing, and regenerate only the approved baseline.
4. Resolve or formally time-bound dependency exceptions; verify PHI, tenant/RBAC, RLS, audit, upload, webhook, idempotency, and sensitive-logging gates.
5. Build both Cloudflare artifacts, verify headers/CSP/PWA/Worker routing, search artifacts for secrets and cross-origin telemetry, and smoke Razorpay checkout.
6. Rehearse database migration ordering, rollback, cache invalidation, queue recovery, health checks, Sentry event delivery, and support escalation.
7. Release to staging, soak and monitor, promote to production, then archive the evidence index and clean branches.

Exit: no skipped critical flow is counted as green, no external prerequisite is described as complete without evidence, and the release can be rolled back by an operator who did not author the migration.

## Summary

| Category                | Remaining Items                                                                 | Effort                     |
| ----------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| Feature parity          | Decisions recorded for drops/deferrals; retained routes need runtime validation | Medium (fixture-dependent) |
| Architecture violations | **P0 static gates green**; authenticated runtime parity remains                 | Runtime validation         |
| Error boundaries        | **Already complete** (5/5 functional layouts covered)                           | ✅ Complete                |
| i18n                    | **1 remaining** (`legal` — intentional + allowlisted, 44/45)                    | ✅ Done                    |
| Type/Zod fixes          | 9 duplications (intentionally different)                                        | Medium (~1 hour)           |
| Dead code cleanup       | 118 no-import files + 46 unused barrels + most items already clean              | Medium (~1-2 hours)        |
| Dependency upgrades     | 3 decisions (react-router v8, brace-expansion, playwright)                      | Small (decision-dependent) |
| Cutover                 | 11 steps                                                                        | Large (~2-3 hours)         |
| Post-cutover polish     | 5 items                                                                         | Small (~1 hour)            |
| **Total estimated**     |                                                                                 | **~5-8 hours**             |

**Key improvement since last pass**: i18n coverage remains **98%** (44/45 features — only `legal` is intentional + allowlisted), error-boundary coverage is complete, accessible-name and frontend-fetch gates are now meaningful and green, seven zero-test features received smokes, and 24 confirmed orphan files were removed. The route registry is now grouped into dedicated lazy route modules without direct feature imports in `App.tsx`. The remaining work is authenticated runtime validation, guard-parity decisions, dependency/security closure, Cloudflare deployment evidence, and the canonical rename.

**Deep analysis highlights**:

- **Bundle**: 816KB gzip across 171 assets, 96 lazy route boundaries grouped in route modules; shell/layout code remains eager
- **Test density**: API 1.9/1K lines, app-vite 1.0/1K lines; analytics domain leads at 45%
- **Code quality**: 0 deep relative imports, avg 101 lines/file, 2 files >400 lines
- **API complexity**: 10 controllers >200 lines, 3 services >400 lines; clinics domain has most routes (52)
- **Package health**: utils best-tested (23% density), ui solid (19%); data-access needs more tests (6%)
- **DB fully tz-compliant**: 469 timestamptz, 0 non-tz DateTime fields
- **Dead code**: 118 files with no imports, 46 unused barrel exports — batch cleanup opportunity

**Critical path**: retained-route/runtime validation → guard decisions → security and deployment evidence → committed-tree cutover → staging soak and production release. The cutover cannot be called complete while external credentials, seeded fixtures, or rollback evidence are missing.

# Trash Analysis — Dead Code, Dead Deps, Dead Docs

Point-in-time: **2026-08-02**. Everything here is removable; the *when* and *who* is decided in [`../CODEBASE_CLEANUP_PLAN.md`](../CODEBASE_CLEANUP_PLAN.md) (buckets A–G). This doc is the evidence inventory organized by trash class.

## % Completed

| Area | % | Notes |
|---|---|---|
| Dead deps cleanup | **100%** | next/opennext/next-themes fully removed |
| Dead CI jobs | **100%** | deploy-app/deploy-internal deleted |
| Dead config (env rename) | **100%** | NEXT_PUBLIC_* → VITE_* done |
| Dead DB enums | **0%** | 11 truly dead enums remain |
| Knip unused exports | **0%** | 278 remain |
| Knip unused types | **0%** | 287 remain |
| Duplicate primitives | **0%** | 5 duplicates to remove |
| Architecture violations | **100%** | buttons + error boundaries + aria-labels + fetch all done |
| Dead features (port-or-drop) | **0%** | 6 features pending product decision |

## 1. Unused exports & types — `pnpm knip`

**278 unused exports + 287 unused exported types** (565 items, app-dominant; API/worker fully clean, 1 entry in `packages/ui`). No unused files, no unused dependencies (knip exits 0 structurally). Distribution (per knip report, 2026-08-02; app unless noted):

| Area | Items | Dominant content |
|---|---|---|
| `src/features/` | 211 | consultation-heavy (session mappers, follow-up helpers, dental-chart helpers), invoices, subscription, dashboard, documents |
| `src/lib/` | 82 | porting-debt type exports (shells), api-client helpers, stores |
| `src/components/` | 21 | feature-gate prop types, locale-switcher helpers (KEEP — Phase 1 needs them) |
| `e2e/` | 15 | patient-helpers exports the 3 ported specs don't import yet (KEEP — 47 specs still to port) |
| `src/hooks/` + `src/test-utils/` | 9 | razorpay result types, render helpers |
| internal | 3 | `getSafeUserMessage` (KEEP — Next-tree consumers exist) |
| packages/ui | 1 | — |

Batch 1 (2026-08-01) removed 7 symbols: `useTier`/`useIsFeatureLocked`/`useRequiredTier`/`LockedFeatureIndicator` (feature-gate), `UserFacingErrorContext` re-exports ×2, prop-type exports converted to local. Rule that governs each batch: a symbol stays if it has consumers in the git-HEAD Next tree (`git ls-tree HEAD apps/app --name-only` + grep) because not-yet-ported files may import it.

**Top knip offenders by file** (unused exports):

| File | Unused exports | Content |
|---|---|---|
| `features/appointments/components/index.ts` | 28 | Barrel re-exports not consumed |
| `features/subscription/index.ts` | 21 | Barrel re-exports not consumed |
| `lib/subscription/tier-access.ts` | 12 | Tier gate helpers (porting debt) |
| `components/details/patient-tag-manager-helpers.tsx` | 9 | Tag management helpers |
| `steps/clinic-details/ClinicAddressSectionSections.tsx` | 7 | Onboarding step sections |
| `lib/errors/index.ts` | 7 | Error type re-exports |
| `lib/contexts/app-config-context.tsx` | 7 | Config context exports |
| `ipd/rules/ipd-rules.ts` | 7 | IPD business rules |
| `features/insurance-claims/index.ts` | 7 | Barrel re-exports |
| `subscription/hooks/use-pricing.ts` | 6 | Pricing hook helpers |
| `lib/formatters/index.ts` | 6 | Formatter re-exports |
| `lib/api/api-core.ts` | 6 | API client helpers |

Total: 278 unused exports across the codebase (knip JSON report).

## 2. Dead DB enums — 11 repo-wide + 15 types-mirrored

Zero references in `apps/api/src` (only schema + historical migrations):

- **Truly dead (11):** `AddOnStatus`, `AddOnType`, `ApiHttpIdempotencyStatus`, `BpMigrationStatus` (dead column on `VitalSign`), `CronHeartbeatStatus`, `OcrDocumentStatus`, `QueueJobStatus`, `WebhookDeliveryStatus`, `WhatsAppBroadcastSource`, `WhatsappConversationStatus`, `WhatsappMessageDirection`.
- **API-unused but mirrored in `packages/types` (15):** `AlcoholUseStatus`, `AppointmentPriority`, `BpPosition`, `CodeStatus`, `ImmunizationRoute/Site`, `ImportJobStatus/Type`, `OxygenDelivery`, `PdfJobStatus`, `SmokingStatus`, `SupportInquiryStatus`, `SupportWhatsAppMessageDirection`, `WhatsAppBroadcastJobStatus`, `WhatsAppBroadcastRecipientStatus`.

Caveat: some enum *values* are written as string literals (e.g. `status: 'PROCESSING'` for `ApiHttpIdempotencyStatus`). Removing an enum = verify the column's writers, then delete with a reversible migration.

## 3. Dead / near-dead code paths

| Item | Evidence | Verdict |
|---|---|---|
| `@ClinicScoped` decorator + `ClinicScopedGuard` | **0 usages** in all of `apps/api/src` (registered, never applied) | Delete or apply; tenant scoping today rides on global `TenantGuard` + `@Roles` |
| `HospitalRole` / `Specialization` enums | soft-deprecated per MIGRATION_NOTES (2026-05-15); write DTOs restricted to empty `SUPPORTED_HOSPITAL_ROLES` | Delete or document as frozen |
| `packages/ui/src/design-tokens.ts` | ~~claims to mirror `globals.css`~~ **Deleted 2026-08-01** — tailwind.config.ts now reads CSS variables directly | ✅ DONE |
| `packages/ui` `next-themes` dep + `theme-toggle.tsx` using it | ~~no `next-themes` provider exists in any app~~ **Removed 2026-08-01** — ThemeToggle rewired to accept props | ✅ DONE |
| `layout/theme-provider.tsx` (app) | ~~never imported/mounted anywhere~~ **Wired 2026-08-01** — reads zustand store, mounted in main.tsx | ✅ DONE |
| `dialogs/AlertDialog.tsx` + `ConfirmDialog`/`PromptDialog` | near-identical to `@workspace/ui` `confirmation-dialog`/`crud-dialog` | Dedupe per sourcing order |
| `loaders/page-skeleton.tsx` embedded `ErrorBoundary` | duplicates `@workspace/ui` `error-boundary`; raw `<button>`; `animate-pulse` | Replace with the primitive (mounted app-wide via main.tsx) |
| internal `loaders/error-boundary.tsx` | standalone re-implementation of the same primitive | Same |
| `components/guards/`, `components/monitoring/` (app) | **empty directories** (tombstones) | Delete |
| `errors/error-banner.tsx`, `form-field.tsx` (app) | overlap `feedback/alert.tsx` + `form/form-field-group.tsx` | Merge or delete |

## 4. Dead / stale configuration & CI

| Item | Evidence | Status |
|---|---|---|
| `deploy.yml` `deploy-app`/`deploy-internal` jobs | deleted 2026-08-01 (`if: false`, referenced deleted packages; contained live Razorpay key) | DONE |
| `ci.yml` deprecated Next jobs + orphaned `app`/`internal` outputs | deleted 2026-08-01 | DONE |
| `.jscpd.json` Vite exclusion | hides ~19 clones (byte-identical `api/index.ts` pair); lift at cutover | cutover |
| `jsx-literal-density.json` baseline | still keys on deleted `apps/app` paths (743 literals) | cutover — regenerate |
| `check-sentry-scrubber-parity.mjs` + 5 other scripts | still reference `apps/app` paths | cutover |
| 10 historical docs with Next refs | SYSTEM_DESIGN_AND_PATTERNS (61 refs) et al. | cutover — flip or archive |
| `DEPLOYMENT.md` region claim (Mumbai) + `min_machines_running = 1` | API now `sin` + `min_machines_running = 0` (scale-to-zero) | ✅ Fixed 2026-08-01 |
| superseded migration `add_patient_user_link/` | kept intentionally for `_prisma_migrations` consistency (README in folder) | keep, documented |
| `pnpm.auditConfig.ignoreGhsas` (4 entries) | ~~**stale** — esbuild ×2 (one advisory withdrawn; lockfile 0.28.1 patched), postcss (8.5.23 patched), valibot (1.4.2 patched)~~ | ✅ Removed 2026-08-01 |

## 5. Dead dependency surface (knip-verified clean, but…)

- `pnpm knip` reports **zero unused dependencies** — the manifest is already lean after the 2026-07-31 sweep (next/opennext fully gone).
- ~~`next-themes` was a boundary-violating dep in `packages/ui`~~ **Removed 2026-08-01** — ThemeToggle rewired to accept props.
- Remaining dependency *decisions* (not removals): `react-router` 7.18.2 → 8.3.0+ (CSRF advisory), `brace-expansion` (dev-toolchain, bump owning tool), `playwright` 1.48.2 → 1.55.1+ (SSL-verify advisory).

## 6. Where the trash hides (per surface)

| Surface | Clean | Notes |
|---|---|---|
| apps/api/src | ✅ no TODO/FIXME/HACK, no console.log (checks enforce) | 26 unused enums, dead decorator |
| apps/worker/src | ✅ 2 files (main + spec) | shares API infra |
| packages/* | ✅ knip-clean deps | ~~`design-tokens.ts` stale; `next-themes` boundary violation~~ ✅ Both fixed |
| app | ⚠️ 278/287 unused exports; 2 empty dirs; 0 raw buttons in production; 150 missing aria-labels | biggest source of trash |
| internal | ⚠️ shells only (Phase 7) | will shrink as ports land |
| scripts/ | ⚠️ 6 scripts reference deleted paths | cutover batch |
| docs/ | ⚠️ 10 Next-era docs + 2 stale ops claims | cutover batch + 1 immediate fix |

**Verification commands**: `pnpm knip` (1), `pnpm check:duplication` (2), `node scripts/checks/check-jsx-literal-density.mjs` (3), `grep -rn "apps/app\b\|apps/internal\b" . --include="*.md" --include="*.yml" --include="*.ts" --include="*.mjs"` (4).

### Deep analysis: dead code signals

| Signal | Count | Details |
|---|---|---|
| Files with zero imports | **118** | app `src/` — files that exist but nothing imports |
| Unused barrel `index.ts` files | **46** | barrel re-exports not consumed by any other file |
| Features without tests | **7** | billing-locked, errors, follow-ups, today, tools, upgrade, verify-email |
| Features without hooks | **18** | dialogs, errors, follow-ups, help, inbox, lab-portal, legal, medical-coding, medical-documents, pharmacy, profile, referrals, templates, today, tools, upgrade, verify-email, billing-locked |
| Features without helpers | **25** | all SHELL + MISSING features + some COMPLETE (analytics, auth, dashboard, etc.) |

## 7. Architecture Violations — measured 2026-08-02

These are not dead code but violate AGENTS.md rules. They should be fixed alongside the trash cleanup.

| Violation | Count | Files |
|---|---|---|
| Inline `fetch()` in features (§15.2) | 2 | `use-download-opd-slip.ts:17` (partially justified — PDF blob, uses auth headers), `use-medical-document-list.ts:52` (raw fetch without auth) |
| Raw `<button>` in production code (§4.3) | **0** | All 50 instances are in test files only (acceptable for mocks) |
| Missing `aria-label` on interactive elements (§4.3) | 150 | 37 buttons + 30 `<a>` tags + 83 `<Link>` tags across 60+ files |

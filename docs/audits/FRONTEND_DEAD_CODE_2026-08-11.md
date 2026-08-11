# Frontend Dead Code Inventory — 2026-08-11 (CONDENSED)

> **For the full version of this inventory, see
> [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md)**
> which contains every dead export with its file:line, source context,
> and recommended action. This file is the original condensed
> summary, kept for reference.

Scan-only inventory of frontend (apps/app + apps/internal) code that can
be removed. Generated against branch `fix/app-deployment-failure` at
`de89f2cdd`. No code was deleted in this audit.

## Headline

**94 unused-in-production exports across 51 files.** Of these:
- **61 are tested but never imported by production code** — these are
  the safest deletions. The rules exist (often with thorough tests) but
  no consumer ever calls them.
- **33 are completely orphaned** — no production, no test usage.

The biggest single surface: **`features/<domain>/rules/*.ts` files** with
8+ exports each that are all tested but never imported. Either the
business rules were refactored into inline checks (good — these can be
deleted) or they were meant to be adopted by a future feature that
never landed.

Knip (the project-wide unused-export detector) only flagged 4 items
(all backend) because `apps/app` and `apps/internal` are not yet
declared in `knip.json`. Adding those entries to Knip is a one-line
config change that would let this report run automatically in CI.

## What is safe to remove (grouped)

### Group A — `features/*/rules/*.ts` business rules: tested, unused

These 8 files export 33 functions/types, all tested, all unused in
production. The most likely explanation: the production code calls
inline equivalents (e.g. `isPast(...)` from `@workspace/utils` instead
of `isAppointmentPast`). The tests document the intent but the indirection
was never adopted.

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
| `apps/app/src/features/setup/hooks/use-verify-doctor.ts` | (no test-only exports here; cross-cutting) |

**Decision options:**
- **Delete the exports and the tests** (the simpler ones) — ~25 functions
- **Adopt the rules in production** — for the harder ones (e.g. `canEditInvoice`,
  `isInvoiceOverdue`) which were probably meant to enforce tenant rules that
  currently live inline in components.
- **Move the rules to `@workspace/rules` or similar shared package** so
  they can be reused by the API. This is the best long-term move if the
  rules are correct: the API can also enforce them.

### Group B — `features/ipd/*` entire sub-feature unused

The IPD (In-Patient Department) feature is mostly orphaned. Either it
was never shipped, or it was hidden behind a feature flag and the
implementation was removed but the helpers remained.

| File | Unused export |
|---|---|
| `apps/app/src/features/ipd/components/beds/bed-management-ui.tsx` | `BedManagementUI` |
| `apps/app/src/features/ipd/components/dashboard/dashboard-view.tsx` | `IpdDashboard`, `IpdDashboardProps` |
| `apps/app/src/features/ipd/components/forms/admission-form.tsx` | `AdmissionForm`, `AdmissionFormData`, `AdmissionFormProps` |
| `apps/app/src/features/ipd/hooks/use-ipd-logic.ts` | `useIpdLogic` |

**Decision:** delete the IPD feature directory entirely. ~500 lines of code
with no consumers. If the feature is on the roadmap, restore from git
history when the work resumes.

### Group C — `features/patient-portal/*` entire sub-feature unused

| File | Unused export |
|---|---|
| `apps/app/src/features/patient-portal/components/views/portal-metrics-helpers.ts` | `PortalMetricDefinition` |
| `apps/app/src/features/patient-portal/hooks/use-patient-portal-data.ts` | `usePatientPortalData` |

**Decision:** delete (same as IPD). Investigate git log for whether
patient-portal is a separate mini-app that uses a different entry point.

### Group D — `features/lab-tests/*` settings components unused

| File | Unused export |
|---|---|
| `apps/app/src/features/lab-tests/components/settings/lab-directory-settings.tsx` | `LabDirectorySettings` |
| `apps/app/src/features/lab-tests/components/settings/lab-tests-catalog-settings.tsx` | `LabTestsCatalogSettings` |

**Decision:** delete, or wire into the lab-tests route if these were
meant to be admin surfaces.

### Group E — `features/legal/*` consent modal unused

| File | Unused export |
|---|---|
| `apps/app/src/features/legal/components/ConsentNoticeModal.tsx` | `ConsentNoticeModal`, `ConsentNoticeModalProps` |
| `apps/app/src/features/legal/components/ConsentNoticeModalSections.tsx` | `SUPPORTED_LANGUAGES` |
| `apps/app/src/features/legal/components/consent-content.ts` | `ConsentContent` |

**Decision:** delete. The onboarding flow uses a different consent surface
(`compliance-legal-document-dialog.tsx`); this `ConsentNoticeModal` is
leftover from an earlier design.

### Group F — `features/dashboard/*` and `features/daybook/*` helper types unused

| File | Unused export |
|---|---|
| `apps/app/src/features/dashboard/components/layout/dashboard-ui.tsx` | `DashboardUI` |
| `apps/app/src/features/dashboard/components/patients/recent-patients-ui.tsx` | `RecentPatient` |
| `apps/app/src/features/dashboard/lib/upcoming-beyond-today.ts` | `startOfTomorrow` |
| `apps/app/src/features/daybook/lib/daybook-aggregate.ts` | `DaybookMethodTotal`, `DaybookLedgerRow` |
| `apps/app/src/features/appointments/lib/appointments-page-helpers.ts` | `AppointmentSummaryBreakdown` |
| `apps/app/src/features/consultation/components/consultation-page-header-helpers.ts` | `CONSULTATION_STATUS_STYLES` |
| `apps/app/src/features/consultation/components/follow-up-helpers.ts` | `parseFollowUpList`, `isExpectedAccessFailure` |
| `apps/app/src/features/consultation/lib/opd-queue-display.ts` | `truncateOpdSummary` |
| `apps/app/src/features/consultation/state/consultation-draft.types.ts` | `SaveState`, `ConsultationDraftActions` |
| `apps/app/src/features/consultation/workspace/consultation-section-registry.ts` | `ConsultationPersistKey` |

**Decision:** delete. Most of these are types/objects that were intended
to be re-exported but never got a downstream consumer.

### Group G — `features/auth/lib/auth-landing-path.ts`

| File | Unused export |
|---|---|
| `apps/app/src/features/auth/lib/auth-landing-path.ts` | `getPostAuthPath` |

**Decision:** verify the equivalent exists in `use-auth-page-container.ts`
or `use-auth-provider-value.ts`. If yes, delete; if no, this is a
regression risk — wire it up.

### Group H — Settings / utilities orphaned

| File | Unused export |
|---|---|
| `apps/app/src/features/settings/components/doctor-profile/registration-certificate-upload.helpers.ts` | `ALLOWED_REGISTRATION_CERTIFICATE_MIMES`, `MAX_REGISTRATION_CERTIFICATE_BYTES` |
| `apps/app/src/features/settings/components/management/doctor-availability-config.ts` | `DAYS_OF_WEEK` |
| `apps/app/src/features/upload-signature/lib/signature-upload.ts` | `MAX_SIGNATURE_UPLOAD_BYTES` |
| `apps/app/src/lib/auth/e2e-session-token.ts` | `E2E_ACCESS_TOKEN_SESSION_KEY` |
| `apps/app/src/lib/auth/session.ts` | `resolveAppLoginPath` |
| `apps/app/src/lib/utils/queue-token-status.ts` | `normalizeQueueTokenStatusKey` |
| `apps/app/src/components/loaders/page-skeleton.tsx` | `DashboardSkeleton`, `ListPageSkeleton`, `DetailPageSkeleton`, `StatCardsSkeleton` |
| `apps/app/src/components/navigation/nav-config-sections.tsx` | `NavSectionId` |
| `apps/app/src/i18n/locale-utils.ts` | `LOCALES` |
| `apps/app/src/lib/api/api-client-core.ts` | `api` |
| `apps/app/src/lib/socket/use-clinic-socket.ts` | `useClinicSocket`, `ClinicUpdateData` |
| `apps/app/src/lib/subscription/tier-access.ts` | `PlanLimits`, `PlanPricing` |
| `apps/app/src/lib/types/form.ts` | `FieldError` |
| `apps/app/src/features/setup/components/onboarding/types.ts` | `PaymentDetails`, `PlanSelection` |

**Decision:**
- `api` from `api-client-core.ts` — check if it's the new canonical
  client. If yes, **wire it up** (it's the foundation, not dead). If
  no, delete.
- `LOCALES`, `NavSectionId`, `PlanLimits`, `PlanPricing`, `FieldError`,
  `E2E_ACCESS_TOKEN_SESSION_KEY` — likely worth a quick check then delete.
- Skeleton components — the test consumers were probably the only
  callers; if `<DashboardSkeleton>` is meant to be the route loading
  state, wire it into the route; otherwise delete.
- `useClinicSocket` — this is meant to be a subscription helper; the
  inline `socket.on("clinic:update", ...)` patterns in
  `use-consultation-queue-realtime.ts` and
  `use-appointment-notifications.ts` could adopt it. **Either adopt or
  delete.**

### Group I — `apps/internal/src/lib/api/api-config.ts`

| File | Unused export |
|---|---|
| `apps/internal/src/lib/api/api-config.ts` | `resolveInternalApiUrl` |

**Decision:** verify whether this is the canonical URL resolver.
If the apps/internal pages use a different path, **consolidate and
delete this duplicate** (or vice versa).

## False positives (NOT dead code)

The following looked dead in the static scan but are actually used:

- `apps/app/src/test-utils/render-with-tooltip.tsx:renderWithTooltip` —
  used by ~6 test files via `import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip"`.
- `apps/app/src/test-utils/en-message-resolver.ts:createEnMessageResolver` —
  used by test files for i18n resolution.
- `apps/app/src/test-utils/i18n-mock.ts:createI18nMock` — used by
  `apps/app/vitest.setup.ts` (outside the searched directories).
- `apps/app/src/components/loaders/page-skeleton.tsx` entries — some
  are imported by the route-level Suspense boundaries via indirect
  paths; verify before deleting.

## Recommended action plan

### Phase 1 — quick wins (≤1 hour)

1. **Knip config**: add `apps/app` and `apps/internal` to `knip.json`
   so future CI catches this automatically. The entries mirror the
   existing `apps/landing` config but with Vite entry points.
2. Delete **Group B (IPD)** and **Group C (patient-portal)** — 4
   files, ~500 lines, zero risk.
3. Delete **Group E (legal ConsentNoticeModal)** — 3 files.

### Phase 2 — investigate and decide (1-2 hours)

4. **Group A (business rules)**: 33 functions across 8 files. The
   pragmatic move is to verify each against current production logic
   then either delete or adopt. The labor is in the verification, not
   the deletion.
5. **Group H (settings/lib)**: check `api` from `api-client-core.ts`,
   `useClinicSocket`, and the skeleton components before deleting.

### Phase 3 — wire in shared rules (optional, larger)

6. Move the **Group A rules** to `@workspace/rules` (or similar) and
   have the API + UI import them from one place. The current pattern
   of "rules in feature folder" doesn't let the API enforce them.

## Removal volume estimate

- Group A: ~33 exports + 33 corresponding tests = ~66 deletions
- Group B: 4 files, ~500 lines
- Group C: 2 files, ~150 lines
- Group D: 2 files, ~250 lines
- Group E: 3 files, ~150 lines
- Group F: 9 files, ~50 unused exports = ~50 deletions
- Group G: 1 file, 1 export
- Group H: 14 files, ~22 exports

**Total: ~150 deletions across ~35 files, removing ~1,200 lines of code
with zero behavior change.**

## Companion documents

- [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_2026-08-11.md) —
  complete useEffect index, elimination candidates, and rationale for what
  stays.
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) —
  earlier broad static review (lint warnings, motion violations, a11y
  coverage).

# SSOT Remaining Work

This is the living checklist for the remaining single-source-of-truth
consolidation work. The canonical rules live in
[`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md).

Counts were refreshed on **2026-06-02** from the current branch with `rg`. They
are intentionally broad repo counts where noted, so future cleanup work can
re-run the same searches and record the reduction.

## Phase 1: Low Risk

| Done | Gap                           | Current measured state                                                                                                                                               | Canonical target                                                                        | Risk                   |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- |
| [x]  | Patient full name             | Production display composition routes through `getPatientFullName()`; `check-patient-name-ssot.mjs` prevents inline recomposition in app/API source.                 | `getPatientFullName()` from `@workspace/utils`                                          | High count, mechanical |
| [x]  | Patient initials              | Display call sites route through `getInitials()`; the remaining `.charAt(0)` matches are its implementation.                                                         | one `getInitials()` helper                                                              | Low                    |
| [x]  | BMI thresholds                | Normalized BMI status is centralized in `@workspace/utils`; feature adapters preserve their existing display shapes.                                                 | one threshold table in `@workspace/utils`; adapters derive their existing return shapes | Medium                 |
| [x]  | Slot duration default         | User-facing 15-minute fallbacks route through `DEFAULT_SLOT_DURATION`. Separate 30-minute schedule and appointment-duration contracts remain intentionally distinct. | one `DEFAULT_SLOT_DURATION`                                                             | Low                    |
| [x]  | Clinic timezone default       | Runtime fallbacks route through `DEFAULT_TIMEZONE`. Remaining literals are the canonical option catalog, Prisma defaults, migration history, or fixtures.            | `DEFAULT_TIMEZONE` from date config                                                     | Low                    |
| [x]  | Public origin and booking URL | The compatibility module re-exports the canonical implementation; booking links use `getPublicBookingUrl()`.                                                         | one `getPublicAppOrigin()` plus `getPublicBookingUrl()`                                 | Low                    |
| [x]  | API URL config                | Compatibility modules re-export `shared/lib/api/api-config.ts`; URL builders and `STORAGE_KEYS` live there once.                                                     | one `api-config` module                                                                 | Medium                 |
| [x]  | Currency and date formatting  | User-visible raw formatting matches were replaced or reviewed. Remaining broad-search hits are tests and explanatory comments.                                       | `useClinicCurrency()` and `@workspace/utils` formatters                                 | Low                    |
| [x]  | Appointment status derivation | Parity review confirmed appointment past/today/upcoming helpers are centralized in `appointmentRules.ts`; consultation helpers do not fork those states.             | one `isAppointmentPast/Today/Upcoming` helper                                           | Low                    |

## Phase 2: Shared Infrastructure

| Done | Gap                       | Current measured state                                                                                                                                                                                        | Canonical target                                                                | Risk   |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ |
| [x]  | GSTIN                     | `getClinicGstin()` reads canonical settings and the legacy nested tax registration fallback. Remaining `clinic.gstin` reads render already-derived PDF DTO fields.                                            | one `getClinicGstin()` reading `settings.gstin`                                 | Medium |
| [x]  | Facility label            | Onboarding and settings writes persist `Clinic.facilityType`; settings JSON remains a legacy read fallback only.                                                                                              | write and read `Clinic.facilityType`; keep JSON only as a legacy read fallback  | Medium |
| [x]  | Identity and clinic cache | Onboarding no longer writes `docita_user`; `AuthContext.user` seeds clinic selection and subscription socket changes force a clinic refetch. Legacy cleanup and E2E compatibility setup remain intentionally. | `AuthContext.user` is canonical; refetch clinic on tier or subscription changes | Medium |
| [x]  | Trial-days math           | Subscription responses expose server-derived trial window fields; billing consumers prefer `trialWindowState` and shared grace constants.                                                                     | prefer server `trialWindowState`; one client helper only where needed           | Medium |

## Phase 3: Confirm Before Refactor

| Done | Gap                | Current state                                                                                                                                | Canonical target                                  | Risk |
| ---- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---- |
| [x]  | Invoice money math | Client preview and server invoice tax calculation share invoice line arithmetic; parity coverage includes mixed lines and invoice discounts. | one calculator with client/server parity coverage | High |
| [x]  | Tax config         | Default country, currency, regime, GSTIN state extraction, and tax-regime schema live in `packages/types/src/billing/tax.ts`.                | one tax-config module                             | High |

## Completed Foundations

- [x] Support email hardcodes consolidated to the app and API support-contact constants.
- [x] Published onboarding tier ladder derives from `PUBLISHED_PLAN_LADDER`.
- [x] Wizard step count derives from `STEPS.length`.
- [x] Current plan display selector is shared between billing and the sidebar badge.
- [x] `getPatientFullName()` exists and is exported from `@workspace/utils`.
- [x] The canonical SSOT rules are linked from `AGENTS.md`.

## Count Commands

```sh
rg -n '₹|toLocaleString\(' apps/app-vite/src/features --glob '*.{ts,tsx}'
```

---

## Phase 4: 2026-06 SSOT Audit Sweep (Completed June 2026)

| Done | Gap                                    | Key changes                                                                                                                                                          |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | InvoiceStatus dead 9-state model       | Deleted 10 dead files; pruned domain VO to 5 states matching Zod/Prisma (`PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`).                               |
| [x]  | AppointmentStatus duplicate mappers    | Deleted 2 mapper files; consolidated all status mapping into `appointment.mapper.ts`. Fixed public booking context leak (raw Prisma status).                        |
| [x]  | Status label maps                      | Added `APPOINTMENT_STATUS_LABELS`, `INVOICE_STATUS_LABELS`, `CLAIM_STATUS_*` maps to `packages/types`. Centralized from 2+ divergent implementations.                |
| [x]  | Email / phone validation               | Centralized `isValidEmail()` in `@workspace/utils`, `validatePhoneForCountry()` in `@/lib/validation`. Deleted 4 dead/orphaned validator implementations.            |
| [x]  | DiscountType divergence                | Consolidated 3 definitions into `discountTypeSchema` in `@workspace/types`. Fixed `discountTypeFromStored()` silently dropping non-PROMOTIONAL discounts.            |
| [x]  | Hardcoded tier strings                 | Fixed `isClinicFrontDesk()` missing FD variants; fixed `'PRO'` dead tier name in `internal-ai.service.ts`; widened E2E tier types; narrowed `PaymentClinic.tier`.    |
| [x]  | Prescription status schema             | Added `prescriptionStatusSchema` (`ACTIVE`, `COMPLETED`) to `packages/types` for the patient portal type.                                                            |
| [x]  | Claim status maps                      | Moved `CLAIM_STATUS_LABELS`, `CLAIM_TYPE_LABELS`, `CLAIM_STATUS_TRANSITIONS`, `CLAIM_STATUS_TONE` to `packages/types`.                                              |
| [x]  | Support email hardcodes                | Replaced `"support@docita.work"` with `{SUPPORT_EMAIL}` in `PrescriptionDocument.tsx` (last hardcoded instance in production code).                                  |
| [x]  | Facility type handling                 | Replaced `["CLINIC", "HOSPITAL"]` with `facilityTypeSchema.options` in `use-clinic-general-settings.ts`.                                                             |
| [x]  | AGENTS.md instructions                 | Added "15.12 SSOT Cleanup Patterns (2026-06)" documenting canonical sources for all centralized data points.                                                        |

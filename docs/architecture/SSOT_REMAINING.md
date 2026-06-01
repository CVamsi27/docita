# SSOT Remaining Work

Living checklist for the consolidation rules in
[`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md).

Counts were measured on 2026-06-01 against the current source tree. Candidate counts
are intentionally explicit: some grep hits need semantic triage before replacement,
but the same scans must reach zero or an intentional allowlist before an item is
checked off.

## Completed

- [x] Support contact: removed the dead app duplicate and moved API
  `support@docita.work` literals to one `SUPPORT_EMAIL`.
- [x] Published tier ladder: `DISPLAY_TIERS` derives from
  `PUBLISHED_PLAN_LADDER`.
- [x] Onboarding wizard step count: `TOTAL_STEPS = STEPS.length`, consumed by the
  step frame.
- [x] Current plan display: billing workspace and sidebar PLAN badge use the shared
  `resolveCurrentPlanTier` selector.
- [x] Patient full-name helper: `getPatientFullName()` exists and is exported from
  `@workspace/utils`; the adoption sweep remains below.
- [x] Appointment status scan: appointment feature status derivation is centralized
  in `appointmentRules.ts`; no second appointment-feature implementation was found.

## Phase 1 - Low Risk

| Done | Gap | Current state measured on 2026-06-01 | Canonical target | Effort / risk |
|---|---|---|---|---|
| [ ] | Patient full name | `getPatientFullName()` exists; 99 production candidate rows remain across 68 app/API files. Triage intentional non-display uses before replacement. | `getPatientFullName()` from `@workspace/utils` | high count / low risk |
| [ ] | Patient initials | 11 inline patient-initial rows remain across 5 app files, excluding the canonical helper. | `getInitials()` | low |
| [ ] | BMI thresholds and calculation | 4 non-canonical implementations remain in addition to `packages/utils`: `packages/hooks`, app shared rules, patient vitals rules, and consultation rules. | one threshold table and calculator in `@workspace/utils`; derive presentation shapes from it | medium |
| [ ] | Slot-duration default | 4 app fallback sites remain: 2 `DEFAULT_SLOT_MINUTES` constants and 2 raw `?? 15` fallbacks. | one `DEFAULT_SLOT_DURATION` | low |
| [ ] | Clinic-timezone default | 4 non-canonical source files still hard-code the fallback or form timezone. `app-config.ts` also contains the intentional option-catalog literal. | `DEFAULT_TIMEZONE` from date config | low |
| [ ] | Public booking URL | `getPublicAppOrigin()` exists in 2 files and `/book/:code` is assembled in 2 consumers. | one `getPublicAppOrigin()` plus `getPublicBookingUrl()` | low |
| [ ] | App API URL config | `config.ts` and `constants/env-config.ts` both declare `getApiUrl`, `getAppUrl`, `getSocketUrl`, route builders, and `STORAGE_KEYS`. | one `api-config` module | medium |
| [ ] | Currency formatting | 2 production UI call sites bypass the shared formatter: patient-portal receipt `toLocaleString` and current-plan account-credit symbol selection. | `useClinicCurrency()` / `@workspace/utils` formatter | low |

## Phase 2 - Medium Risk

| Done | Gap | Current state measured on 2026-06-01 | Canonical target |
|---|---|---|---|
| [ ] | GSTIN | 7 `clinic.gstin` reads remain across 5 source files even though the column does not exist. | one `getClinicGstin()` reading `settings.gstin` |
| [ ] | Facility label | 39 production source files reference `facilityLabel`; onboarding and settings still use `settings.facilityLabel` paths while `Clinic.facilityType` exists. | write/read `facilityType`; keep `settings.facilityLabel` only as a legacy read fallback |
| [ ] | Auth identity and clinic cache | `docita_user` has 2 duplicate config declarations, 1 production localStorage write, and logout cleanup paths. Clinic-id selection priority is not documented in code. | `AuthContext.user`; validate `selectedClinicId`; refetch clinic when tier/subscription changes |
| [ ] | Trial-days math | server `trialWindowState` exists, but the client still has a lockout derivation plus period-days calculations in billing display/workspace code. | prefer server `trialWindowState`; one client display helper |

## Phase 3 - Higher Risk

Confirm behavior and add parity tests before consolidating these paths.

| Done | Gap | Current state measured on 2026-06-01 | Canonical target |
|---|---|---|---|
| [ ] | Invoice money math | independent calculation paths remain in client `invoiceRules.ts`, server billing/tax services, and subscription-payment tax calculation. | one authoritative calculator; server-persisted totals for display; client/server parity test |
| [ ] | Tax config | `IN_GST` defaults and assignments remain distributed across invoice helpers, billing tax service, onboarding persistence, and subscription-payment tax calculation. | one tax-config module and one `extractStateFromGstin()` |

## Checkoff Scans

Run the relevant scan before checking an item. Narrower follow-up searches are
expected when a scan intentionally includes candidates that need review.

```sh
rg -n '\$\{[^}]*firstName[^}]*\}[^\n]*\$\{[^}]*lastName[^}]*\}|\{[^}\n]*firstName[^}\n]*\}[^\n]*\{[^}\n]*lastName[^}\n]*\}' apps/app apps/api --glob '!**/*.spec.*' --glob '!**/*.test.*' --glob '!**/e2e/**' --glob '!**/test/**' --glob '!**/seed/**' --glob '!**/scripts/**'
rg -n 'firstName(?:\.charAt\(0\)|\?\.\[0\]|\.\[0\])|lastName(?:\.charAt\(0\)|\?\.\[0\]|\.\[0\])' apps/app --glob '!**/*.spec.*' --glob '!**/*.test.*' --glob '!**/e2e/**'
rg -n 'getBMICategory|getBMIStatus|calculateBMIFromVitals|calculateBMI:|if \(bmi < 18\.5\)' packages/hooks/src packages/utils/src apps/app/shared/lib apps/app/features
rg -n 'DEFAULT_SLOT_MINUTES|slotDuration\s*\?\?\s*15|avgConsultationMinutes:\s*[^,]*\?\?\s*15' apps/app
rg -n 'Asia/Kolkata|APPOINTMENT_FORM_WALL_TIMEZONE' apps packages --glob '!**/*.spec.*' --glob '!**/*.test.*' --glob '!**/e2e/**' --glob '!**/prisma/**'
rg -n 'getPublicAppOrigin|/book/' apps/app
rg -n 'getApiUrl|getAppUrl|getSocketUrl|STORAGE_KEYS' apps/app/shared/lib
rg -n 'clinic\.gstin|settings\.gstin' apps/api apps/app
rg -n 'facilityLabel|facilityType' apps packages
rg -n 'docita_user|selectedClinicId|trialWindowState|getTrialState' apps/app apps/api
rg -n 'calculateInvoiceTotals|TaxCalculatorService|SubscriptionPaymentTaxCalculator|IN_GST|extractStateFromGstin' apps packages
```

## Verification When Items Land

- Run `pnpm lint`, targeted app/API typechecks, affected unit tests, and
  `pnpm knip` for each consolidation slice.
- Run `pnpm verify:standard` before publishing a combined slice.
- Spot-check GST invoice PDFs, onboarding facility-label persistence, Essential
  trial display in billing and sidebar, and patient name/initial/BMI rendering.
- Require an invoice preview versus server-total parity test before Phase 3 lands.

# Single Source of Truth (SSOT)

Every logical data point in Docita must have **one canonical source**; everything else
**derives or reads** from it. This doc is the authoritative list. When you add a feature,
check here first — do not introduce a second store/derivation/constant for a data point
that already exists below.

> Why this exists: a clinic on an Essential trial once displayed "Starter" because
> "current plan" had several diverging sources (`Clinic.tier`, `Subscription.plan`,
> cached `permissionStore.currentTier`, ad-hoc derivations). The fix is structural —
> one source, everything derived.

Status legend: **canonical** = the SSOT · **derive** = read/compute from canonical.
The completed consolidation checklist and count commands live in
[`SSOT_REMAINING.md`](SSOT_REMAINING.md).

---

## A. Patient / clinical derived values

Compute in ONE helper; never inline.

| Data point                                    | Canonical                                                                                      | Derive / notes                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Patient full name                             | `getPatientFullName()` (`packages/utils`)                                                      | production display composition routes through the helper; do not add inline name composition     |
| Patient age                                   | `calculateAge` / `calculateMedicalAge` (`packages/utils/.../date-calculations`)                | no inline year-diff; pick one display format                                                     |
| BMI value + category                          | `calculateBMI` / `getBMICategory` / `getBMIStatus` (`packages/utils/.../medical-calculations`) | feature adapters may preserve their display shape, but threshold logic stays in `packages/utils` |
| Initials / avatar text                        | `getInitials` (`apps/app/src/lib/formatters/index.ts`)                                  | no inline initials logic                                                                         |
| Gender / isolation / smoking / alcohol labels | label maps in `packages/types`                                                                 | add missing smoking/alcohol maps next to their schemas                                           |

## B. Billing / plan / trial

| Data point                   | Canonical                                                                     | Derive / notes                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Current PLAN (billing truth) | active `Subscription` → API → `currentPlanTier` (billing workspace)           | header card, plan grid, and **sidebar PLAN badge** use this, not the access tier |
| Access tier (feature gating) | `Clinic.tier` + `Clinic.planMode` → `usePermissionStore` via `syncFromClinic` | `currentTier` is for gating ONLY, not "current plan" display                     |
| Trial state / days-left      | server `subscription.trialWindowState` + period end                           | billing consumers prefer server-derived trial-window fields                      |
| Plan mode                    | `Clinic.planMode` → `resolveClinicPlanMode()`                                 | `permissionStore.currentMode` is a derived cache                                 |
| Pricing catalog              | `TIER_PRICING_BY_CURRENCY` (`packages/types/.../tier.ts`)                     | `getTierPricing` / `/config` derive from it; mode price via `applyModeToPricing` |
| Tier → feature map           | `FEATURE_TIER_MAP` (`tier.ts`)                                                | gating via `hasFeatureAccess`; never tier-number comparisons                     |

## C. Clinic / facility storage (column vs `settings` JSON)

| Data point                                                  | Canonical                                          | Derive / notes                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GSTIN                                                       | `Clinic.settings.gstin` (no `Clinic.gstin` column) | read through `getClinicGstin()`; PDF DTO fields are already-derived values                      |
| Facility label                                              | `Clinic.facilityType` column                       | onboarding + settings write the column; `settings.facilityLabel` is a legacy read-fallback only |
| Clinic name / id                                            | `Clinic` (server) + `user.clinicId`                | client cache derives; `localStorage selectedClinicId` is only a validated override              |
| timezone / locale / currency / mrnPrefix / legalName / maps | single column or `settings` (no dup)               | —                                                                                               |
| operatingCountryCode / dataResidency                        | `Clinic.settings.*` (no column)                    | keep, but schematize the settings read                                                          |

## D. Money / tax

| Data point                                   | Canonical                                                                               | Derive / notes                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Invoice totals (subtotal/tax/discount/total) | shared invoice line arithmetic with server-authoritative persistence                    | keep client preview and server-persisted totals covered by parity tests |
| Currency formatting                          | `@workspace/utils` `formatCurrency`/`formatPriceWithCurrency` via `useClinicCurrency()` | no raw `₹` / `toLocaleString`                                           |
| Tax regime / GST const / GSTIN→stateCode     | `packages/types/src/billing/tax.ts` + `extractStateFromGstin`                           | shared by patient-invoice and subscription tax calculators              |

## E. Time / date / scheduling

| Data point                                  | Canonical                                                                               | Derive / notes                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Clinic timezone                             | `Clinic.timezone` → `DEFAULT_TIMEZONE` (`packages/utils/.../date-config`)               | runtime fallbacks derive from the shared default; option catalogs and fixtures may use literals |
| Date/time formatting                        | `@workspace/utils` date-formatting + `DATE_FORMATS`                                     | no direct `.toLocale*`; app wrapper `@/lib/formatters` is acceptable                            |
| Slot duration                               | `Clinic.slotDuration` → one `DEFAULT_SLOT_DURATION`                                     | user-facing 15-minute fallbacks derive from the shared default                                  |
| Appointment status + is-past/today/upcoming | `AppointmentStatusEnum` + `appointmentRules.ts` helpers                                 | use `isAppointmentPast/Today/Upcoming`; do not fork the derivation                              |
| Appointment instants / day bounds / "today" | UTC store + `clinicWallDatetimeLocalToUtcIso` / `getClinicLocalDayUtcBounds` / `IClock` | already centralized                                                                             |

## F. Config / URL / identity / constants

| Data point                                                                 | Canonical                                                                                                                     | Derive / notes                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| API base / app URL                                                         | one `api-config` module (`getAppApiUrl`)                                                                                      | compatibility modules re-export the canonical builders                                             |
| Public booking / referral URL + origin                                     | one `getPublicBookingUrl()` + one `getPublicAppOrigin()`                                                                      | used by dashboard, settings, QR, email                                                             |
| Auth user identity (id/email/name/role/clinicId)                           | `AuthContext.user`                                                                                                            | permission-store role is derived; legacy storage keys exist only for cleanup and E2E compatibility |
| Support email / phone / WhatsApp copy                                      | app: `shared/lib/constants/support-contact.ts`; api: `shared/common/constants/support-contact.constants.ts` (`SUPPORT_EMAIL`) | ✅ done — no hardcoded `support@docita.work`                                                       |
| Published tier ladder/order                                                | `PUBLISHED_PLAN_LADDER` (`tier.ts`)                                                                                           | ✅ `DISPLAY_TIERS` now derives from it                                                             |
| Onboarding wizard steps (5)                                                | `STEPS` / `TOTAL_STEPS` (`clinic-registration-form-helpers`)                                                                  | ✅ `onboarding-step-frame` derives from it (`TOTAL_STEPS = STEPS.length`)                          |
| Pre-dashboard journey (4)                                                  | `STEP_META` / `TOTAL_STEPS` (`PreDashboardShell`)                                                                             | `AuthBrandingPanel.setupSteps` mirrors the same 4 phases — **keep in sync** (two representations)  |
| Tier/plan-mode catalogs, currency symbols, status/role labels, nav↔palette | `packages/types` + `nav-config.ts`                                                                                            | already single-sourced                                                                             |

---

## Rules of thumb

1. A DB value has exactly one home — a typed **column** preferred over a key in the
   `settings` JSON. If both exist, the column wins and JSON is a read-fallback only.
2. "What plan/tier the customer is on" (billing) and "what they can access" (gating) are
   **different** data points with **different** sources — don't conflate them.
3. Catalogs, enums, and their label/price/order maps live in `packages/types`; apps
   **re-export**, never re-declare.
4. Cross-cutting computations (names, ages, money, dates, URLs) live in `packages/utils`
   (or one app-shared helper) and are imported, never inlined.
5. Client caches (permission store, clinic context, localStorage) are **derived** from a
   server source and must be refreshed when that source changes.

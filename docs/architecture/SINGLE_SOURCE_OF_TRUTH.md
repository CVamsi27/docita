# Single Source of Truth (SSOT)

Every logical data point in Docita must have **one canonical source**; everything else
**derives or reads** from it. This doc is the authoritative list. When you add a feature,
check here first — do not introduce a second store/derivation/constant for a data point
that already exists below.

> Why this exists: a clinic on an Essential trial once displayed "Starter" because
> "current plan" had several diverging sources (`Clinic.tier`, `Subscription.plan`,
> cached `permissionStore.currentTier`, ad-hoc derivations). The fix is structural —
> one source, everything derived.

Status legend: **canonical** = the SSOT · **derive** = read/compute from canonical ·
**🚧** = consolidation in progress. Track remaining work and dated counts in
[`SSOT_REMAINING.md`](SSOT_REMAINING.md).

---

## A. Patient / clinical derived values
Compute in ONE helper; never inline.

| Data point | Canonical | Derive / notes |
|---|---|---|
| Patient full name | `getPatientFullName()` (`packages/utils`) 🚧 | replace all `${firstName} ${lastName}` inline concats (app + api + PDF + FHIR + search) |
| Patient age | `calculateAge` / `calculateMedicalAge` (`packages/utils/.../date-calculations`) | no inline year-diff; pick one display format |
| BMI value + category | `calculateBMI` / `getBMICategory` (`packages/utils/.../medical-calculations`) 🚧 | remove dups in `vitals-rules`, `consultationRules`, `shared/lib/rules`, api `vitals.factory`; reconcile `getBMIStatus` vs `getBMICategory` |
| Initials / avatar text | `getInitials` (`apps/app/shared/lib/formatters/text-helpers`) | no inline initials logic |
| Gender / isolation / smoking / alcohol labels | label maps in `packages/types` | add missing smoking/alcohol maps next to their schemas |

## B. Billing / plan / trial
| Data point | Canonical | Derive / notes |
|---|---|---|
| Current PLAN (billing truth) | active `Subscription` → API → `currentPlanTier` (billing workspace) 🚧 | header card, plan grid, **sidebar PLAN badge** must use this — not the access tier |
| Access tier (feature gating) | `Clinic.tier` + `Clinic.planMode` → `usePermissionStore` via `syncFromClinic` | `currentTier` is for gating ONLY, not "current plan" display |
| Trial state / days-left | server `subscription.trialWindowState` + period end 🚧 | collapse duplicated trial-days math into one helper |
| Plan mode | `Clinic.planMode` → `resolveClinicPlanMode()` | `permissionStore.currentMode` is a derived cache |
| Pricing catalog | `TIER_PRICING_BY_CURRENCY` (`packages/types/.../tier.ts`) | `getTierPricing` / `/config` derive from it; mode price via `applyModeToPricing` |
| Tier → feature map | `FEATURE_TIER_MAP` (`tier.ts`) | gating via `hasFeatureAccess`; never tier-number comparisons |

## C. Clinic / facility storage (column vs `settings` JSON)
| Data point | Canonical | Derive / notes |
|---|---|---|
| GSTIN | `Clinic.settings.gstin` (no `Clinic.gstin` column) 🚧 | one `getClinicGstin()`; drop dead `clinic.gstin` reads in PDF/invoice |
| Facility label | `Clinic.facilityType` column 🚧 | onboarding + settings write the column; `settings.facilityLabel` is a legacy read-fallback only |
| Clinic name / id | `Clinic` (server) + `user.clinicId` 🚧 | client cache derives; `localStorage selectedClinicId` only as a validated override |
| timezone / locale / currency / mrnPrefix / legalName / maps | single column or `settings` (no dup) | — |
| operatingCountryCode / dataResidency | `Clinic.settings.*` (no column) | keep, but schematize the settings read |

## D. Money / tax
| Data point | Canonical | Derive / notes |
|---|---|---|
| Invoice totals (subtotal/tax/discount/total) | ONE calculator (shared util or server-authoritative) 🚧 | client preview must equal server-persisted total (parity test) |
| Currency formatting | `@workspace/utils` `formatCurrency`/`formatPriceWithCurrency` via `useClinicCurrency()` | no raw `₹` / `toLocaleString` |
| Tax regime / GST const / GSTIN→stateCode | one `tax-config` + one `extractStateFromGstin` 🚧 | shared by patient-invoice and subscription tax calculators |

## E. Time / date / scheduling
| Data point | Canonical | Derive / notes |
|---|---|---|
| Clinic timezone | `Clinic.timezone` → `DEFAULT_TIMEZONE` (`packages/utils/.../date-config`) 🚧 | remove hardcoded `"Asia/Kolkata"` + `APPOINTMENT_FORM_WALL_TIMEZONE` |
| Date/time formatting | `@workspace/utils` date-formatting + `DATE_FORMATS` | no direct `.toLocale*`; app wrapper `@/lib/formatters` is acceptable |
| Slot duration | `Clinic.slotDuration` → one `DEFAULT_SLOT_DURATION` 🚧 | remove triplicated `DEFAULT_SLOT_MINUTES = 15` |
| Appointment status + is-past/today/upcoming | `AppointmentStatusEnum` + one derivation helper 🚧 | one `isAppointmentPast/Today/Upcoming` |
| Appointment instants / day bounds / "today" | UTC store + `clinicWallDatetimeLocalToUtcIso` / `getClinicLocalDayUtcBounds` / `IClock` | already centralized |

## F. Config / URL / identity / constants
| Data point | Canonical | Derive / notes |
|---|---|---|
| API base / app URL | one `api-config` module (`getAppApiUrl`) 🚧 | remove duplicate `config.ts` / `constants/env-config.ts` |
| Public booking / referral URL + origin | one `getPublicBookingUrl()` + one `getPublicAppOrigin()` 🚧 | used by dashboard, settings, QR, email |
| Auth user identity (id/email/name/role/clinicId) | `AuthContext.user` 🚧 | remove write-only `localStorage docita_user`; permission-store role is derived |
| Support email / phone / WhatsApp copy | app: `shared/lib/constants/support-contact.ts`; api: `shared/common/constants/support-contact.constants.ts` (`SUPPORT_EMAIL`) | ✅ done — no hardcoded `support@docita.work` |
| Published tier ladder/order | `PUBLISHED_PLAN_LADDER` (`tier.ts`) | ✅ `DISPLAY_TIERS` now derives from it |
| Onboarding wizard steps (5) | `STEPS` / `TOTAL_STEPS` (`clinic-registration-form-helpers`) | ✅ `onboarding-step-frame` derives from it (`TOTAL_STEPS = STEPS.length`) |
| Pre-dashboard journey (4) | `STEP_META` / `TOTAL_STEPS` (`PreDashboardShell`) | `AuthBrandingPanel.setupSteps` mirrors the same 4 phases — **keep in sync** (two representations) |
| Tier/plan-mode catalogs, currency symbols, status/role labels, nav↔palette | `packages/types` + `nav-config.ts` | already single-sourced |

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

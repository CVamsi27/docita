# Billing & access-gating audit — 2026-05-07

Snapshot of what shipped this iteration and what remains. Keep narrow scope: this doc covers tier/role gating, billing UX, and SaaS GST invoicing. Patient (Flow B) and clinic-payment-settings (Flow A) per [PAYMENT_FLOWS.md](./PAYMENT_FLOWS.md) are out of scope here.

## What changed in this iteration

### New billing tier: HOSPITAL

- Added between Professional and Enterprise on the published ladder.
- Pricing (monthly, INR): `7999`. Annual derives via `deriveAnnualPrice` (~17% off list).
- Limits: 25 doctors, 5 branches, 75 users, 8,000 consultations/mo, 250 GB storage.
- Pooled WhatsApp: 6,000 msgs/mo included; lower overage rate than Professional.
- Wired through [packages/types/src/billing/tier.ts](../packages/types/src/billing/tier.ts), Prisma `ClinicTier` enum (additive migration `20260507120000_add_hospital_clinic_tier`), backend `ClinicTierEnum`, `tier.guard.ts`, overage scheduler, `UpgradeSubscriptionDtoSchema`, and frontend pricing-config / TierCard / TierChangeDialog / plan highlights.

### Billing/Settings UX

- Removed redundant top "Plan and workspace" card on Settings → Billing; replaced with a one-line summary above the alerts. The full plan info lives in `CurrentPlanCard` inside `BillingSubscriptionWorkspace`.
- Per-card annual savings badge ("Save ₹X/yr") on `TierCard` when YEARLY is selected.
- Usage-based plan recommender alert that appears when current usage exceeds the active tier's included quotas, suggesting the smallest covering tier.

### SaaS GST tax invoice

- Subscription PDF endpoint already existed at `GET /subscription/billing/payments/:id/invoice.pdf`; verified it's exposed in `subscriptions.controller.ts` and consumed via `BillingHistoryTable.receiptUrl`.
- Buyer tax snapshot now prefers `clinic.settings.taxSettings.legalName` over the trade name when generating the bill-to block on subscription invoices.
- StateCode auto-derives from GSTIN (first 2 digits) when not set explicitly, so place-of-supply (CGST+SGST vs IGST) resolves correctly even if the operator skipped that field.

### Onboarding / settings GST capture

- New `legalName` field on `ClinicDetailsDto` (onboarding) and `ClinicGeneralSettings` (post-signup).
- Onboarding workflow now persists `legalName` into `clinic.settings.taxSettings.legalName`.
- StateCode no longer needs explicit collection because it's derived from GSTIN; we surface this in the subscription invoice without an extra prompt.

## Single source of truth — access matrix

`packages/types/src/access/access-matrix.ts` defines a single `APP_ACCESS_MATRIX` with `read`/`write` requirements (roles, permissions), `feature` (Tier-gated), and `comingSoon` flags per target. **Both FE and BE consume this matrix** — see usage map below. This is good architecture; we should keep extending it rather than adding ad-hoc per-controller checks.

### Roles in the system

- `INTERNAL` — full access (back-office); short-circuits to `true` everywhere.
- `ADMIN` — clinic owner; manages staff, billing, clinic settings.
- `ADMIN_DOCTOR` — admin who is also a clinician; superset of ADMIN + clinical permissions.
- `DOCTOR` — clinical workflow without admin/billing.
- `NURSE` — care-coordination subset.
- `RECEPTIONIST` — front-desk subset (patients, appointments, invoices).
- `PATIENT` — view-only on appointments via patient portal.

`BILLING_ROLES` and `CLINIC_ADMIN_ROLES` are restricted to `ADMIN` and `ADMIN_DOCTOR`.

### Tiers in the system

`STARTER (0) → ESSENTIAL (1) → PROFESSIONAL (2) → ENTERPRISE (3) → INTELLIGENCE (4 — add-on) → FRONT_DESK (5) → HOSPITAL (6)`. Numeric ordering is *for* `hasFeatureAccess` only; the published ladder for upgrade/downgrade UX is `STARTER → FRONT_DESK → ESSENTIAL → PROFESSIONAL → HOSPITAL → ENTERPRISE`. `FRONT_DESK_BLOCKED_FEATURES` overrides numeric `>=` comparison for FRONT_DESK.

## FE/BE gating parity — page-by-page

Centralized matrix means the **role and feature requirements are identical on FE and BE for matrix-driven targets.** What differs is *how* each side enforces.

| Surface | FE enforcement | BE enforcement | Status |
|---|---|---|---|
| Sidebar items | `nav-config.ts` reads matrix → hides items the user can't read | n/a (UI only) | OK |
| Page route guard | `lib/access-routes.ts` + `lib/access-policy.ts` | Controllers via decorators / `tier.guard.ts` + role decorators | OK for matrix-listed pages |
| Patients API | `useAccess(API_PATIENTS_READ/WRITE)` | `patients.controller.ts` decorator | OK |
| Appointments | `useAccess(API_APPOINTMENTS)` | `appointments.controller.ts` decorator | OK |
| Prescriptions | role + feature | `prescription.controller.ts` decorator | OK |
| Invoices / Desk settlement | role + feature | `invoices.controller.ts` + `desk` write restrictions | OK |
| WhatsApp | role + feature | `whatsapp.controller.ts` | OK |
| Lab tests / Inventory / Queue | role + feature | each controller | OK |
| Subscription billing | `BILLING_ROLES` only via `PAGE_SETTINGS_SUBSCRIPTION` | `subscriptions.controller.ts` requires `BILLING_ROLES` | OK |
| Patient self-portal | n/a | dedicated `patient-portal` module enforces patient-id scoping | Outside this matrix; covered separately |

### Likely gaps (worth a follow-up sweep, not blocking)

These are areas where the matrix exists but local code may still rely on ad-hoc checks. Each is a small targeted PR.

1. **Specialty pages** (`PAGE_SPECIALTY`, `PAGE_HOSPITAL`) — front-desk workspace correctly blocks clinical UI, but I did not re-verify *every* clinical page route guard imports `getAccessRequirement(PAGE_*)`. Suggested check: grep for routes under `apps/app/app/(protected)/...` that don't render `<RouteAccessGate target=...>` — if any clinical page renders unconditionally, add the gate.
2. **Settings tabs visibility** — `use-settings-logic.ts` derives visible tabs from access matrix today (verified). One edge case: the *Subscription* tab is hidden for non-billing roles (`ADMIN_BILLING_ROLES`); confirm by signing in as `RECEPTIONIST` and checking that `tab=billing-subscription` doesn't appear and `/settings?tab=billing-subscription` redirects.
3. **Comparison table tier order** — `Object.values(Tier).sort((a,b) => a-b)` produces enum-numeric order. Now that `HOSPITAL=6`, the columns appear after FRONT_DESK rather than between Professional and Enterprise. The published ladder in `PRICING_DIALOG_TIERS` is correct, but `comparison-table.tsx` should sort by published-ladder rank, not numeric Tier. Pre-existing issue, surfaced again by the new tier.
4. **Front-desk feature copy** — `FRONT_DESK_BLOCKED_FEATURES` covers clinical features, but several promised "PLANNED" features (FULL_EHR, MULTI_LOCATION_ANALYTICS, AI_*) have no shipping implementation. The FAQ + comparison still advertises them as "Planned" with a `comingSoon` badge — verify each is rendered with the badge, not as "available."
5. **Plan-change DTO** — added `HOSPITAL` to `UpgradeSubscriptionDtoSchema.newPlan`. Activation use-cases (`activate-subscription.use-case.ts`) accept any `ClinicTier.fromString`, so they pick up HOSPITAL automatically.
6. **Seed data** — `seed-billing-subscriptions.ts` does not include HOSPITAL in its sample list. Low priority; only affects local dev fixtures.

## Promised vs implemented features

Reads `FEATURE_DISPLAY` in `tier.ts`:

- **GA, real**: paper scanning, patient management, calendar, prescriptions, invoicing, basic analytics, medical coding, role mgmt, doctor signature, leave mgmt, WhatsApp messaging, lab tests, inventory, queue management, audit logs, insurance billing (basic), digital intake forms, OCR basic, advanced analytics.
- **Marked PLANNED in product** (`availability: "PLANNED"` and/or `comingSoon: true`): `FULL_EHR`, `API_ACCESS`, `MULTI_LOCATION_ANALYTICS`, `CUSTOM_BRANDING`, `DATA_WAREHOUSE_EXPORT`, `SSO`, `BULK_IMPORT_SUITE`, `MULTI_CLINIC`, `BROADCAST_CAMPAIGNS`, all `AI_*` features, `PREDICTIVE_NO_SHOW`, `PATIENT_SEGMENTATION`, `ANOMALY_DETECTION`.
- The comparison table renders these with the `comingSoon` indicator already, so customers aren't being misled — but if marketing is selling any of them as live, that copy needs to align.

## What the user can verify now

1. Sign in as ADMIN → Settings → Billing & Subscription. Top of page: clean one-line workspace summary (no redundant card). Recommender alert appears only when usage > included.
2. Toggle Yearly. Each non-current TierCard shows a green "Save ₹X/yr" badge.
3. Hospital plan card visible in the grid with ₹7,999/mo (or local-currency equivalent), priority between Professional and Enterprise.
4. Pay any subscription invoice → click PDF download → tax invoice shows the registered legal name (if set) and CGST+SGST/IGST split based on auto-derived state code.
5. Settings → Clinic info: new "Legal name (for tax invoice)" field saves and is reflected on the next subscription invoice.
6. Onboarding step 1: same legal name field appears under GSTIN.

## Open follow-ups (recommended)

- Sort comparison-table columns by published ladder, not numeric Tier.
- Verify each `(protected)/*` page has a `RouteAccessGate` matching its `APP_ACCESS_TARGET`.
- Add HOSPITAL row to `seed-billing-subscriptions.ts` for parity in local fixtures.
- Add an admin-side view to *display* the auto-derived state code on Clinic settings so operators can confirm it.
- Decide whether HOSPITAL should also unlock `DATA_WAREHOUSE_EXPORT` (currently it does because numeric tier=6 ≥ ENTERPRISE=3); if not, add an explicit `HOSPITAL_BLOCKED_FEATURES` set similar to `FRONT_DESK_BLOCKED_FEATURES`.

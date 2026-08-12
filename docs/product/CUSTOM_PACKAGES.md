# Plan model: Tier × Mode

> Every billed plan is the **combination of a tier (Starter → Enterprise) and
> a PlanMode (Full / Front Desk / Core)**. Customers pick both at signup; the
> UI surfaces them as two orthogonal toggles (mode pill + monthly/yearly +
> tier card).

## The five tiers

`STARTER`, `ESSENTIAL`, `PROFESSIONAL`, `HOSPITAL`, `ENTERPRISE`.

This is the only published ladder — `PUBLISHED_PLAN_LADDER` in
[`packages/types/src/billing/tier.ts`](../../packages/types/src/billing/tier.ts).

Legacy `FRONT_DESK`, `FRONT_DESK_CLINIC`, `FRONT_DESK_HOSPITAL` DB tier enum
values are kept for backward compatibility (schema is additive-locked) but
**auto-mapped** by `mapDbClinicTierToTierAndMode`:

| Legacy DB tier         | Resolves to                     |
|------------------------|---------------------------------|
| `FRONT_DESK`           | `(ESSENTIAL, mode=FRONT_DESK)`  |
| `FRONT_DESK_CLINIC`    | `(PROFESSIONAL, mode=FRONT_DESK)` |
| `FRONT_DESK_HOSPITAL`  | `(HOSPITAL, mode=FRONT_DESK)`   |

UI flows never let the customer pick a legacy tier value directly. They land
on the new (tier, mode) pair via the toggle.

## The three modes

`PlanMode = FULL | FRONT_DESK | CORE`.

| Mode        | Pricing multiplier | What it unlocks                                                        |
|-------------|--------------------|------------------------------------------------------------------------|
| FULL        | × 1.00 (default)   | Every feature the tier unlocks.                                        |
| FRONT_DESK  | × 0.70             | Reception scheduling, queue, billing, WhatsApp. **No clinical workflows.** |
| CORE        | × 0.80             | Clinical workflows. **No WhatsApp messaging, no AI assist.**           |

The set of features blocked by each mode lives in `MODE_BLOCKED_FEATURES`
([same file](../../packages/types/src/billing/tier.ts)):

- `FRONT_DESK` reuses the long-standing `FRONT_DESK_BLOCKED_FEATURES` set
  (prescriptions, EHR, AI-clinical, multi-doctor, …).
- `CORE` blocks WhatsApp messaging, broadcast, auto-reminders, and all AI
  features (prescription assistant, diagnosis hints, smart-task engine,
  no-show prediction, segmentation, anomaly detection).
- `FULL` blocks nothing.

**Adding/removing a feature from a mode is a one-line edit** in
`MODE_BLOCKED_FEATURES`.

## Architecture

| Concern                         | Location                                                                                         |
|---------------------------------|--------------------------------------------------------------------------------------------------|
| Mode enum + helpers             | `packages/types/src/billing/tier.ts` (`planModeSchema`, `PLAN_MODE_INFO`, `MODE_BLOCKED_FEATURES`) |
| Tier × mode pricing             | `applyModeToPricing(base, mode)` in the same file                                                |
| Mode-specific tier highlights   | `MODE_TIER_HIGHLIGHTS` in the same file (used by tier cards on landing + upgrade)                |
| Available modes per tier        | `getAvailableModesForTier(tier)` — Starter is FULL-only; everyone else gets all three            |
| DB column                       | `Clinic.planMode` (default `FULL`) — additive migration `20260528120000_add_clinic_plan_mode`    |
| Legacy auto-map                 | `mapDbClinicTierToTierAndMode` in `packages/types/src/access/clinic-tier-map.ts`                 |
| Backend gating                  | `hasFeatureAccess(tier, feature, hasIntelligence, overrides, mode)` + `assertClinicHasFeatureOrThrow` |
| Frontend gating                 | `usePermissionStore().canAccess(...)` reads `currentMode`                                        |
| Frontend pricing UI             | `apps/app/src/features/subscription/components/billing-plans-section.tsx` (Mode toggle + tier grid) |
| Landing pricing                 | `apps/landing/src/components/pricing-section.tsx` (Mode toggle)                                 |
| Onboarding plan picker          | `apps/app/src/features/onboarding/components/steps/plan-selection-step-*`                            |

## How `hasFeatureAccess` decides

```
isFeatureGenerallyAvailable(feature) === false        → DENY
MODE_BLOCKED_FEATURES[mode].has(feature)              → DENY      (mode wall)
OVERRIDABLE_FEATURES.has(feature) && override defined → override
requiredTier === Tier.INTELLIGENCE                    → hasIntelligence
tier ∈ legacy FRONT_DESK_*                            → legacy FD wall
fallback                                              → numeric tier ≥ requiredTier
```

The mode block runs **before** overrides, so a clinic on `mode = CORE` cannot
have WhatsApp re-enabled via a stale `Clinic.features` entry. Per-clinic
overrides are still useful for finer-grained custom packages (e.g.
"Professional Full but with WhatsApp specifically off") via `PACKAGE_PRESETS`.

## Adding a new mode

(rare, but if you do)

1. Extend `planModeSchema` and `PlanMode` in `tier.ts`.
2. Add an entry to `PLAN_MODE_INFO` (pricing multiplier + copy).
3. Define what's blocked in `MODE_BLOCKED_FEATURES`.
4. Add the new mode value to the `PlanMode` Prisma enum (additive migration).
5. Update the toggles in `billing-plans-section.tsx` and
   `pricing-section.tsx` — both iterate `PLAN_MODES` automatically.
6. Update `mapDbClinicTierToTierAndMode` if any legacy DB tier should map to
   the new mode by default.

## Per-clinic overrides (`Clinic.features`)

Still supported for sales-led custom packages, but **mode wins**. Overrides
that try to bypass the mode block are silently denied by `hasFeatureAccess`.
The `OVERRIDABLE_FEATURES` allowlist and `clinicFeatureOverridesSchema` strip
non-overridable features at the boundary.

`PACKAGE_PRESETS` (PROFESSIONAL_NO_COMMS, HOSPITAL_CORE, …) remain as a
catalog for internal admins to apply curated override bundles. New customers
flow through the mode toggle; existing custom packages keep working.

## Things that look like modes but are not

- **Intelligence add-on** — boolean `hasIntelligence` flag on the clinic,
  unlocks AI-* features only when `mode === FULL`.
- **Billing cycle** — Monthly / Yearly — orthogonal to mode; both toggles
  appear side by side.
- **Trial / payment lock-out** — handled by `TierGuard` and subscription
  status; mode is unrelated.

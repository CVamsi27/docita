# Custom packages

> Sold to clinics that want a full clinical plan but **without** WhatsApp or AI
> features (or both). Implemented as per-clinic feature overrides on top of an
> existing tier — no new tier enum values.

## Why overrides instead of new tiers

The clinical ladder (Starter → Essential → Professional → Hospital → Enterprise)
is product-led pricing. The moment we sell "Professional without comms" as a
new tier, we get combinatorial sprawl: *without WhatsApp*, *without AI*,
*without both*, *Hospital without AI*, *Hospital without comms*, etc.

Instead, every paid tier can attach a **package preset** — a bundle of boolean
toggles stored on `Clinic.features` (Json column). Backend and frontend feature
gates honor the overrides through the same `hasFeatureAccess` path, so a
"Professional Core" clinic gets the full doctor experience minus the toggled
modules, automatically.

## Architecture (where the moving parts live)

| Concern | Location |
|---|---|
| Allowlist of toggleable features | `OVERRIDABLE_FEATURES` in [packages/types/src/billing/tier.ts](../../packages/types/src/billing/tier.ts) |
| Zod schema (parse + strip) | `clinicFeatureOverridesSchema` (same file) |
| Bundled offers | `PACKAGE_PRESETS` (same file) |
| Per-currency discount | `PackagePreset.monthlyDiscount` |
| Backend gating | `hasFeatureAccess(...)`, `assertClinicHasFeatureOrThrow(...)` |
| Frontend gating | `usePermissionStore().canAccess(...)` |
| DB column | `Clinic.features` (`@json:clinicFeatureOverridesSchema`) |
| Pricing UI metadata | `PACKAGE_PRESET_DISPLAY` in [apps/app/features/subscription/config/pricing-config.ts](../../apps/app/features/subscription/config/pricing-config.ts) |

## Sanctioned presets

| ID | Base plan | What it drops | Monthly discount (INR) |
|---|---|---|---|
| `PROFESSIONAL_NO_COMMS` | Professional | WhatsApp, broadcast, auto-reminders | ₹500 |
| `PROFESSIONAL_NO_AI` | Professional | AI prescription, diagnosis, smart-tasks, no-show / segmentation / anomaly | ₹500 |
| `PROFESSIONAL_CORE` | Professional | Both comms **and** AI | ₹1,000 |
| `HOSPITAL_NO_COMMS` | Hospital | WhatsApp, broadcast, auto-reminders | ₹500 |
| `HOSPITAL_NO_AI` | Hospital | AI features (same set as above) | ₹500 |
| `HOSPITAL_CORE` | Hospital | Both comms **and** AI | ₹1,000 |

Pricing for other currencies (USD, EUR, GBP, AUD, CAD, SGD, AED, ZAR) lives on
each preset's `monthlyDiscount` map.

## How to add a new preset

1. Add the ID to `PackagePresetId` and an entry in `PACKAGE_PRESETS`.
2. If the preset toggles a feature not yet in `OVERRIDABLE_FEATURES`, add the
   feature there first.
3. Add a display row to `PACKAGE_PRESET_DISPLAY`.
4. Add a test in
   [packages/utils/test/tier-feature-overrides.test.ts](../../packages/utils/test/tier-feature-overrides.test.ts)
   asserting which features it blocks.

No DB migration is needed — the override JSON shape is unchanged.

## How sales / admin attach a preset to a clinic

1. Pick the clinic in the Internal admin tool.
2. Choose a preset from the dropdown on the subscription card.
3. The internal flow writes the preset's `overrides` map into `Clinic.features`
   and adjusts the monthly invoice by `monthlyDiscount[clinic.currency]`.

Manually editing `Clinic.features` is discouraged. The schema strips anything
outside `OVERRIDABLE_FEATURES`, so a hand-rolled override targeting (say)
`DIGITAL_PRESCRIPTIONS` would be silently dropped on the next read.

## How `hasFeatureAccess` decides

```
isFeatureGenerallyAvailable(feature) === false   → DENY  (planned features)
OVERRIDABLE_FEATURES.has(feature) && overrides[feature] !== undefined
                                                  → overrides[feature]
requiredTier === Tier.INTELLIGENCE                → hasIntelligence
tier === 'FRONT_DESK' && FRONT_DESK_BLOCKED       → DENY
fallback                                          → getTierValue(tier) >= requiredTier
```

The override path runs **before** the tier comparison so a clinic on
Professional with `WHATSAPP_MESSAGING: false` denies WhatsApp even though
Professional would otherwise unlock it.

## Things that look like overrides but are not

- **Intelligence add-on** — `hasIntelligence` boolean on the clinic. Don't model
  it as an override.
- **Front Desk gating** — handled by `FRONT_DESK_BLOCKED_FEATURES`, not by
  per-clinic overrides.
- **Trial / payment lock-out** — handled by `TierGuard` via subscription
  status; package presets are orthogonal.

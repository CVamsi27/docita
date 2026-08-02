# Plan: "Full without WhatsApp/AI" tier — audit + recommendation

> **Historical (2026-08-02):** this audit/plan predates the Vite cutover and its
> file paths (`apps/app/...`, `apps/internal/...`) refer to the deleted Next.js
> apps. The feature-override capability it recommends is now implemented via
> `PACKAGE_PRESETS` / `Clinic.features` (AGENTS.md §15.8). Kept for decision history.

## Context

You asked for a third tier that gives full doctor access but blocks WhatsApp and AI features (auto-prescription, invoice push, AI assist). Before designing it, I audited the codebase against the layered authorization pattern you referenced (Plan → Feature → Override → Role → Can-do).

**Findings: the architecture already implements that pattern**, including the feature-override capability that makes a brand-new tier unnecessary.

## Audit summary

| Axis | Status | Evidence |
|---|---|---|
| Plans/Tiers enum | ✅ | `Tier` enum + `ClinicTier` Prisma enum |
| Feature enum | ✅ | `Feature` enum, 56 values, in [packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts) |
| Plan → Feature map | ✅ | `FEATURE_TIER_MAP` (declarative) |
| Roles | ✅ | `Role` enum: `DOCTOR, ADMIN, ADMIN_DOCTOR, RECEPTIONIST, NURSE, PATIENT, INTERNAL` in `schema.prisma` |
| Role → Action/Resource matrix (RBAC) | ✅ | `APP_PERMISSIONS_BY_ROLE` in [packages/types/src/access/access-matrix.ts:32](packages/types/src/access/access-matrix.ts:32) |
| Resource → Feature map | ✅ | `APP_ACCESS_MATRIX` (line 238) — every target declares `feature`, `tier`, `roles` |
| **Per-org feature overrides** | ✅ | `Clinic.features` JSON column + `readClinicFeatureOverrides()` in [apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts:20](apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts:20) |
| Subscription status check | ✅ | `TierGuard` validates `subscriptionStatus ∈ {ACTIVE, TRIALING, PAST_DUE, GRACE, PAUSED}` |
| Centralized `can(user, action, resource, context)` | ⚠️ | Frontend has `canAccessTarget()`; backend composes `@Roles + @RequireFeature + TierGuard` — works, but not a single entry point |
| Frontend gates | ⚠️ | Fragmented across `<FeatureGate>`, `<AccessGate>`, `useFeatureAccess`, `usePermissions` |
| ABAC (ownership / clinic scope) | ⚠️ | Implicit clinic-scoped queries + ad-hoc `if (role === DOCTOR && userId !== doctorId)` checks (e.g. `appointment-access-context.ts`); no central policy file |

**The big one:** `Clinic.features` is a `Json?` column that stores `Record<Feature, boolean>` overrides. The check in `clinic-feature-access.util.ts` already honors them: if an override exists, it wins over the tier-default. This is exactly the "custom package" mechanism your reference doc recommends.

## Recommendation: don't add a new tier — use feature overrides

Creating `PROFESSIONAL_LITE` (or similar) leads to combinatorial sprawl: *Professional without WhatsApp*, *Professional without AI*, *Professional without both*, *Hospital without WhatsApp*, etc. Five plans × 2^N feature toggles = mess.

The existing machinery already supports this cleanly. The customer segment you described (full doctor access, no WhatsApp/AI) is **Professional tier with `features: { WHATSAPP_MESSAGING: false, AI_PRESCRIPTION_ASSISTANT: false, AI_DIAGNOSIS_HINTS: false, SMART_TASK_ENGINE: false }`**.

We just need to (a) make sure pricing/UI can express the discount, and (b) close the small gaps in the layered pattern so this stays clean.

## Plan of work

### Part A — Make feature overrides a first-class product concept (small)

1. **Define an override registry** in [packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts):
   - `OVERRIDABLE_FEATURES: ReadonlySet<Feature>` — the set we allow to be toggled per-clinic (initially WhatsApp + AI features). Prevents arbitrary overrides of core clinical features.
   - `PACKAGE_PRESETS`: named bundles of overrides, e.g.
     ```ts
     PROFESSIONAL_NO_COMMS: {
       basePlan: Tier.PROFESSIONAL,
       overrides: { WHATSAPP_MESSAGING: false, AI_*: false, ... },
       discount: { INR: 1500, USD: 20, ... } // monthly off
     }
     ```
   This is the "custom package" object — it's data, not a new enum value.

2. **Type the `Clinic.features` JSON** properly. Today it's `Json?`. Add a Zod schema in `packages/types` (`ClinicFeatureOverridesSchema`) and parse on read. Update [readClinicFeatureOverrides](apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts:20) to use it. This catches typos at the boundary.

3. **Honor overrides in the frontend tier check.** The frontend `hasFeatureAccess` path (via `permission-store` → `useFeatureAccess`) already reads overrides from the clinic payload. Verify it short-circuits the same way the backend does (single trace through `packages/utils/src/billing/tier-rules.ts` + `access-policy.ts`).

4. **Pricing surface** — add a UI option in the upgrade dialog: "Professional without comms (–₹1,500/mo)" as a toggle on the Professional card, driven by `PACKAGE_PRESETS`. No new tier card. Modifies the Vite pricing surface ([apps/app-vite/src/features/subscription/hooks/use-pricing.ts](apps/app-vite/src/features/subscription/hooks/use-pricing.ts)) and the upgrade flow to persist the preset's overrides into `Clinic.features` on checkout.

### Part B — Close the layered-pattern gaps (medium, optional but recommended)

These are the ⚠️ rows in the audit. None are blocking Part A, but they pay off the next time tier/role logic changes.

5. **Single `can(user, action, resource, context)` on backend.** Create `AuthorizationService.can()` in `apps/api/src/shared/modules/auth/`. Internally it composes the existing checks: subscription status → role → feature (via tier + overrides) → ABAC. The `@Roles + @RequireFeature + TierGuard` decorators stay for declarative routes; service-layer code that today inlines checks calls `can()` instead.

6. **Single `<Can target="..." mode="read|write" />` on frontend.** Wrap `FeatureGate`, `AccessGate`, and `usePermissions` into one component + one hook (`useCan`). Old gates remain as thin wrappers during migration so we don't touch every call site.

7. **ABAC policy files.** Today ownership checks like *doctor sees only assigned appointments* live in service code (e.g. [appointment-access-context.ts](apps/api/src/domains/appointments/application/access/appointment-access-context.ts:5)). Extract per-resource policies: `apps/api/src/shared/modules/auth/policies/{appointment,patient,prescription,invoice,report}.policy.ts`. `AuthorizationService.can()` dispatches to the right policy. This is the cleanest place to add new ownership rules later.

### Part C — Database

8. **Tighten `Clinic.features` typing.** Add a JSON-schema comment in `schema.prisma` so Prisma generates the override type. Migration is a no-op (column already exists). Respects [project_db_schema_locked](memory) — purely additive at the schema-comment level.

9. **No new `ClinicTier` enum value.** Confirms the "no new tier" decision.

### Part D — Tests + docs

10. **Tests** in `packages/utils/test/`:
    - Professional + `{WHATSAPP_MESSAGING: false}` override → `hasFeatureAccess(..., WHATSAPP_MESSAGING)` returns `false`.
    - Same clinic still has access to consultations, prescriptions, invoicing.
    - Overrides outside `OVERRIDABLE_FEATURES` are rejected at the boundary.
    - `PACKAGE_PRESETS.PROFESSIONAL_NO_COMMS` applied to a clinic produces the expected access matrix.

11. **Docs:**
    - Move this plan to `docs/architecture/TIER_FEATURE_OVERRIDES_PLAN.md` per your request.
    - Update **AGENTS.md §15.8** to state: "Tier × feature is table-driven; per-org variation goes through `Clinic.features` overrides, not new tier enum values."
    - Add a short page `docs/product/CUSTOM_PACKAGES.md` listing supported `PACKAGE_PRESETS` and how sales/admin enable them.

## Key files

- **Edit:** [packages/types/src/billing/tier.ts](packages/types/src/billing/tier.ts) — add `OVERRIDABLE_FEATURES`, `PACKAGE_PRESETS`, `ClinicFeatureOverridesSchema`
- **Edit:** [apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts](apps/api/src/shared/modules/auth/utils/clinic-feature-access.util.ts) — Zod-parse overrides
- **Edit:** [apps/app-vite/src/features/subscription/hooks/use-pricing.ts](apps/app-vite/src/features/subscription/hooks/use-pricing.ts) — add preset toggle on tier cards
- **Edit:** [apps/app-vite/src/lib/stores/permission-store.ts](apps/app-vite/src/lib/stores/permission-store.ts) — surface overrides + presets to the frontend
- **New:** `apps/api/src/shared/modules/auth/authorization.service.ts` (Part B)
- **New:** `apps/api/src/shared/modules/auth/policies/*.policy.ts` (Part B)
- **New:** `apps/app-vite/src/components/auth/feature-gate.tsx` + `apps/app-vite/src/hooks/use-permissions.ts` (Part B)

## Why this beats adding a new tier

- **No combinatorial sprawl.** "Without comms," "without AI," "without both" are presets, not 3+ new tiers.
- **Sales flexibility.** Custom enterprise deals (e.g. "Hospital but no AI for a privacy-conscious clinic") become a config change, not an engineering change.
- **The pattern already exists.** `Clinic.features` + `readClinicFeatureOverrides` are in production today; we're naming and bounding them, not building from scratch.
- **Reversible.** Removing a preset is one entry deletion in `PACKAGE_PRESETS`; no DB enum, no migration.

## Verification

1. `pnpm --filter @workspace/types test` and `pnpm --filter @workspace/utils test` — override + preset tests pass.
2. `pnpm check:tier-comparisons`, `pnpm check:workspace-profile-gating` — green.
3. `pnpm dev` → upgrade dialog: toggle "no comms" on Professional, confirm price drops and confirm comparison table strikes WhatsApp + AI rows.
4. Apply preset to a test clinic. Hit WhatsApp endpoint → 403; hit consultation endpoint → 200. Switch to `DOCTOR` user → still works for clinical paths, AI buttons hidden in UI.
5. `pnpm lint && pnpm verify:standard` before pushing.
6. Manual sales-admin flow: pick a clinic in Internal admin, enable `PROFESSIONAL_NO_COMMS` preset, confirm `Clinic.features` JSON reflects the override and TierGuard honors it.

import {
  APP_ACCESS_MATRIX,
  APP_PERMISSIONS_BY_ROLE,
  TIER_SENTINEL_FEATURES,
  getAccessFeature,
  getAccessPermissions,
  getAccessRequirement,
  getAccessTier,
  isAccessComingSoon,
  shouldDenyAccessForFrontDeskMode,
  type AppAccessTarget,
  type ClinicFeatureOverrides,
  type PlanMode,
  type TierName,
  type UserRole,
  Tier,
} from "@workspace/types";
import { hasFeatureAccess } from "../billing/tier-rules.js";

export interface EffectivePermissionsInput {
  role: UserRole;
  tierName: TierName;
  planMode: PlanMode;
  hasIntelligence?: boolean;
  featureOverrides?: ClinicFeatureOverrides;
}

/**
 * Server-derived permission snapshot mirror (C7, ADR-0013). Replicates the
 * client `canAccessTarget` decision logic (same matrix helpers, same branch
 * order) so the snapshot and the offline fallback agree for identical inputs:
 * comingSoon → Front Desk mode block → roles → permissions → feature
 * (`hasFeatureAccess`) → tier (via `TIER_SENTINEL_FEATURES` + the same
 * `hasFeatureAccess` check, `{}` overrides like the client sentinel path).
 * INTERNAL is the admin-console bypass (every target true — mirrors
 * RolesGuard/INTERNAL handling; the internal app is INTERNAL-role gated).
 *
 * NON-authoritative by contract: the server remains the enforcement point;
 * the snapshot only previews decisions for the UI.
 */
export function computeEffectivePermissions(
  input: EffectivePermissionsInput,
): Record<string, { read: boolean; write: boolean }> {
  const hasIntelligence = input.hasIntelligence === true;
  const overrides = input.featureOverrides ?? {};

  if (input.role === "INTERNAL") {
    const targets = Object.keys(APP_ACCESS_MATRIX);
    return Object.fromEntries(
      targets.map((target) => [
        target,
        { read: true, write: true },
      ]),
    );
  }

  const canForTarget = (
    target: AppAccessTarget,
    mode: "read" | "write",
  ): boolean => {
    if (isAccessComingSoon(target)) return false;

    if (
      shouldDenyAccessForFrontDeskMode(
        target,
        input.role,
        input.tierName,
        input.planMode,
      )
    ) {
      return false;
    }

    const requirement = getAccessRequirement(target, mode);
    if (requirement.roles && requirement.roles.length > 0) {
      if (!requirement.roles.includes(input.role)) return false;
    }

    if (requirement.permissions && requirement.permissions.length > 0) {
      const rolePermissions = APP_PERMISSIONS_BY_ROLE[input.role];
      const hasAll = requirement.permissions.every((permission) =>
        rolePermissions.includes(permission),
      );
      if (!hasAll) return false;
    }

    const feature = getAccessFeature(target);
    if (feature) {
      if (
        !hasFeatureAccess(
          input.tierName,
          feature,
          hasIntelligence,
          overrides,
          input.planMode,
        )
      ) {
        return false;
      }
    }

    const requiredTier = getAccessTier(target);
    if (requiredTier !== undefined) {
      if (requiredTier === Tier.INTELLIGENCE) {
        if (!hasIntelligence) return false;
      } else {
        const sentinelFeature = TIER_SENTINEL_FEATURES[requiredTier];
        // Same behavior as the client `hasRequiredTier`: a tier without a
        // sentinel feature (e.g. ENTERPRISE) resolves to false — never grant
        // by default.
        if (!sentinelFeature) return false;
        if (
          !hasFeatureAccess(
            input.tierName,
            sentinelFeature,
            hasIntelligence,
            {},
            input.planMode,
          )
        ) {
          return false;
        }
      }
    }

    return true;
  };

  return Object.fromEntries(
    (Object.keys(APP_ACCESS_MATRIX) as AppAccessTarget[]).map((target) => [
      target,
      { read: canForTarget(target, "read"), write: canForTarget(target, "write") },
    ]),
  );
}

import {
  APP_ACCESS_MATRIX,
  type AppAccessTarget,
  type EffectivePermissionsResponse,
  Feature,
  getAccessFeature,
  getAccessRequirement,
  getAccessTier,
  isAccessComingSoon,
  shouldDenyAccessForFrontDeskMode,
  TIER_SENTINEL_FEATURES,
  Tier,
  type PlanMode,
  type UserRole,
} from "@workspace/types";
import { getTierName, hasFeatureAccess } from "@workspace/utils";
import { hasPermission } from "@/lib/auth/permissions";
import { parseAppPermission } from "@/lib/access-control/parse-app-permission";

interface AccessContext {
  role?: UserRole | null;
  canAccessFeature?: (feature: Feature) => boolean;
  currentTier?: Tier;
  currentMode?: PlanMode;
  hasIntelligence?: boolean;
  /**
   * C7 (ADR-0013): server-derived snapshot (non-authoritative, offline
   * fallback). When a target is present in the snapshot it wins; otherwise the
   * local matrix evaluation below applies (identical inputs produce identical
   * outcomes — the snapshot mirrors this logic).
   */
  snapshot?: EffectivePermissionsResponse["targets"];
}

function hasRequiredTier(requiredTier: Tier, context: AccessContext): boolean {
  if (requiredTier === Tier.INTELLIGENCE) return context.hasIntelligence === true;

  if (context.currentTier === undefined) return false;

  const sentinelFeature = TIER_SENTINEL_FEATURES[requiredTier];
  if (sentinelFeature) {
    return hasFeatureAccess(
      getTierName(context.currentTier),
      sentinelFeature,
      context.hasIntelligence === true,
      {},
      context.currentMode ?? "FULL",
    );
  }

  return false;
}

export function canAccessTarget(
  target: AppAccessTarget,
  context: AccessContext,
  mode: "read" | "write" = "read",
): boolean {
  const snapshotEntry = context.snapshot?.[target];
  if (snapshotEntry !== undefined) return snapshotEntry[mode];

  const policy = APP_ACCESS_MATRIX[target];
  if (!policy) return false;
  if (isAccessComingSoon(target)) return false;
  const role = context.role ?? undefined;
  if (context.currentTier !== undefined) {
    if (
      shouldDenyAccessForFrontDeskMode(
        target,
        role ?? null,
        getTierName(context.currentTier),
        context.currentMode ?? "FULL",
      )
    ) {
      return false;
    }
  }
  const requirement = getAccessRequirement(target, mode);

  if (requirement.roles && requirement.roles.length > 0) {
    if (!role || !requirement.roles.includes(role)) {
      return false;
    }
  }

  if (requirement.permissions && requirement.permissions.length > 0) {
    if (!role) return false;
    const hasAllPermissions = requirement.permissions.every((p) => {
      const parsed = parseAppPermission(p);
      return parsed ? hasPermission(role, parsed) : false;
    });
    if (!hasAllPermissions) return false;
  }
  const requiredFeature = getAccessFeature(target);
  if (requiredFeature) {
    if (
      !context.canAccessFeature ||
      !context.canAccessFeature(requiredFeature)
    ) {
      return false;
    }
  }

  const requiredTier = getAccessTier(target);
  if (requiredTier !== undefined) {
    if (!hasRequiredTier(requiredTier, context)) {
      return false;
    }
  }

  return true;
}

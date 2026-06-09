// jscpd:ignore-start
import {
  APP_ACCESS_MATRIX,
  type AppAccessTarget,
  getAccessRequirement,
  isAccessComingSoon,
  getAccessFeature,
  getAccessTier,
  shouldDenyAccessForFrontDeskMode,
} from "@workspace/types/access";
import { Feature, Tier, type PlanMode } from "@workspace/types/billing";
import { type UserRole } from "@workspace/types/shared";
import { getTierName, hasFeatureAccess } from "@workspace/utils";
import { hasPermission } from "@/lib/auth/permissions";
import { parseAppPermission } from "@/lib/access-control/parse-app-permission";

interface AccessContext {
  role?: UserRole | null;
  canAccessFeature?: (feature: Feature) => boolean;
  currentTier?: Tier;
  currentMode?: PlanMode;
  hasIntelligence?: boolean;
}

const TIER_SENTINEL_FEATURES: Partial<Record<Tier, Feature>> = {
  [Tier.STARTER]: Feature.BASIC_PATIENT_MANAGEMENT,
  [Tier.ESSENTIAL]: Feature.INVOICING,
  [Tier.PROFESSIONAL]: Feature.WHATSAPP_OWN_NUMBER,
  [Tier.HOSPITAL]: Feature.WHATSAPP_MANAGED_NUMBER,
};

function hasRequiredTier(requiredTier: Tier, context: AccessContext): boolean {
// jscpd:ignore-end
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

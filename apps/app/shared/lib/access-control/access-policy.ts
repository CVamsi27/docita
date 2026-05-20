import {
  APP_ACCESS_MATRIX,
  type AppAccessTarget,
  Feature,
  Tier,
  getAccessRequirement,
  isAccessComingSoon,
  getAccessFeature,
  getAccessTier,
  type UserRole,
  type WorkspaceProfile,
  shouldDenyAccessForWorkspaceProfile,
} from "@workspace/types";
import { getTierName, hasFeatureAccess } from "@workspace/utils";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

interface AccessContext {
  role?: UserRole | null;
  canAccessFeature?: (feature: Feature) => boolean;
  currentTier?: Tier;
  hasIntelligence?: boolean;
  workspaceProfile?: WorkspaceProfile | null;
}

const TIER_SENTINEL_FEATURES: Partial<Record<Tier, Feature>> = {
  [Tier.STARTER]: Feature.BASIC_PATIENT_MANAGEMENT,
  [Tier.ESSENTIAL]: Feature.INVOICING,
  [Tier.PROFESSIONAL]: Feature.WHATSAPP_OWN_NUMBER,
  [Tier.HOSPITAL]: Feature.WHATSAPP_MANAGED_NUMBER,
};

function hasRequiredTier(
  requiredTier: Tier,
  context: AccessContext,
): boolean {
  if (requiredTier === Tier.INTELLIGENCE) {
    return context.hasIntelligence === true;
  }

  if (context.currentTier === undefined) {
    return false;
  }

  const sentinelFeature = TIER_SENTINEL_FEATURES[requiredTier];
  if (sentinelFeature) {
    return hasFeatureAccess(
      getTierName(context.currentTier),
      sentinelFeature,
      context.hasIntelligence === true,
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

  if (
    shouldDenyAccessForWorkspaceProfile(
      target,
      role ?? null,
      context.workspaceProfile,
    )
  ) {
    return false;
  }

  const requirement = getAccessRequirement(target, mode);

  if (requirement.roles && requirement.roles.length > 0) {
    if (!role || !requirement.roles.includes(role)) {
      return false;
    }
  }

  if (requirement.permissions && requirement.permissions.length > 0) {
    if (!role) return false;
    const hasAllPermissions = requirement.permissions.every((permission) =>
      hasPermission(role, permission as Permission),
    );
    if (!hasAllPermissions) {
      return false;
    }
  }

  const requiredFeature = getAccessFeature(target);
  if (requiredFeature) {
    if (!context.canAccessFeature || !context.canAccessFeature(requiredFeature)) {
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

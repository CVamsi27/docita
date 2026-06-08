import {
  CLINIC_TYPE_FEATURES,
  type ClinicType,
  userRoleSchema,
} from "@workspace/types";
import { hasFeatureAccess, isFeatureGenerallyAvailable } from "@workspace/utils";
import { FEATURE_TIER_MAP, TIER_INFO, Tier, type Feature } from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { resolveTierName } from "./permission-state-setters";

export interface PermissionAccessContext {
  currentTier: Tier;
  currentMode: string;
  hasIntelligence: boolean;
  featureOverrides: Record<string, unknown>;
  userRole: string | null;
  clinicType: ClinicType | null;
}

export function checkFeatureAccess(
  ctx: PermissionAccessContext,
  feature: Feature,
  permission?: Permission,
): boolean {
  if (!isFeatureGenerallyAvailable(feature)) {
    return false;
  }

  if (permission && ctx.userRole) {
    const parsedRole = userRoleSchema.safeParse(ctx.userRole);
    if (!parsedRole.success || !hasPermission(parsedRole.data, permission)) {
      return false;
    }
  }

  return hasFeatureAccess(
    resolveTierName(ctx.currentTier),
    feature,
    ctx.hasIntelligence,
    ctx.featureOverrides,
    ctx.currentMode as Parameters<typeof hasFeatureAccess>[4],
  );
}

export function checkClinicTypeFeature(
  clinicType: ClinicType | null,
  feature: string,
): boolean {
  if (!clinicType) return true;

  const typeFeatures = CLINIC_TYPE_FEATURES[clinicType];
  if (!typeFeatures) return true;

  const match = Object.entries(typeFeatures).find(([key]) => key === feature);
  if (match) return match[1] === true;

  return true;
}

export function resolveRequiredTierForFeature(feature: Feature): Tier {
  return FEATURE_TIER_MAP[feature];
}

export function resolveTierDisplayInfo(tier: Tier) {
  return TIER_INFO[resolveTierName(tier)];
}

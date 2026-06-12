import {
  PUBLISHED_PLAN_LADDER,
  Tier,
  publishedPlanLadderIndex,
  type TierName,
} from "@workspace/types";

export const TIER_ICON_CLASSES: Record<TierName, string> = {
  FREE: "tier-capture",
  STARTER: "tier-capture",
  ESSENTIAL: "tier-core",
  FRONT_DESK: "tier-core",
  FRONT_DESK_CLINIC: "tier-core",
  FRONT_DESK_HOSPITAL: "tier-core",
  PROFESSIONAL: "tier-pro",
  HOSPITAL: "tier-hospital",
  ENTERPRISE: "tier-enterprise",
  INTELLIGENCE: "tier-intelligence",
};

export function resolvePublishedTierName(currentTier: Tier): TierName | null {
  for (const tierName of PUBLISHED_PLAN_LADDER) {
    if (Tier[tierName] === currentTier) return tierName;
  }
  return null;
}

export function resolveTierMovement(tierName: TierName, currentTier: Tier) {
  const currentTierName = resolvePublishedTierName(currentTier);
  const tierRank = publishedPlanLadderIndex(tierName);
  const currentTierRank = currentTierName
    ? publishedPlanLadderIndex(currentTierName)
    : -1;
  return {
    isCurrentTier: Tier[tierName] === currentTier,
    isUpgrade: tierRank > currentTierRank,
    isDowngrade: tierRank < currentTierRank,
  };
}

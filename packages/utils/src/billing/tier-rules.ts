import {
  Feature,
  FEATURE_TIER_MAP,
  FRONT_DESK_BLOCKED_FEATURES,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
  PLANNED_FEATURES,
  Tier,
  TIER_FEATURES,
  TIER_INFO,
  TIER_LIMITS,
  TIER_PRICING,
  type TierInfo,
  type TierLimits,
  type TierName,
  type TierPricing,
} from '@workspace/types';

export function isFeatureGenerallyAvailable(feature: Feature): boolean {
  return !PLANNED_FEATURES.has(feature);
}

export function getMinimumTierForFeature(feature: Feature): Tier {
  return FEATURE_TIER_MAP[feature];
}

export function assertNotIntelligenceComparison(tier: Tier): void {
  if (tier === Tier.INTELLIGENCE || tier === Tier.FRONT_DESK) {
    throw new Error(
      'Tier.INTELLIGENCE and Tier.FRONT_DESK must use feature access checks, not numeric tier comparisons.',
    );
  }
}

export function deriveAnnualPrice(monthly: number): number {
  return Math.round(monthly * 10);
}

export function getTierValue(tierName: TierName): Tier {
  if (tierName === 'FRONT_DESK') {
    return Tier.FRONT_DESK;
  }
  return Tier[tierName];
}

export function getTierName(tier: Tier): TierName {
  if (tier === Tier.FRONT_DESK) {
    return 'FRONT_DESK';
  }
  return Tier[tier] as TierName;
}

export function hasFeatureAccess(
  tier: TierName,
  feature: Feature,
  hasIntelligence = false,
): boolean {
  if (!isFeatureGenerallyAvailable(feature)) {
    return false;
  }

  const requiredTier = FEATURE_TIER_MAP[feature];

  if (requiredTier === Tier.INTELLIGENCE) {
    return hasIntelligence;
  }

  if (tier === 'FRONT_DESK') {
    if (FRONT_DESK_BLOCKED_FEATURES.has(feature)) {
      return false;
    }
    return Tier.ESSENTIAL >= requiredTier;
  }

  return getTierValue(tier) >= requiredTier;
}

export function getFeaturesForTier(tier: TierName): Feature[] {
  return (Object.keys(FEATURE_TIER_MAP) as Feature[]).filter((feature) =>
    hasFeatureAccess(tier, feature, false),
  );
}

export function getAllFeaturesUpToTier(tier: TierName): Feature[] {
  return getFeaturesForTier(tier);
}

export function getIntelligenceBundlePrice(): number {
  const totalPrice = INTELLIGENCE_ADDONS.reduce(
    (sum, addon) => sum + addon.monthlyPrice,
    0,
  );
  return Math.round(totalPrice * (1 - INTELLIGENCE_BUNDLE_DISCOUNT));
}

export function getTierInfo(tier: Tier | TierName): TierInfo {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_INFO[tierName];
}

export function getTierPricing(tier: Tier | TierName): TierPricing {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_PRICING[tierName];
}

export function getTierLimits(tier: Tier | TierName): TierLimits {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_LIMITS[tierName];
}

export function getTierFeaturesList(tier: Tier | TierName): string[] {
  const tierName = typeof tier === 'number' ? getTierName(tier) : tier;
  return TIER_FEATURES[tierName];
}

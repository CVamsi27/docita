import {
  Feature,
  FEATURE_TIER_MAP,
  FRONT_DESK_BLOCKED_FEATURES,
  INTELLIGENCE_ADDONS,
  INTELLIGENCE_BUNDLE_DISCOUNT,
  PLANNED_FEATURES,
  PUBLISHED_PLAN_LADDER,
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

const FRONT_DESK_TIER_NAMES_SET: ReadonlySet<TierName> = new Set([
  'FRONT_DESK',
  'FRONT_DESK_CLINIC',
  'FRONT_DESK_HOSPITAL',
]);

function isFrontDeskTierName(tier: TierName): boolean {
  return FRONT_DESK_TIER_NAMES_SET.has(tier);
}

/** Numeric ceiling a Front Desk SKU may reach in the clinical ladder for feature gating. Solo/Clinic ≈ Essential, Hospital ≈ Hospital (clinical features still hard-blocked by FRONT_DESK_BLOCKED_FEATURES). */
function frontDeskFeatureCeiling(tier: TierName): Tier {
  if (tier === 'FRONT_DESK_HOSPITAL') return Tier.HOSPITAL;
  if (tier === 'FRONT_DESK_CLINIC') return Tier.PROFESSIONAL;
  return Tier.ESSENTIAL;
}

export function assertNotIntelligenceComparison(tier: Tier): void {
  if (
    tier === Tier.INTELLIGENCE ||
    tier === Tier.FRONT_DESK ||
    tier === Tier.FRONT_DESK_CLINIC ||
    tier === Tier.FRONT_DESK_HOSPITAL
  ) {
    throw new Error(
      'Tier.INTELLIGENCE and Tier.FRONT_DESK* must use feature access checks, not numeric tier comparisons.',
    );
  }
}

export function deriveAnnualPrice(monthly: number): number {
  return Math.round(monthly * 10);
}

export function getTierValue(tierName: TierName): Tier {
  return Tier[tierName];
}

export function getTierName(tier: Tier): TierName {
  switch (tier) {
    case Tier.STARTER:
      return 'STARTER';
    case Tier.ESSENTIAL:
      return 'ESSENTIAL';
    case Tier.PROFESSIONAL:
      return 'PROFESSIONAL';
    case Tier.HOSPITAL:
      return 'HOSPITAL';
    case Tier.ENTERPRISE:
      return 'ENTERPRISE';
    case Tier.INTELLIGENCE:
      return 'INTELLIGENCE';
    case Tier.FRONT_DESK:
      return 'FRONT_DESK';
    case Tier.FRONT_DESK_CLINIC:
      return 'FRONT_DESK_CLINIC';
    case Tier.FRONT_DESK_HOSPITAL:
      return 'FRONT_DESK_HOSPITAL';
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

/** Numeric {@link Tier} values in published plan ladder order (excludes INTELLIGENCE add-on). */
export const PUBLISHED_TIER_LADDER: Tier[] = PUBLISHED_PLAN_LADDER.map(getTierValue);

function isFeatureKey(key: string): key is Feature {
  return key in FEATURE_TIER_MAP;
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

  if (isFrontDeskTierName(tier)) {
    if (FRONT_DESK_BLOCKED_FEATURES.has(feature)) {
      return false;
    }
    return frontDeskFeatureCeiling(tier) >= requiredTier;
  }

  return getTierValue(tier) >= requiredTier;
}

/** Ordinal tier ladder check without comparing INTELLIGENCE/FRONT_DESK numerically at call sites. */
export function meetsMinimumTier(
  tier: TierName,
  minimumTier: Tier,
  hasIntelligence = false,
): boolean {
  if (minimumTier === Tier.INTELLIGENCE) {
    return hasIntelligence;
  }

  if (
    minimumTier === Tier.FRONT_DESK ||
    minimumTier === Tier.FRONT_DESK_CLINIC ||
    minimumTier === Tier.FRONT_DESK_HOSPITAL
  ) {
    return isFrontDeskTierName(tier) && getTierValue(tier) >= minimumTier;
  }

  if (isFrontDeskTierName(tier)) {
    return frontDeskFeatureCeiling(tier) >= minimumTier;
  }

  return getTierValue(tier) >= minimumTier;
}

export function getFeaturesForTier(tier: TierName): Feature[] {
  return Object.keys(FEATURE_TIER_MAP)
    .filter(isFeatureKey)
    .filter((feature) => hasFeatureAccess(tier, feature, false));
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

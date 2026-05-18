import { Feature, FEATURE_TIER_MAP } from "@workspace/types";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { Tier, type TierName } from "@/lib/subscription/tier-access";

export interface FeatureDeltaItem {
  feature: Feature;
  name: string;
  description: string;
}

export interface TierFeatureDelta {
  gained: FeatureDeltaItem[];
  lost: FeatureDeltaItem[];
}

/**
 * Compares two tiers and returns features that would be gained (available in
 * `to` but not in `from`) and lost (available in `from` but not in `to`).
 *
 * "Available" here means: the feature has a tier requirement <= the tier
 * being checked AND the feature is generally available (GA + not coming-soon).
 */
export function getTierFeatureDelta(
  fromTier: TierName,
  toTier: TierName,
): TierFeatureDelta {
  const fromValue = tierNumericValue(fromTier);
  const toValue = tierNumericValue(toTier);

  const gained: FeatureDeltaItem[] = [];
  const lost: FeatureDeltaItem[] = [];

  for (const [featureKey, requiredTier] of Object.entries(FEATURE_TIER_MAP)) {
    const feature = featureKey as Feature;
    const details = getFeatureDetails(feature);
    if (!details.isGenerallyAvailable) continue;

    const inFrom = fromValue >= (requiredTier as number);
    const inTo = toValue >= (requiredTier as number);

    if (!inFrom && inTo) {
      gained.push({
        feature,
        name: details.name,
        description: details.description,
      });
    } else if (inFrom && !inTo) {
      lost.push({
        feature,
        name: details.name,
        description: details.description,
      });
    }
  }

  return { gained, lost };
}

function tierNumericValue(name: TierName): number {
  const value = Tier[name as keyof typeof Tier];
  return typeof value === "number" ? value : 0;
}

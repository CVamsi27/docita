import {
  Feature,
  FEATURE_TIER_MAP,
  coerceFeature,
} from "@workspace/types";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { hasFeatureAccess, type TierName } from "@/lib/subscription/tier-access";

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
  const gained: FeatureDeltaItem[] = [];
  const lost: FeatureDeltaItem[] = [];

  for (const featureKey of Object.keys(FEATURE_TIER_MAP)) {
    const feature = coerceFeature(featureKey);
    if (!feature) continue;
    const details = getFeatureDetails(feature);
    if (!details.isGenerallyAvailable) continue;

    const inFrom = hasFeatureAccess(fromTier, feature);
    const inTo = hasFeatureAccess(toTier, feature);

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

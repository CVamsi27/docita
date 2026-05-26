

import { Feature, FEATURE_TIER_MAP, Tier } from "@workspace/types";
import { hasFeatureAccess, getTierName } from "@workspace/utils";
import type { IAccessContext, IAccessRule } from "@/lib/access-control/interfaces";
import { AddOnType, isActiveAddOn } from "@/lib/access-control/interfaces";
import { parseFeature } from "@/lib/access-control/parse-feature";

export class TierBasedAccessRule implements IAccessRule {
  private readonly featureTierMap: Record<Feature, Tier>;

  constructor(featureTierMap: Record<Feature, Tier> = FEATURE_TIER_MAP) {
    this.featureTierMap = featureTierMap;
  }

  canAccess(context: IAccessContext): boolean {
    const featureKey =
      typeof context.feature === "string"
        ? parseFeature(context.feature)
        : context.feature;

    if (!featureKey) {
      return false;
    }

    const hasIntelligence = context.addOns.some(
      (addOn) =>
        addOn.type === AddOnType.INTELLIGENCE && isActiveAddOn(addOn),
    );
    const tierName = getTierName(context.subscription.tier);

    return hasFeatureAccess(tierName, featureKey, hasIntelligence);
  }

  getRuleName(): string {
    return "TierBasedAccess";
  }

  getPriority(): number {
    return 10;
  }

  getRequiredTier(feature: Feature): Tier {
    return this.featureTierMap[feature];
  }
}

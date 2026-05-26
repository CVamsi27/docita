

import { Feature, FEATURE_TIER_MAP, Tier } from "@workspace/types";
import type { IAccessContext, IAccessRule } from "@/lib/access-control/interfaces";

export class TierBasedAccessRule implements IAccessRule {
  private readonly featureTierMap: Record<Feature, Tier>;

  constructor(featureTierMap: Record<Feature, Tier> = FEATURE_TIER_MAP) {
    this.featureTierMap = featureTierMap;
  }

  canAccess(context: IAccessContext): boolean {

    if (typeof context.feature === "string") {

      const featureKey = context.feature as Feature;
      if (!(featureKey in this.featureTierMap)) {
        return false;
      }

      const requiredTier = this.featureTierMap[featureKey];
      return context.subscription.tier >= requiredTier;
    }

    const requiredTier = this.featureTierMap[context.feature];
    return context.subscription.tier >= requiredTier;
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

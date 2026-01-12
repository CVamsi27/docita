/**
 * Tier-based access control rule
 * Single Responsibility: Evaluate tier-based feature access
 */

import { Feature, FEATURE_TIER_MAP, Tier } from "@workspace/types";
import type { IAccessContext, IAccessRule } from "../interfaces";

export class TierBasedAccessRule implements IAccessRule {
  private readonly featureTierMap: Record<Feature, Tier>;

  constructor(featureTierMap: Record<Feature, Tier> = FEATURE_TIER_MAP) {
    this.featureTierMap = featureTierMap;
  }

  canAccess(context: IAccessContext): boolean {
    // Only handles Feature enum types
    if (typeof context.feature === "string") {
      // Check if it's a valid Feature enum value
      const featureKey = context.feature as Feature;
      if (!(featureKey in this.featureTierMap)) {
        return false;
      }

      const requiredTier = this.featureTierMap[featureKey];
      return context.subscription.tier >= requiredTier;
    }

    // Direct Feature enum
    const requiredTier = this.featureTierMap[context.feature];
    return context.subscription.tier >= requiredTier;
  }

  getRuleName(): string {
    return "TierBasedAccess";
  }

  getPriority(): number {
    return 10; // Lower priority than add-ons and overrides
  }

  /**
   * Get the required tier for a feature
   */
  getRequiredTier(feature: Feature): Tier {
    return this.featureTierMap[feature];
  }
}

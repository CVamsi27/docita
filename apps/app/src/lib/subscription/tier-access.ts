export {
  Feature,
  FEATURE_DISPLAY,
  FEATURE_TIER_MAP,
  Tier,
  type TierName,
} from "@workspace/types";

import { TIER_LIMITS } from "@workspace/types";
import type { TierLimits, TierPricing } from "@workspace/types";

export {
  getFeaturesForTier,
  hasFeatureAccess,
  getTierValue,
  getTierName,
  getTierInfo,
  getTierPricing,
} from "@workspace/utils";

export type { FeatureComparisonRow } from "./tier-access-comparison-rows";
export { getFeatureComparisonData } from "./tier-access-comparison-rows";

/** @alias TierLimits */
export type PlanLimits = TierLimits;

export const PLAN_LIMITS = TIER_LIMITS;

/** @alias TierPricing */
export type PlanPricing = TierPricing;



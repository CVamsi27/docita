export {
  Feature,
  FEATURE_DISPLAY,
  FEATURE_TIER_MAP,
  TIER_INFO,
  TIER_FEATURES,
  WHATSAPP_ADDON_PRICING,
  Tier,
  type TierName,
} from "@workspace/types";

import { TIER_LIMITS, TIER_PRICING } from "@workspace/types";
import type { TierLimits, TierPricing } from "@workspace/types";

export {
  getAllFeaturesUpToTier,
  getFeaturesForTier,
  getIntelligenceBundlePrice,
  hasFeatureAccess,
  meetsMinimumTier,
  isFeatureGenerallyAvailable,
  getTierValue,
  getTierName,
  getTierInfo,
  getTierPricing,
  getTierLimits,
  getTierFeaturesList,
} from "@workspace/utils";

export type { FeatureComparisonRow } from "./tier-access-comparison-rows";
export { getFeatureComparisonData } from "./tier-access-comparison-rows";

/** @alias TierLimits */
export type PlanLimits = TierLimits;

export const PLAN_LIMITS = TIER_LIMITS;

/** @alias TierPricing */
export type PlanPricing = TierPricing;

export const PLAN_PRICING = TIER_PRICING;


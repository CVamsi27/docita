export {
  Tier,
  Feature,
  FEATURE_TIER_MAP,
  TIER_INFO,
  TIER_PRICING,
  TIER_LIMITS,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  WHATSAPP_ADDON_PRICING,
  type TierName,
  type TierPricing,
  type TierLimits,
  type TierInfo,
  type FeatureDisplay,
} from "@workspace/types";

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

import {
  Feature,
  FEATURE_DISPLAY,
  Tier,
  TIER_LIMITS,
  TIER_PRICING,
  type TierPricing,
  type TierLimits,
} from "@workspace/types";
import {
  formatCountLocale,
  getAllFeaturesUpToTier,
  getTierName,
} from "@workspace/utils";

/** Linear plan ladder for onboarding highlights (excludes INTELLIGENCE add-on). */
const PLAN_TIER_LADDER: Tier[] = [
  Tier.STARTER,
  Tier.FRONT_DESK,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
];

/** @alias TierPricing */
export type PlanPricing = TierPricing;

export const PLAN_PRICING = TIER_PRICING;

/** @alias TierLimits */
export type PlanLimits = TierLimits;

export const PLAN_LIMITS = TIER_LIMITS;

export const PLAN_DESCRIPTIONS: Record<
  Tier,
  { tagline: string; description: string }
> = {
  [Tier.FREE]: {
    tagline: "Start on WhatsApp",
    description:
      "Free distribution tier for basic patient records and WhatsApp-first setup",
  },
  [Tier.STARTER]: {
    tagline: "Go digital from day one",
    description: "Basic clinical workflow for solo doctors moving off paper",
  },
  [Tier.FRONT_DESK]: {
    tagline: "Reception and operations",
    description:
      "Scheduling, queue, and billing for front desk teams without full in-app clinical workflows",
  },
  [Tier.FRONT_DESK_CLINIC]: {
    tagline: "Reception for multi-doctor clinics",
    description:
      "Front desk operations with 3-10 reception desks for multi-doctor clinics",
  },
  [Tier.FRONT_DESK_HOSPITAL]: {
    tagline: "Reception for multi-location hospitals",
    description:
      "Front desk operations across locations with OPD routing and shift handover",
  },
  [Tier.ESSENTIAL]: {
    tagline: "For solo clinics",
    description: "Clear limits, WhatsApp messaging, and simple billing",
  },
  [Tier.PROFESSIONAL]: {
    tagline: "Built for growing clinics",
    description: "Multi-doctor clinics with advanced workflows",
  },
  [Tier.HOSPITAL]: {
    tagline: "Multi-branch and multi-specialty",
    description:
      "Multi-doctor multi-branch hospitals with pooled WhatsApp, multi-location analytics, and dedicated CSM",
  },
  [Tier.ENTERPRISE]: {
    tagline: "Hospital-Grade System",
    description: "Hospital-grade solution with full customization",
  },
  [Tier.INTELLIGENCE]: {
    tagline: "AI-Powered Add-on",
    description: "Enhance your clinic with AI-powered features",
  },
};

export type { FeatureComparisonRow } from "@/lib/subscription/tier-access-comparison-rows";
export { getFeatureComparisonData } from "@/lib/subscription/tier-access-comparison-rows";

export function getPlanHighlights(
  tier: Tier,
): { name: string; included: boolean; highlight?: boolean }[] {
  const tierName = getTierName(tier);
  const limits = PLAN_LIMITS[tierName];
  const features: { name: string; included: boolean; highlight?: boolean }[] =
    [];

  features.push({
    name:
      limits.patients === 999999
        ? "Unlimited patients"
        : `Up to ${formatCountLocale(limits.patients)} patients`,
    included: true,
  });

  features.push({
    name:
      limits.doctors === 999
        ? "Unlimited doctors"
        : limits.doctors === 1
          ? "Single doctor"
          : `Up to ${limits.doctors} doctors`,
    included: true,
  });

  const currentTierFeatures = getAllFeaturesUpToTier(tierName);

  const ladderIndex = PLAN_TIER_LADDER.indexOf(tier);

  let highlightFeatures: Feature[];
  if (ladderIndex <= 0) {
    highlightFeatures = currentTierFeatures.slice(0, 3);
  } else {
    const prevTier = PLAN_TIER_LADDER.at(ladderIndex - 1);
    if (prevTier) {
      const prevTierName = getTierName(prevTier);
      const prevFeatureSet = new Set(getAllFeaturesUpToTier(prevTierName));
      const newVsPrev = currentTierFeatures.filter(
        (f) => !prevFeatureSet.has(f),
      );
      highlightFeatures = (
        newVsPrev.length > 0 ? newVsPrev : currentTierFeatures
      ).slice(0, 3);
    } else {
      highlightFeatures = currentTierFeatures.slice(0, 3);
    }
  }

  highlightFeatures.forEach((feature) => {
    features.push({
      name: FEATURE_DISPLAY[feature].name,
      included: true,
      highlight: true,
    });
  });

  if (ladderIndex > 0) {
    const prevTier = PLAN_TIER_LADDER.at(ladderIndex - 1);
    if (!prevTier) return features;
    const prevTierName = getTierName(prevTier);
    const previousFeatures = getAllFeaturesUpToTier(prevTierName);
    previousFeatures.slice(0, 2).forEach((feature) => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: true,
      });
    });
  }

  if (ladderIndex >= 0 && ladderIndex < PLAN_TIER_LADDER.length - 1) {
    const nextTier = PLAN_TIER_LADDER.at(ladderIndex + 1);
    if (!nextTier) return features;
    const nextTierName = getTierName(nextTier);
    const nextTierFeaturesFull = getAllFeaturesUpToTier(nextTierName);
    const currentFeatureSet = new Set(currentTierFeatures);
    const upcoming = nextTierFeaturesFull.filter(
      (f) => !currentFeatureSet.has(f),
    );
    upcoming.slice(0, 2).forEach((feature) => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: false,
      });
    });
  }

  return features.slice(0, 8);
}

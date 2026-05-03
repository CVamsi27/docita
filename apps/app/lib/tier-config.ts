
export {
  Tier,
  Feature,
  FEATURE_TIER_MAP,
  TIER_INFO,
  TIER_PRICING,
  TIER_LIMITS,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  getFeaturesForTier,
  getAllFeaturesUpToTier,
  getIntelligenceBundlePrice,
  hasFeatureAccess,
  isFeatureGenerallyAvailable,
  getTierValue,
  getTierName,
  getTierInfo,
  getTierPricing,
  getTierLimits,
  getTierFeaturesList,
  type TierName,
  type TierPricing,
  type TierLimits,
  type TierInfo,
  type FeatureDisplay,
} from "@workspace/types";

import {
  Feature,
  FEATURE_DISPLAY,
  FEATURE_TIER_MAP,
  getAllFeaturesUpToTier,
  getFeaturesForTier,
  isFeatureGenerallyAvailable,
  Tier,
  TIER_LIMITS,
  TIER_PRICING,
  WHATSAPP_ADDON_PRICING,
} from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";

export interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
  currency: string;
}

export const PLAN_PRICING = TIER_PRICING;

export interface PlanLimits {
  patients: number;
  doctors: number;
  storageGB: number;
  branches: number;
  appointments?: number;
  users?: number;
  prescriptions?: number;
  invoices?: number;
}

export const PLAN_LIMITS = TIER_LIMITS;

export const PLAN_DESCRIPTIONS: Record<
  Tier,
  { tagline: string; description: string }
> = {
  [Tier.STARTER]: {
    tagline: "Go digital from day one",
    description: "Basic clinical workflow for solo doctors moving off paper",
  },
  [Tier.ESSENTIAL]: {
    tagline: "For solo clinics",
    description: "Clear limits, WhatsApp messaging, and simple billing",
  },
  [Tier.PROFESSIONAL]: {
    tagline: "Built for growing clinics",
    description: "Multi-doctor clinics with advanced workflows",
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

export interface FeatureComparisonRow {
  name: string;
  category: "limit" | "feature";
  values: Record<Tier, string | boolean | number>;
}

export function getFeatureComparisonData(): FeatureComparisonRow[] {
  const tiers = [Tier.STARTER, Tier.ESSENTIAL, Tier.PROFESSIONAL, Tier.ENTERPRISE];
  const formatLimitValue = (value?: number): string => {
    if (value === undefined) return "—";
    if (value >= 999999 || value === 999) return "Unlimited";
    return formatCountLocale(value);
  };

  const rows: FeatureComparisonRow[] = [

    {
      name: "Patient Limit",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(
            PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].patients,
          ),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Doctors",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].doctors),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Storage",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          `${PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].storageGB} GB`,
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Branches",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].branches),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Consultations",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(
            PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].appointments,
          ),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Prescriptions",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(
            PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].prescriptions,
          ),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "Invoices",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          formatLimitValue(PLAN_LIMITS[Tier[t] as keyof typeof PLAN_LIMITS].invoices),
        ]),
      ) as Record<Tier, string>,
    },
    {
      name: "WhatsApp messages (incl. / mo)",
      category: "limit",
      values: Object.fromEntries(
        tiers.map((t) => {
          if (t === Tier.STARTER) return [t, "—"] as const;
          const tierName = Tier[t] as keyof typeof WHATSAPP_ADDON_PRICING;
          return [
            t,
            formatLimitValue(WHATSAPP_ADDON_PRICING[tierName].includedQuota),
          ] as const;
        }),
      ) as Record<Tier, string>,
    },

    {
      name: "Prescriptions",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          t >= FEATURE_TIER_MAP[Feature.DIGITAL_PRESCRIPTIONS],
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Appointments",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.CALENDAR_SLOTS]]),
      ) as Record<Tier, boolean>,
    },

    {
      name: "OCR Scanning",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => {
          if (t >= FEATURE_TIER_MAP[Feature.OCR_ADVANCED])
            return [t, "Advanced"];
          if (t >= FEATURE_TIER_MAP[Feature.OCR_BASIC]) return [t, "Basic"];
          return [t, false];
        }),
      ) as Record<Tier, string | boolean>,
    },
    {
      name: "Analytics",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => {
          if (t >= FEATURE_TIER_MAP[Feature.ADVANCED_ANALYTICS])
            return [t, "Advanced"];
          if (t >= FEATURE_TIER_MAP[Feature.BASIC_ANALYTICS])
            return [t, "Basic"];
          return [t, false];
        }),
      ) as Record<Tier, string | boolean>,
    },
    {
      name: "API Access",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.API_ACCESS]]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Multi-branch",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.MULTI_CLINIC]]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Inventory",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.INVENTORY]]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Lab Tests",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.LAB_TESTS]]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Queue Management",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [t, t >= FEATURE_TIER_MAP[Feature.QUEUE_MANAGEMENT]]),
      ) as Record<Tier, boolean>,
    },
  ];

  return rows;
}

export function getPlanHighlights(
  tier: Tier,
): { name: string; included: boolean; highlight?: boolean }[] {
  const tierName = Tier[tier] as keyof typeof PLAN_LIMITS;
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

  const tierFeatures = getFeaturesForTier(tierName).filter(
    isFeatureGenerallyAvailable,
  );
  const highlightFeatures = tierFeatures.slice(0, 3);

  highlightFeatures.forEach((feature) => {
    features.push({
      name: FEATURE_DISPLAY[feature].name,
      included: true,
      highlight: true,
    });
  });

  if (tier > Tier.STARTER) {
    const prevTierName = Tier[tier - 1] as keyof typeof PLAN_LIMITS;
    const previousFeatures = getAllFeaturesUpToTier(prevTierName).filter(
      isFeatureGenerallyAvailable,
    );
    previousFeatures.slice(0, 2).forEach((feature) => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: true,
      });
    });
  }

  if (tier < Tier.ENTERPRISE) {
    const nextTierName = Tier[tier + 1] as keyof typeof PLAN_LIMITS;
    const nextTierFeatures = getFeaturesForTier(nextTierName).filter(
      isFeatureGenerallyAvailable,
    );
    nextTierFeatures.slice(0, 2).forEach((feature) => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: false,
      });
    });
  }

  return features.slice(0, 8); 
}

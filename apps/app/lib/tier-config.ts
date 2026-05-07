
export {
  Tier,
  Feature,
  FEATURE_TIER_MAP,
  TIER_INFO,
  TIER_PRICING,
  TIER_LIMITS,
  TIER_FEATURES,
  FEATURE_DISPLAY,
  getAllFeaturesUpToTier,
  getFeaturesForTier,
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
  getAllFeaturesUpToTier,
  getTierName,
  hasFeatureAccess,
  Tier,
  TIER_LIMITS,
  TIER_PRICING,
  WHATSAPP_ADDON_PRICING,
} from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";

/** Linear plan ladder for onboarding highlights (excludes INTELLIGENCE add-on). */
const PLAN_TIER_LADDER: Tier[] = [
  Tier.STARTER,
  Tier.FRONT_DESK,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
];

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
  [Tier.FRONT_DESK]: {
    tagline: "Reception and operations",
    description:
      "Scheduling, queue, and billing for front desk teams without full in-app clinical workflows",
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

export interface FeatureComparisonRow {
  name: string;
  category: "limit" | "feature";
  values: Record<Tier, string | boolean | number>;
}

export function getFeatureComparisonData(): FeatureComparisonRow[] {
  const tiers = [
    Tier.STARTER,
    Tier.FRONT_DESK,
    Tier.ESSENTIAL,
    Tier.PROFESSIONAL,
    Tier.HOSPITAL,
    Tier.ENTERPRISE,
  ];
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
          const tierName = getTierName(t) as keyof typeof WHATSAPP_ADDON_PRICING;
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
          hasFeatureAccess(getTierName(t), Feature.DIGITAL_PRESCRIPTIONS),
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Appointments",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.CALENDAR_SLOTS),
        ]),
      ) as Record<Tier, boolean>,
    },

    {
      name: "OCR Scanning",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => {
          const name = getTierName(t);
          if (hasFeatureAccess(name, Feature.OCR_ADVANCED))
            return [t, "Advanced"];
          if (hasFeatureAccess(name, Feature.OCR_BASIC)) return [t, "Basic"];
          return [t, false];
        }),
      ) as Record<Tier, string | boolean>,
    },
    {
      name: "Analytics",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => {
          const name = getTierName(t);
          if (hasFeatureAccess(name, Feature.ADVANCED_ANALYTICS))
            return [t, "Advanced"];
          if (hasFeatureAccess(name, Feature.BASIC_ANALYTICS))
            return [t, "Basic"];
          return [t, false];
        }),
      ) as Record<Tier, string | boolean>,
    },
    {
      name: "API Access",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.API_ACCESS),
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Multi-branch",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.MULTI_CLINIC),
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Inventory",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.INVENTORY),
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Lab Tests",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.LAB_TESTS),
        ]),
      ) as Record<Tier, boolean>,
    },
    {
      name: "Queue Management",
      category: "feature",
      values: Object.fromEntries(
        tiers.map((t) => [
          t,
          hasFeatureAccess(getTierName(t), Feature.QUEUE_MANAGEMENT),
        ]),
      ) as Record<Tier, boolean>,
    },
  ];

  return rows;
}

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
    const prevTier = PLAN_TIER_LADDER[ladderIndex - 1]!;
    const prevTierName = getTierName(prevTier);
    const prevFeatureSet = new Set(getAllFeaturesUpToTier(prevTierName));
    const newVsPrev = currentTierFeatures.filter((f) => !prevFeatureSet.has(f));
    highlightFeatures = (
      newVsPrev.length > 0 ? newVsPrev : currentTierFeatures
    ).slice(0, 3);
  }

  highlightFeatures.forEach((feature) => {
    features.push({
      name: FEATURE_DISPLAY[feature].name,
      included: true,
      highlight: true,
    });
  });

  if (ladderIndex > 0) {
    const prevTier = PLAN_TIER_LADDER[ladderIndex - 1]!;
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
    const nextTier = PLAN_TIER_LADDER[ladderIndex + 1]!;
    const nextTierName = getTierName(nextTier);
    const nextTierFeaturesFull = getAllFeaturesUpToTier(nextTierName);
    const currentFeatureSet = new Set(currentTierFeatures);
    const upcoming = nextTierFeaturesFull.filter((f) => !currentFeatureSet.has(f));
    upcoming.slice(0, 2).forEach((feature) => {
      features.push({
        name: FEATURE_DISPLAY[feature].name,
        included: false,
      });
    });
  }

  return features.slice(0, 8);
}

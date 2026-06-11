import {
  getAvailableModesForTier,
  MODE_TIER_HIGHLIGHTS,
  PLAN_MODE_INFO,
  type PlanMode,
  type TierName,
  tierSchema,
} from "@workspace/types";
import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";

export const TIER_ORDER: readonly TierName[] = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
] as const;

const STARTER_FEATURES = [
  "Up to 50 patients",
  "Up to 50 consultations / month",
  "Digital prescriptions with PDF",
  "Patient profiles & visit history",
  "Excel import & CSV export",
  "Single doctor",
];

const ESSENTIAL_FULL_FEATURES = [
  "Unlimited patients",
  "500 consultations / month",
  "1 doctor included",
  "WhatsApp messaging (500 msgs)",
  "Lab tests & inventory",
  "Queue management",
  "Audit logs & compliance",
  "Insurance billing",
];

const PROFESSIONAL_FULL_FEATURES = [
  "Unlimited patients",
  "2,000 consultations / month",
  "Up to 5 doctors",
  "WhatsApp messaging (2,000 msgs)",
  "Multi-location analytics (planned)",
  "API access (planned)",
  "Custom letterhead (planned)",
  "Priority support with SLA",
];

const HOSPITAL_FULL_FEATURES = [
  "Everything in Professional",
  "Up to 25 doctors and 5 branches",
  "75 staff users included",
  "8,000 consultations / month",
  "WhatsApp messaging (6,000 msgs pooled)",
  "Multi-branch analytics dashboards",
  "Dedicated customer success manager",
  "Higher API throughput for integrations",
];

const ENTERPRISE_FULL_FEATURES = [
  "Unlimited patients, users & branches",
  "Everything in Hospital",
  "Data warehouse export (BI tools)",
  "Custom contract & invoicing",
  "Dedicated account manager",
  "Custom SLA",
];

const FULL_FEATURES_BY_TIER: Partial<Record<TierName, string[]>> = {
  STARTER: STARTER_FEATURES,
  ESSENTIAL: ESSENTIAL_FULL_FEATURES,
  PROFESSIONAL: PROFESSIONAL_FULL_FEATURES,
  HOSPITAL: HOSPITAL_FULL_FEATURES,
  ENTERPRISE: ENTERPRISE_FULL_FEATURES,
};

function getFeaturesForTier(
  id: TierName,
  mode: PlanMode,
  fallback: string[],
): string[] {
  if (mode === "FULL") return FULL_FEATURES_BY_TIER[id] ?? fallback;
  return (
    MODE_TIER_HIGHLIGHTS[mode]?.[id] ?? FULL_FEATURES_BY_TIER[id] ?? fallback
  );
}

function applyModeMultiplier(
  amount: number | "custom",
  mode: PlanMode,
): number | "custom" {
  if (amount === "custom") return amount;
  return Math.round(amount * PLAN_MODE_INFO[mode].pricingMultiplier);
}

export const SETUP_START_PRICE = formatTierPrice(
  4999,
  FALLBACK_PRICING_CONFIG.currency.symbol,
);

export interface PricingTierData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  pricing: { monthly: number | "custom"; yearly: number | "custom" };
}

interface PricingTierCardViewModel {
  tierId: TierName;
  effectiveMode: PlanMode;
  isFeatured: boolean;
  features: string[];
  adjustedPrice: number | "custom";
  listYearly: number | null;
  yearlySavings: number | null;
  modeSuffix: string | null;
  modeMismatched: boolean;
}

/** Resolves the pricing, feature list, and mode-mismatch state shown on a pricing tier card. */
export function resolvePricingTierCardViewModel(
  tier: PricingTierData,
  selectedMode: PlanMode,
  isYearly: boolean,
): PricingTierCardViewModel {
  const parsedTierId = tierSchema.safeParse(tier.id);
  const tierId: TierName = parsedTierId.success ? parsedTierId.data : "STARTER";
  const supportedModes = getAvailableModesForTier(tierId);
  const effectiveMode: PlanMode = supportedModes.includes(selectedMode)
    ? selectedMode
    : "FULL";
  const isFeatured = tierId === "ESSENTIAL";
  const features = getFeaturesForTier(tierId, effectiveMode, tier.features);
  const adjustedMonthly = applyModeMultiplier(
    tier.pricing.monthly,
    effectiveMode,
  );
  const adjustedYearly = applyModeMultiplier(
    tier.pricing.yearly,
    effectiveMode,
  );
  const adjustedPrice = isYearly ? adjustedYearly : adjustedMonthly;
  const listYearly =
    typeof adjustedMonthly === "number" ? adjustedMonthly * 12 : null;
  const yearlySavings =
    isYearly &&
    listYearly !== null &&
    typeof adjustedYearly === "number" &&
    listYearly > adjustedYearly
      ? listYearly - adjustedYearly
      : null;
  const modeSuffix =
    effectiveMode === "FULL"
      ? null
      : ` · ${PLAN_MODE_INFO[effectiveMode].name}`;
  const modeMismatched =
    effectiveMode !== selectedMode && selectedMode !== "FULL";

  return {
    tierId,
    effectiveMode,
    isFeatured,
    features,
    adjustedPrice,
    listYearly,
    yearlySavings,
    modeSuffix,
    modeMismatched,
  };
}

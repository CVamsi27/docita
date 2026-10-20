import {
  getAvailableModesForTier,
  MODE_TIER_HIGHLIGHTS,
  PLAN_MODE_INFO,
  type PlanMode,
  SUBSCRIPTION_TRIAL_DAYS,
  TIER_LIMITS,
  type TierLimits,
  type TierName,
  tierSchema,
} from "@workspace/types";
import { formatPlanLimitCount } from "@workspace/utils";
import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";

/**
 * These bullets are curated marketing copy, but every number in them is plan
 * data, so it is read from the canonical limits instead of being retyped. A
 * tier limit change can no longer leave the pricing page advertising the old
 * number.
 */
function planCount(id: TierName, field: keyof TierLimits): string {
  return formatPlanLimitCount(TIER_LIMITS[id][field]);
}

const FREE_TRIAL_COPY = `${SUBSCRIPTION_TRIAL_DAYS}-day free trial`;

const FULL_FEATURES_BY_TIER: Partial<Record<TierName, string[]>> = {
  STARTER: [
    `Up to ${planCount("STARTER", "patients")} patients`,
    `Up to ${planCount("STARTER", "appointments")} consultations / month`,
    "Digital prescriptions with PDF",
    "Patient profiles & visit history",
    "Excel import & CSV export",
    "Single doctor",
    FREE_TRIAL_COPY,
  ],
  ESSENTIAL: [
    `${planCount("ESSENTIAL", "patients")} patients`,
    `${planCount("ESSENTIAL", "appointments")} consultations / month`,
    `${planCount("ESSENTIAL", "doctors")} doctor included`,
    "WhatsApp messaging (500 msgs)",
    "Lab tests & inventory",
    "Queue management",
    "Audit logs & compliance",
    "Insurance billing",
    FREE_TRIAL_COPY,
  ],
  PROFESSIONAL: [
    `${planCount("PROFESSIONAL", "patients")} patients`,
    `${planCount("PROFESSIONAL", "appointments")} consultations / month`,
    `Up to ${planCount("PROFESSIONAL", "doctors")} doctors`,
    "WhatsApp messaging (2,000 msgs)",
    "Multi-location analytics",
    "Priority support with SLA",
    FREE_TRIAL_COPY,
  ],
  HOSPITAL: [
    "Everything in Professional",
    `Up to ${planCount("HOSPITAL", "doctors")} doctors and ${planCount(
      "HOSPITAL",
      "branches",
    )} branches`,
    `${planCount("HOSPITAL", "users")} staff users included`,
    `${planCount("HOSPITAL", "appointments")} consultations / month`,
    "WhatsApp messaging (6,000 msgs pooled)",
    "Multi-branch analytics dashboards",
    "Dedicated customer success manager",
    FREE_TRIAL_COPY,
  ],
  ENTERPRISE: [
    `${planCount("ENTERPRISE", "patients")} patients, users & branches`,
    "Everything in Hospital",
    "Custom contract & invoicing",
    "Dedicated account manager",
    "Custom SLA",
  ],
};

function resolveFeatureBullets(
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
  const features = resolveFeatureBullets(tierId, effectiveMode, tier.features);
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
  return {
    tierId,
    effectiveMode,
    isFeatured,
    features,
    adjustedPrice,
    listYearly,
    yearlySavings,
  };
}

import { MODE_TIER_HIGHLIGHTS, PLAN_MODE_INFO, type PlanMode, type TierName } from "@workspace/types";
import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";

export const TIER_ORDER: readonly TierName[] = [
  "STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE",
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

export function getFeaturesForTier(id: TierName, mode: PlanMode, fallback: string[]): string[] {
  if (mode === "FULL") return FULL_FEATURES_BY_TIER[id] ?? fallback;
  return MODE_TIER_HIGHLIGHTS[mode]?.[id] ?? FULL_FEATURES_BY_TIER[id] ?? fallback;
}

export function applyModeMultiplier(amount: number | "custom", mode: PlanMode): number | "custom" {
  if (amount === "custom") return amount;
  return Math.round(amount * PLAN_MODE_INFO[mode].pricingMultiplier);
}

export const SETUP_START_PRICE = formatTierPrice(4999, FALLBACK_PRICING_CONFIG.currency.symbol);

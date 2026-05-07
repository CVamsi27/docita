import { Tier, TIER_INFO, TIER_LIMITS, TIER_PRICING } from "@workspace/types";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@workspace/utils";

const DEFAULT_CURRENCY_SYMBOL =
  CURRENCY_OPTIONS.find((option) => option.value === DEFAULT_CURRENCY)?.symbol ??
  DEFAULT_CURRENCY;

export interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
  currency: string;
}

export interface PlanLimits {
  patients: number;
  doctors: number;
  storageGB: number;
  branches: number;
}

export interface TierConfig {
  id: string;
  tier: number;
  name: string;
  description: string;
  tagline: string;
  color: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: string[];
}

export interface FeatureDisplay {
  name: string;
  description: string;
}

export interface TierConfigData {
  tiers: TierConfig[];
  featureTierMap: Record<string, number>;
  featureDisplay: Record<string, FeatureDisplay>;
  intelligenceInfo: {
    name: string;
    description: string;
    tagline: string;
    color: string;
    pricing: PlanPricing;
    features: string[];
  };
}

export const DEFAULT_PRICING: Record<Tier, PlanPricing> = {
  [Tier.STARTER]: {
    monthly: TIER_PRICING.STARTER.monthly,
    yearly: TIER_PRICING.STARTER.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.FRONT_DESK]: {
    monthly: TIER_PRICING.FRONT_DESK.monthly,
    yearly: TIER_PRICING.FRONT_DESK.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.ESSENTIAL]: {
    monthly: TIER_PRICING.ESSENTIAL.monthly,
    yearly: TIER_PRICING.ESSENTIAL.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.PROFESSIONAL]: {
    monthly: TIER_PRICING.PROFESSIONAL.monthly,
    yearly: TIER_PRICING.PROFESSIONAL.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.HOSPITAL]: {
    monthly: TIER_PRICING.HOSPITAL.monthly,
    yearly: TIER_PRICING.HOSPITAL.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.ENTERPRISE]: {
    monthly: TIER_PRICING.ENTERPRISE.monthly,
    yearly: TIER_PRICING.ENTERPRISE.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
  [Tier.INTELLIGENCE]: {
    monthly: TIER_PRICING.INTELLIGENCE.monthly,
    yearly: TIER_PRICING.INTELLIGENCE.yearly,
    currency: DEFAULT_CURRENCY_SYMBOL,
  },
};

export const DEFAULT_LIMITS: Record<Tier, PlanLimits> = {
  [Tier.STARTER]: TIER_LIMITS.STARTER,
  [Tier.FRONT_DESK]: {
    patients: TIER_LIMITS.FRONT_DESK.patients,
    doctors: TIER_LIMITS.FRONT_DESK.doctors,
    storageGB: TIER_LIMITS.FRONT_DESK.storageGB,
    branches: TIER_LIMITS.FRONT_DESK.branches,
  },
  [Tier.ESSENTIAL]: TIER_LIMITS.ESSENTIAL,
  [Tier.PROFESSIONAL]: TIER_LIMITS.PROFESSIONAL,
  [Tier.HOSPITAL]: TIER_LIMITS.HOSPITAL,
  [Tier.ENTERPRISE]: TIER_LIMITS.ENTERPRISE,
  [Tier.INTELLIGENCE]: TIER_LIMITS.INTELLIGENCE,
};

export const DEFAULT_DESCRIPTIONS: Record<
  Tier,
  { tagline: string; description: string }
> = {
  [Tier.STARTER]: {
    tagline: TIER_INFO.STARTER.tagline,
    description: TIER_INFO.STARTER.description,
  },
  [Tier.FRONT_DESK]: {
    tagline: TIER_INFO.FRONT_DESK.tagline,
    description: TIER_INFO.FRONT_DESK.description,
  },
  [Tier.ESSENTIAL]: {
    tagline: TIER_INFO.ESSENTIAL.tagline,
    description: TIER_INFO.ESSENTIAL.description,
  },
  [Tier.PROFESSIONAL]: {
    tagline: TIER_INFO.PROFESSIONAL.tagline,
    description: TIER_INFO.PROFESSIONAL.description,
  },
  [Tier.HOSPITAL]: {
    tagline: TIER_INFO.HOSPITAL.tagline,
    description: TIER_INFO.HOSPITAL.description,
  },
  [Tier.ENTERPRISE]: {
    tagline: TIER_INFO.ENTERPRISE.tagline,
    description: TIER_INFO.ENTERPRISE.description,
  },
  [Tier.INTELLIGENCE]: {
    tagline: TIER_INFO.INTELLIGENCE.tagline,
    description: TIER_INFO.INTELLIGENCE.description,
  },
};

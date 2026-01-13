
import { Tier, TIER_INFO, TIER_LIMITS, TIER_PRICING } from "@workspace/types";

// Types for tier configuration from backend
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

export interface IntelligenceAddon {
    feature: string;
    name: string;
    description: string;
    monthlyPrice: number;
    icon: string;
}

export interface FeatureDisplay {
    name: string;
    description: string;
}

export interface TierConfigData {
    tiers: TierConfig[];
    featureTierMap: Record<string, number>;
    featureDisplay: Record<string, FeatureDisplay>;
    intelligenceAddons: IntelligenceAddon[];
    intelligenceBundleDiscount: number;
    intelligenceInfo: {
        name: string;
        description: string;
        tagline: string;
        color: string;
        pricing: PlanPricing;
        features: string[];
    };
}

// Use single source of truth from @workspace/types
export const DEFAULT_PRICING: Record<Tier, PlanPricing> = {
    [Tier.CAPTURE]: {
        monthly: TIER_PRICING.CAPTURE.monthly,
        yearly: TIER_PRICING.CAPTURE.yearly,
        currency: "₹",
    },
    [Tier.CORE]: {
        monthly: TIER_PRICING.CORE.monthly,
        yearly: TIER_PRICING.CORE.yearly,
        currency: "₹",
    },
    [Tier.PLUS]: {
        monthly: TIER_PRICING.PLUS.monthly,
        yearly: TIER_PRICING.PLUS.yearly,
        currency: "₹",
    },
    [Tier.PRO]: {
        monthly: TIER_PRICING.PRO.monthly,
        yearly: TIER_PRICING.PRO.yearly,
        currency: "₹",
    },
    [Tier.ENTERPRISE]: {
        monthly: TIER_PRICING.ENTERPRISE.monthly,
        yearly: TIER_PRICING.ENTERPRISE.yearly,
        currency: "₹",
    },
    [Tier.INTELLIGENCE]: {
        monthly: TIER_PRICING.INTELLIGENCE.monthly,
        yearly: TIER_PRICING.INTELLIGENCE.yearly,
        currency: "₹",
    },
};

export const DEFAULT_LIMITS: Record<Tier, PlanLimits> = {
    [Tier.CAPTURE]: TIER_LIMITS.CAPTURE,
    [Tier.CORE]: TIER_LIMITS.CORE,
    [Tier.PLUS]: TIER_LIMITS.PLUS,
    [Tier.PRO]: TIER_LIMITS.PRO,
    [Tier.ENTERPRISE]: TIER_LIMITS.ENTERPRISE,
    [Tier.INTELLIGENCE]: TIER_LIMITS.INTELLIGENCE,
};

export const DEFAULT_DESCRIPTIONS: Record<
    Tier,
    { tagline: string; description: string }
> = {
    [Tier.CAPTURE]: {
        tagline: TIER_INFO.CAPTURE.tagline,
        description: TIER_INFO.CAPTURE.description,
    },
    [Tier.CORE]: {
        tagline: TIER_INFO.CORE.tagline,
        description: TIER_INFO.CORE.description,
    },
    [Tier.PLUS]: {
        tagline: TIER_INFO.PLUS.tagline,
        description: TIER_INFO.PLUS.description,
    },
    [Tier.PRO]: {
        tagline: TIER_INFO.PRO.tagline,
        description: TIER_INFO.PRO.description,
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

export const DEFAULT_BUNDLE_DISCOUNT = 0.4;

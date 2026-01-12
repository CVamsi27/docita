"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Tier, TIER_INFO, TIER_LIMITS, TIER_PRICING } from "@workspace/types";
import { Feature, FEATURE_TIER_MAP } from "./stores/permission-store";

/**
 * Types for tier configuration from backend
 */
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

interface TierConfigContextType {
  config: TierConfigData | null;
  isLoading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  // Helper functions
  getPlanPricing: (tier: Tier) => PlanPricing;
  getPlanLimits: (tier: Tier) => PlanLimits;
  getPlanDescription: (tier: Tier) => { tagline: string; description: string };
  getFeatureDisplay: (feature: Feature) => FeatureDisplay;
  getIntelligenceBundlePrice: () => number;
}

const TierConfigContext = createContext<TierConfigContextType | undefined>(
  undefined,
);

// Use single source of truth from @workspace/types
const DEFAULT_PRICING: Record<Tier, PlanPricing> = {
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

const DEFAULT_LIMITS: Record<Tier, PlanLimits> = {
  [Tier.CAPTURE]: TIER_LIMITS.CAPTURE,
  [Tier.CORE]: TIER_LIMITS.CORE,
  [Tier.PLUS]: TIER_LIMITS.PLUS,
  [Tier.PRO]: TIER_LIMITS.PRO,
  [Tier.ENTERPRISE]: TIER_LIMITS.ENTERPRISE,
  [Tier.INTELLIGENCE]: TIER_LIMITS.INTELLIGENCE,
};

const DEFAULT_DESCRIPTIONS: Record<
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

const DEFAULT_BUNDLE_DISCOUNT = 0.4;

export function TierConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<TierConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/subscription/config`);

      if (!response.ok) {
        throw new Error("Failed to fetch tier configuration");
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch tier config:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Keep using defaults if fetch fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use useSyncExternalStore to trigger initial fetch without useEffect
  useSyncExternalStore(
    useCallback(() => {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchConfig();
      }
      return () => {};
    }, [fetchConfig]),
    () => config,
    () => null,
  );

  // Get pricing for a tier
  const getPlanPricing = useCallback(
    (tier: Tier): PlanPricing => {
      if (!config) return DEFAULT_PRICING[tier];

      const tierConfig = config.tiers.find((t) => t.tier === tier);
      return tierConfig?.pricing ?? DEFAULT_PRICING[tier];
    },
    [config],
  );

  // Get limits for a tier
  const getPlanLimits = useCallback(
    (tier: Tier): PlanLimits => {
      if (!config) return DEFAULT_LIMITS[tier];

      const tierConfig = config.tiers.find((t) => t.tier === tier);
      return tierConfig?.limits ?? DEFAULT_LIMITS[tier];
    },
    [config],
  );

  // Get description for a tier
  const getPlanDescription = useCallback(
    (tier: Tier): { tagline: string; description: string } => {
      if (!config) return DEFAULT_DESCRIPTIONS[tier];

      const tierConfig = config.tiers.find((t) => t.tier === tier);
      return tierConfig
        ? { tagline: tierConfig.tagline, description: tierConfig.description }
        : DEFAULT_DESCRIPTIONS[tier];
    },
    [config],
  );

  // Get feature display info
  const getFeatureDisplay = useCallback(
    (feature: Feature): FeatureDisplay => {
      if (!config?.featureDisplay) {
        return { name: feature, description: "" };
      }
      return (
        config.featureDisplay[feature] ?? { name: feature, description: "" }
      );
    },
    [config],
  );

  // Get intelligence bundle price
  const getIntelligenceBundlePrice = useCallback((): number => {
    if (!config?.intelligenceAddons) {
      return Math.round(4497 * (1 - DEFAULT_BUNDLE_DISCOUNT));
    }
    const totalPrice = config.intelligenceAddons.reduce(
      (sum, addon) => sum + addon.monthlyPrice,
      0,
    );
    return Math.round(
      totalPrice *
        (1 - (config.intelligenceBundleDiscount ?? DEFAULT_BUNDLE_DISCOUNT)),
    );
  }, [config]);

  const value = useMemo(
    () => ({
      config,
      isLoading,
      error,
      refreshConfig: fetchConfig,
      getPlanPricing,
      getPlanLimits,
      getPlanDescription,
      getFeatureDisplay,
      getIntelligenceBundlePrice,
    }),
    [
      config,
      isLoading,
      error,
      fetchConfig,
      getPlanPricing,
      getPlanLimits,
      getPlanDescription,
      getFeatureDisplay,
      getIntelligenceBundlePrice,
    ],
  );

  return (
    <TierConfigContext.Provider value={value}>
      {children}
    </TierConfigContext.Provider>
  );
}

export function useTierConfig() {
  const context = useContext(TierConfigContext);
  if (context === undefined) {
    throw new Error("useTierConfig must be used within a TierConfigProvider");
  }
  return context;
}

/**
 * Static exports for backward compatibility
 * These use the default values and will work without the context
 * For dynamic values, use the useTierConfig hook
 */
export const PLAN_PRICING = DEFAULT_PRICING;
export const PLAN_LIMITS = DEFAULT_LIMITS;
export const PLAN_DESCRIPTIONS = DEFAULT_DESCRIPTIONS;
export const INTELLIGENCE_BUNDLE_DISCOUNT = DEFAULT_BUNDLE_DISCOUNT;

// Re-export from permission store
export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

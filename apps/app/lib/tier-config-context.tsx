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
import { Tier, TIER_INFO } from "@workspace/types";
import { Feature, FEATURE_TIER_MAP } from "./stores/permission-store";

import {
  DEFAULT_BUNDLE_DISCOUNT,
  DEFAULT_DESCRIPTIONS,
  DEFAULT_LIMITS,
  DEFAULT_PRICING,
  FeatureDisplay,
  PlanLimits,
  PlanPricing,
  TierConfigData,
} from "./constants/tier-config";

// Re-export types for backward compatibility
export type {
  PlanPricing,
  PlanLimits,
  TierConfig,
  IntelligenceAddon,
  FeatureDisplay,
  TierConfigData,
} from "./constants/tier-config";

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

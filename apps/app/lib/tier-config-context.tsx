"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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
import { API_URL } from "./api-config";
import { isNetworkError } from "./network-error";

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
  const pathname = usePathname();
  const [config, setConfig] = useState<TierConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const shouldSkipTierFetch =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/clinic-selection" ||
    pathname.startsWith("/clinic-selection/");

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/subscription/config`);

      if (!response.ok) {
        throw new Error("Failed to fetch tier configuration");
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      if (isNetworkError(err)) {
        setConfig(null);
        setError(null);
        return;
      }

      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shouldSkipTierFetch) {
      setConfig(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchConfig();
    }
  }, [fetchConfig, shouldSkipTierFetch]);

  const getPlanPricing = useCallback(
    (tier: Tier): PlanPricing => {
      if (!config) return DEFAULT_PRICING[tier];

      const tierConfig = config.tiers.find((t) => t.tier === tier);
      return tierConfig?.pricing ?? DEFAULT_PRICING[tier];
    },
    [config],
  );

  const getPlanLimits = useCallback(
    (tier: Tier): PlanLimits => {
      if (!config) return DEFAULT_LIMITS[tier];

      const tierConfig = config.tiers.find((t) => t.tier === tier);
      return tierConfig?.limits ?? DEFAULT_LIMITS[tier];
    },
    [config],
  );

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

export const PLAN_PRICING = DEFAULT_PRICING;
export const PLAN_LIMITS = DEFAULT_LIMITS;
export const PLAN_DESCRIPTIONS = DEFAULT_DESCRIPTIONS;
export const INTELLIGENCE_BUNDLE_DISCOUNT = DEFAULT_BUNDLE_DISCOUNT;

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

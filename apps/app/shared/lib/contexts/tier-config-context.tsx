"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Tier, TIER_INFO } from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { Feature, FEATURE_TIER_MAP } from "@/lib/stores/permission-store";

import {
  DEFAULT_DESCRIPTIONS,
  DEFAULT_LIMITS,
  DEFAULT_PRICING,
  FeatureDisplay,
  PlanLimits,
  PlanPricing,
  TierConfigData,
} from "@/lib/constants/tier-config";
import { apiFetch } from "@/lib/api/api-client";
import { isNetworkError } from "@/lib/api/network-error";
import { appQueryKeys } from "@/lib/api/query-keys";

export type {
  PlanPricing,
  PlanLimits,
  TierConfig,
  FeatureDisplay,
  TierConfigData,
} from "@/lib/constants/tier-config";

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

  const shouldSkipTierFetch =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/clinic-selection" ||
    pathname.startsWith("/clinic-selection/");

  const tierConfigQuery = useQuery({
    queryKey: appQueryKeys.config.tier(),
    queryFn: () => apiFetch<TierConfigData>("/subscription/config"),
    enabled: !shouldSkipTierFetch,
  });

  const config = shouldSkipTierFetch ? null : (tierConfigQuery.data ?? null);
  const isLoading = shouldSkipTierFetch ? false : tierConfigQuery.isLoading;
  const error = shouldSkipTierFetch
    ? null
    : tierConfigQuery.error && !isNetworkError(tierConfigQuery.error)
      ? getUserFacingErrorMessage(tierConfigQuery.error, {
          fallback: "We could not load your plan details. Please try again.",
          context: "load",
        })
      : null;

  const fetchConfig = useCallback(async () => {
    await tierConfigQuery.refetch();
  }, [tierConfigQuery]);

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

  const getIntelligenceBundlePrice = useCallback((): number => 0, []);

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

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

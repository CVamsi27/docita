"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";
import {
  Feature,
  FEATURE_TIER_MAP,
  subscriptionCurrentResponseSchema,
  Tier,
  type SubscriptionCurrentResponse,
  type TierName,
} from "@workspace/types";
import { useQuery } from "@tanstack/react-query";

const TIER_NAMES: Record<number, string> = {
  [Tier.STARTER]: "Free",
  [Tier.ESSENTIAL]: "Essential",
  [Tier.PROFESSIONAL]: "Professional",
  [Tier.ENTERPRISE]: "Enterprise",
  [Tier.INTELLIGENCE]: "Intelligence",
};

const TIER_FROM_DB: Record<string, Tier> = {
  // New tier names
  STARTER: Tier.STARTER,
  ESSENTIAL: Tier.ESSENTIAL,
  PROFESSIONAL: Tier.PROFESSIONAL,
  ENTERPRISE: Tier.ENTERPRISE,
  // Legacy DB values
  CAPTURE: Tier.STARTER,
  CORE: Tier.ESSENTIAL,
  PLUS: Tier.ESSENTIAL,
  PRO: Tier.PROFESSIONAL,
  CLINIC: Tier.PROFESSIONAL,
  FREE: Tier.STARTER,
};

export function useTierAccess() {
  const { user, token } = useAuth();

  const { data: subscription } = useQuery<SubscriptionCurrentResponse>({
    queryKey: ["clinic-subscription", user?.clinicId],
    queryFn: async () => {
      if (!token || !user?.clinicId) {
        return null;
      }

      try {
        return subscriptionCurrentResponseSchema.parse(
          await fetchJsonWithSession<unknown>("/subscription/current"),
        );
      } catch {
        return null;
      }
    },
    enabled: !!user?.clinicId && !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const currentTierValue = useMemo(() => {
    if (!subscription?.tier) return Tier.STARTER;
    return TIER_FROM_DB[subscription.tier] ?? Tier.STARTER;
  }, [subscription?.tier]);

  const hasIntelligence = false;
  const featureOverrides = useMemo<Record<string, boolean>>(() => ({}), []);

  const hasTier = useCallback(
    (requiredTier: Tier): boolean => {
      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence],
  );

  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      if (featureOverrides[feature] !== undefined) {
        return featureOverrides[feature];
      }

      const requiredTier = FEATURE_TIER_MAP[feature];
      if (requiredTier === undefined) return true;

      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence, featureOverrides],
  );

  const getRequiredTier = useCallback((feature: Feature): string => {
    const tier = FEATURE_TIER_MAP[feature];
    return TIER_NAMES[tier] || "Unknown";
  }, []);

  const isSubscriptionActive = useMemo(() => {
    const status = subscription?.subscriptionStatus;
    // Match backend subscription enforcement + upgrade UX.
    return (
      status === "ACTIVE" ||
      status === "TRIALING" ||
      status === "PAST_DUE" ||
      status === "PAYMENT_DUE" ||
      status === "GRACE" ||
      status === "PAUSED"
    );
  }, [subscription?.subscriptionStatus]);

  return {
    currentTier: subscription?.tier ?? ("STARTER" as TierName),
    currentTierValue,
    currentTierName: TIER_NAMES[currentTierValue] || "Free",
    hasIntelligence,
    isSubscriptionActive,
    hasTier,
    hasFeature,
    getRequiredTier,
  };
}

"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "../lib/auth-context";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  type TierName,
} from "@workspace/types";
import { useQuery } from "@tanstack/react-query";

const TIER_NAMES: Record<number, string> = {
  [Tier.CAPTURE]: "Capture",
  [Tier.CORE]: "Core",
  [Tier.PLUS]: "Plus",
  [Tier.PRO]: "Pro",
  [Tier.ENTERPRISE]: "Enterprise",
  [Tier.INTELLIGENCE]: "Intelligence",
};

const TIER_FROM_DB: Record<string, Tier> = {
  CAPTURE: Tier.CAPTURE,
  CORE: Tier.CORE,
  PLUS: Tier.PLUS,
  PRO: Tier.PRO,
  ENTERPRISE: Tier.ENTERPRISE,
  FREE: Tier.CAPTURE,
  STARTER: Tier.CORE,
  PROFESSIONAL: Tier.PRO,
};

interface ClinicSubscription {
  tier: TierName;
  subscriptionStatus: string;
  hasIntelligence: boolean;
  features?: Record<string, boolean>;
}

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

export function useTierAccess() {
  const { user, token } = useAuth();

  const { data: subscription } = useQuery<ClinicSubscription>({
    queryKey: ["clinic-subscription", user?.clinicId],
    queryFn: async () => {
      if (!token || !user?.clinicId) {
        return {
          tier: "CAPTURE" as TierName,
          subscriptionStatus: "INACTIVE",
          hasIntelligence: false,
        };
      }

      const response = await fetch(`${API_URL}/clinics/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return {
          tier: "CAPTURE" as TierName,
          subscriptionStatus: "INACTIVE",
          hasIntelligence: false,
        };
      }

      return response.json();
    },
    enabled: !!user?.clinicId && !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const currentTierValue = useMemo(() => {
    if (!subscription?.tier) return Tier.CAPTURE;
    return TIER_FROM_DB[subscription.tier] ?? Tier.CAPTURE;
  }, [subscription?.tier]);

  const hasIntelligence = subscription?.hasIntelligence ?? false;
  const featureOverrides = useMemo(
    () => subscription?.features ?? {},
    [subscription?.features],
  );

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
    return status === "ACTIVE" || status === "TRIALING";
  }, [subscription?.subscriptionStatus]);

  return {
    currentTier: subscription?.tier ?? ("CAPTURE" as TierName),
    currentTierValue,
    currentTierName: TIER_NAMES[currentTierValue] || "Capture",
    hasIntelligence,
    isSubscriptionActive,
    hasTier,
    hasFeature,
    getRequiredTier,
  };
}

"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "../lib/auth-context";
import { Feature, FEATURE_TIER_MAP, Tier, type TierName } from "@workspace/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Tier-Aware Access Hook
 *
 * Provides frontend tier/feature gating with upgrade prompts.
 * Complements backend TierGuard with client-side UX:
 * - Hide/disable features user can't access
 * - Show upgrade CTAs instead of broken UI
 * - Cache clinic tier data to avoid flicker
 *
 * Usage:
 *   const { hasTier, hasFeature, currentTier, UpgradePrompt } = useTierAccess();
 *
 *   if (!hasFeature(Feature.AI_PRESCRIPTION_ASSISTANT)) {
 *     return <UpgradePrompt feature={Feature.AI_PRESCRIPTION_ASSISTANT} />;
 *   }
 */

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
  // Legacy
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

  // Fetch clinic subscription data (cached via React Query)
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (matches backend cache TTL)
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

  /**
   * Check if user's clinic meets minimum tier
   */
  const hasTier = useCallback(
    (requiredTier: Tier): boolean => {
      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence],
  );

  /**
   * Check if a specific feature is available
   * Respects custom overrides, tier requirements, and Intelligence add-on
   */
  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      // Check custom override first
      if (featureOverrides[feature] !== undefined) {
        return featureOverrides[feature];
      }

      const requiredTier = FEATURE_TIER_MAP[feature];
      if (requiredTier === undefined) return true; // Unknown feature = allow

      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence, featureOverrides],
  );

  /**
   * Get the minimum tier required for a feature
   */
  const getRequiredTier = useCallback((feature: Feature): string => {
    const tier = FEATURE_TIER_MAP[feature];
    return TIER_NAMES[tier] || "Unknown";
  }, []);

  /**
   * Check if subscription is active
   */
  const isSubscriptionActive = useMemo(() => {
    const status = subscription?.subscriptionStatus;
    return status === "ACTIVE" || status === "TRIALING";
  }, [subscription?.subscriptionStatus]);

  return {
    // Tier status
    currentTier: subscription?.tier ?? ("CAPTURE" as TierName),
    currentTierValue,
    currentTierName: TIER_NAMES[currentTierValue] || "Capture",
    hasIntelligence,
    isSubscriptionActive,

    // Access checks
    hasTier,
    hasFeature,
    getRequiredTier,
  };
}

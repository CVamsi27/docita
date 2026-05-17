"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import {
  isBillingAdminRole,
  isPastSubscriptionGraceDeadline,
} from "@/lib/subscription/subscription-lockout";
import { fetchJsonWithSession } from "@/lib/auth/fetch-with-session";
import {
  Feature,
  FEATURE_TIER_MAP,
  mapClinicTierDbStringToAccessTier,
  subscriptionCurrentResponseSchema,
  Tier,
  type SubscriptionCurrentResponse,
  type TierName,
} from "@workspace/types";
import { useQuery } from "@tanstack/react-query";

const TIER_NAMES: Record<number, string> = {
  [Tier.STARTER]: "Starter",
  [Tier.ESSENTIAL]: "Essential",
  [Tier.FRONT_DESK]: "Front desk",
  [Tier.PROFESSIONAL]: "Professional",
  [Tier.HOSPITAL]: "Hospital",
  [Tier.ENTERPRISE]: "Enterprise",
  [Tier.INTELLIGENCE]: "Intelligence",
};

export function useTierAccess() {
  const { user, token } = useAuth();
  const clinicContext = useOptionalClinic();
  const clinic = clinicContext?.clinic ?? null;

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
    gcTime: 30 * 60 * 1000,
  });

  const subscriptionHardLocked = useMemo(
    () =>
      isPastSubscriptionGraceDeadline(clinic) &&
      !isBillingAdminRole(user?.role),
    [clinic, user?.role],
  );

  const currentTierValue = useMemo(() => {
    if (!subscription?.tier) return Tier.STARTER;
    const mapped = mapClinicTierDbStringToAccessTier(subscription.tier);
    if (subscriptionHardLocked) {
      return Math.min(mapped, Tier.STARTER);
    }
    return mapped;
  }, [subscription?.tier, subscriptionHardLocked]);

  const hasIntelligence = false;
  const featureOverrides = useMemo<Record<string, boolean>>(() => ({}), []);

  const hasTier = useCallback(
    (requiredTier: Tier): boolean => {
      if (subscriptionHardLocked && requiredTier > Tier.STARTER) {
        return false;
      }
      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence, subscriptionHardLocked],
  );

  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      if (featureOverrides[feature] !== undefined) {
        return featureOverrides[feature];
      }

      const requiredTier = FEATURE_TIER_MAP[feature];
      if (requiredTier === undefined) return true;

      if (subscriptionHardLocked && requiredTier > Tier.STARTER) {
        return false;
      }
      if (requiredTier === Tier.INTELLIGENCE) return hasIntelligence;
      return currentTierValue >= requiredTier;
    },
    [currentTierValue, hasIntelligence, featureOverrides, subscriptionHardLocked],
  );

  const getRequiredTier = useCallback((feature: Feature): string => {
    const tier = FEATURE_TIER_MAP[feature];
    return TIER_NAMES[tier] || "Unknown";
  }, []);

  const isSubscriptionActive = useMemo(() => {
    if (subscriptionHardLocked) {
      return false;
    }
    const status = subscription?.subscriptionStatus;
    // Match backend SubscriptionStatusGuard + upgrade UX.
    return (
      status === "ACTIVE" ||
      status === "TRIALING" ||
      status === "PAST_DUE" ||
      status === "PAYMENT_DUE" ||
      status === "GRACE" ||
      status === "PAUSED"
    );
  }, [subscription?.subscriptionStatus, subscriptionHardLocked]);

  const displayTier = useMemo((): TierName => {
    if (subscriptionHardLocked) {
      return "STARTER";
    }
    return (subscription?.tier ?? "STARTER") as TierName;
  }, [subscription?.tier, subscriptionHardLocked]);

  return {
    currentTier: displayTier,
    currentTierValue,
    currentTierName: TIER_NAMES[currentTierValue] || "Free",
    hasIntelligence,
    isSubscriptionActive,
    hasTier,
    hasFeature,
    getRequiredTier,
  };
}

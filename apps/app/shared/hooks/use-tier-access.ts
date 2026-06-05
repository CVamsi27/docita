"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
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
import {
  getTierName,
  hasFeatureAccess,
  meetsMinimumTier,
} from "@workspace/utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";

const TIER_NAMES: Record<number, string> = {
  [Tier.STARTER]: "Starter",
  [Tier.ESSENTIAL]: "Essential",
  [Tier.FRONT_DESK]: "Front desk",
  [Tier.FRONT_DESK_CLINIC]: "Front desk Clinic",
  [Tier.FRONT_DESK_HOSPITAL]: "Front desk Hospital",
  [Tier.PROFESSIONAL]: "Professional",
  [Tier.HOSPITAL]: "Hospital",
  [Tier.ENTERPRISE]: "Enterprise",
  [Tier.INTELLIGENCE]: "Intelligence",
};

export function useTierAccess() {
  const { user, token } = useAuth();
  const clinicContext = useOptionalClinic();
  const clinic = clinicContext?.clinic ?? null;
  const { currentMode, canAccess: canAccessFromStore } = usePermissionStore();

  const { data: subscription } = useQuery<SubscriptionCurrentResponse>({
    queryKey: queryKeys.clinic.subscription(user?.clinicId),
    queryFn: async () => {
      if (!token || !user?.clinicId) {
        return null;
      }

      try {
        return subscriptionCurrentResponseSchema.parse(
          await fetchJsonWithSession("/subscription/current"),
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

  const tierNameForAccess = useMemo((): TierName => {
    if (subscriptionHardLocked) {
      return getTierName(Tier.STARTER);
    }
    return getTierName(currentTierValue);
  }, [currentTierValue, subscriptionHardLocked]);

  const hasTier = useCallback(
    (requiredTier: Tier): boolean => {
      if (subscriptionHardLocked && requiredTier > Tier.STARTER) {
        return false;
      }
      return meetsMinimumTier(tierNameForAccess, requiredTier, hasIntelligence);
    },
    [tierNameForAccess, hasIntelligence, subscriptionHardLocked],
  );

  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      if (featureOverrides[feature] !== undefined) {
        return featureOverrides[feature];
      }

      if (subscriptionHardLocked) {
        return hasFeatureAccess(
          getTierName(Tier.STARTER),
          feature,
          hasIntelligence,
          undefined,
          currentMode,
        );
      }

      return (
        canAccessFromStore(feature) ||
        hasFeatureAccess(
          tierNameForAccess,
          feature,
          hasIntelligence,
          undefined,
          currentMode,
        )
      );
    },
    [
      tierNameForAccess,
      hasIntelligence,
      featureOverrides,
      subscriptionHardLocked,
      currentMode,
      canAccessFromStore,
    ],
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
      return getTierName(Tier.STARTER);
    }
    return subscription?.tier ?? getTierName(Tier.STARTER);
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

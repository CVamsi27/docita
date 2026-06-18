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
  type PlanMode,
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

export const TIER_NAMES: Record<number, string> = {
  [Tier.STARTER]: "Starter",
  [Tier.ESSENTIAL]: "Essential",
  [Tier.PROFESSIONAL]: "Professional",
  [Tier.HOSPITAL]: "Hospital",
  [Tier.ENTERPRISE]: "Enterprise",
  [Tier.INTELLIGENCE]: "Intelligence",
};

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE", "PAYMENT_DUE", "GRACE", "PAUSED"]);

async function fetchSubscription(token: string | null, clinicId: string | null | undefined): Promise<SubscriptionCurrentResponse | null> {
  if (!token || !clinicId) return null;
  try { return subscriptionCurrentResponseSchema.parse(await fetchJsonWithSession("/subscription/current")); }
  catch { return null; }
}

function resolveCurrentTierValue(
  subscriptionTier: string | undefined,
  subscriptionHardLocked: boolean,
): number {
  if (!subscriptionTier) return Tier.STARTER;
  const mapped = mapClinicTierDbStringToAccessTier(subscriptionTier);
  return subscriptionHardLocked ? Math.min(mapped, Tier.STARTER) : mapped;
}

function buildHasFeature(params: {
  featureOverrides: Record<string, boolean>;
  subscriptionHardLocked: boolean;
  tierNameForAccess: TierName;
  hasIntelligence: boolean;
  currentMode: PlanMode | undefined;
  canAccessFromStore: (feature: Feature) => boolean;
}) {
  return (feature: Feature): boolean => {
    if (params.featureOverrides[feature] !== undefined) return params.featureOverrides[feature];
    if (params.subscriptionHardLocked) return hasFeatureAccess(getTierName(Tier.STARTER), feature, params.hasIntelligence, undefined, params.currentMode);
    return params.canAccessFromStore(feature) || hasFeatureAccess(params.tierNameForAccess, feature, params.hasIntelligence, undefined, params.currentMode);
  };
}

export function useTierAccess() {
  const { user, token } = useAuth();
  const clinic = useOptionalClinic()?.clinic ?? null;
  const { currentMode, canAccess: canAccessFromStore } = usePermissionStore();

  const { data: subscription } = useQuery<SubscriptionCurrentResponse>({
    queryKey: queryKeys.clinic.subscription(user?.clinicId),
    queryFn: () => fetchSubscription(token, user?.clinicId),
    enabled: !!user?.clinicId && !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const subscriptionHardLocked = useMemo(
    () => isPastSubscriptionGraceDeadline(clinic) && !isBillingAdminRole(user?.role),
    [clinic, user?.role],
  );
  const currentTierValue = useMemo(
    () => resolveCurrentTierValue(subscription?.tier, subscriptionHardLocked),
    [subscription?.tier, subscriptionHardLocked],
  );
  const hasIntelligence = false;
  const featureOverrides = useMemo<Record<string, boolean>>(() => ({}), []);
  const tierNameForAccess = useMemo(
    (): TierName => getTierName(subscriptionHardLocked ? Tier.STARTER : currentTierValue),
    [currentTierValue, subscriptionHardLocked],
  );

  const hasTier = useCallback(
    (requiredTier: Tier): boolean =>
      subscriptionHardLocked && requiredTier > Tier.STARTER
        ? false
        : meetsMinimumTier(tierNameForAccess, requiredTier, hasIntelligence),
    [tierNameForAccess, hasIntelligence, subscriptionHardLocked],
  );

  const hasFeature = useCallback(
    (feature: Feature): boolean => buildHasFeature({ featureOverrides, subscriptionHardLocked, tierNameForAccess, hasIntelligence, currentMode, canAccessFromStore })(feature),
    [tierNameForAccess, hasIntelligence, featureOverrides, subscriptionHardLocked, currentMode, canAccessFromStore],
  );

  const getRequiredTier = useCallback(
    (feature: Feature): string => TIER_NAMES[FEATURE_TIER_MAP[feature]] || "Unknown",
    [],
  );

  const isSubscriptionActive = useMemo(
    () => !subscriptionHardLocked && ACTIVE_STATUSES.has(subscription?.subscriptionStatus ?? ""),
    [subscription?.subscriptionStatus, subscriptionHardLocked],
  );

  const displayTier = useMemo(
    (): TierName => subscriptionHardLocked ? getTierName(Tier.STARTER) : subscription?.tier ?? getTierName(Tier.STARTER),
    [subscription?.tier, subscriptionHardLocked],
  );

  return {
    currentTier: displayTier,
    currentTierValue,
    currentTierName: TIER_NAMES[currentTierValue] || "Starter",
    hasIntelligence,
    isSubscriptionActive,
    hasTier,
    hasFeature,
    getRequiredTier,
  };
}

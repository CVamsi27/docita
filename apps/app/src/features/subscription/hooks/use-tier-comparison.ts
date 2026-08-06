import { useCallback } from "react";
import { getTierInfo, getTierName, type Tier } from "@/lib/subscription/tier-access";
import { resolveCurrentPlanTier } from "@/lib/subscription/current-plan-tier";
import { recommendTier } from "../lib/recommend-tier";
import { buildCurrentPlanStatusNotice } from "../lib/billing-workspace-status-notice";
import type { SubscriptionDerivedState } from "./billing-subscription-workspace-helpers";
import type {
  CurrentUsage,
  SubscriptionCurrentResponse,
} from "@workspace/types";

export function useTierComparison(
  derived: SubscriptionDerivedState,
  subscription: SubscriptionCurrentResponse | null | undefined,
  usage: CurrentUsage | null | undefined,
  resolvePayment: () => Promise<void>,
  plansRef: { current: HTMLDivElement | null },
) {
  const currentTierInfo = getTierInfo(derived.effectiveCurrentTier);

  const currentPlanTier: Tier = resolveCurrentPlanTier({
    subscriptionTier: subscription?.tier,
    isTrialExpired: derived.isTrialExpired,
    accessTier: derived.effectiveCurrentTier,
  });
  const currentPlanTierInfo = getTierInfo(currentPlanTier);

  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [plansRef]);

  const recommendation = recommendTier(
    getTierName(derived.effectiveCurrentTier),
    usage,
  );

  const currentPlanStatusNotice = buildCurrentPlanStatusNotice({
    isSubscriptionExpired: derived.isSubscriptionExpired,
    isInGracePeriod: derived.isInGracePeriod,
    isPaymentPastDue: derived.isPaymentPastDue,
    isTrialing: derived.isTrialing,
    isTrialExpired: derived.isTrialExpired,
    planStripDaysLeft: derived.planStripDaysLeft,
    subscriptionStatus: derived.subscriptionStatus,
    hasOutstandingPendingPayment: derived.hasOutstandingPendingPayment,
    renewalPeriodLapsed: derived.renewalPeriodLapsed,
    resolvePayment,
    scrollToPlans,
  });

  return {
    currentTierInfo,
    currentPlanTier,
    currentPlanTierInfo,
    recommendation,
    currentPlanStatusNotice,
    scrollToPlans,
  };
}

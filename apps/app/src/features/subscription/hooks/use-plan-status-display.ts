import {
  buildBilledTierLabel,
  buildPlanDetails,
  type SubscriptionDerivedState,
} from "./billing-subscription-workspace-helpers";
import type { PlanMode, SubscriptionCurrentResponse } from "@workspace/types";

export function usePlanStatusDisplay(
  derived: SubscriptionDerivedState,
  currentMode: PlanMode,
  subscription: SubscriptionCurrentResponse | null | undefined,
  currentTierInfoName: string,
) {
  const {
    isTrialing,
    isTrialExpired,
    subscriptionStatus,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    planStripPeriodEnd,
    planStripDaysLeft,
    showStarterAccessThroughLabel,
  } = derived;

  const { billedTierLabel, billedModeLabel } = buildBilledTierLabel(
    subscription?.tier,
    currentMode,
    currentTierInfoName,
  );

  const planDetails = buildPlanDetails({
    billedTierLabel,
    billedModeLabel,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    subscriptionStatus,
    subscription,
    isTrialing,
    isTrialExpired,
    showStarterAccessThroughLabel,
    planStripPeriodEnd,
    planStripDaysLeft,
  });

  return { planDetails };
}

import type { PlanMode, TierName } from "@workspace/types";
import { PLAN_MODE_INFO, TIER_INFO, tierSchema } from "@workspace/types";
import type { SubscriptionLike } from "../lib/billing-subscription-types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "../lib/billing-period-display";
import {
  formatPlanDate,
  formatStatusLabel,
  formatPlanBillingDetail,
  starterMonthlyAccessTermMismatch,
} from "../components/billing-subscription-helpers";


export function computeSubscriptionDerivedState(
  subscription: SubscriptionLike | null | undefined,
  effectiveCurrentTier: number,
) {
  const subscriptionStatus = subscription?.subscriptionStatus;
  const subscriptionPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const daysLeftInPeriod = subscription?.daysRemaining ?? null;
  const displayBillingPeriod =
    subscription?.subscriptionStatus === "ACTIVE"
      ? getDisplayBillingPeriodEndAndDaysLeft(subscription)
      : null;
  const planStripPeriodEnd =
    displayBillingPeriod?.periodEnd ?? subscriptionPeriodEnd;
  const planStripDaysLeft = displayBillingPeriod?.daysLeft ?? daysLeftInPeriod;
  const isTrialing = subscriptionStatus === "TRIALING";
  const isTrialExpired =
    isTrialing && subscription?.trialWindowState === "EXPIRED";
  const isSubscriptionExpired = subscriptionStatus === "EXPIRED";
  const hasOutstandingPendingPayment =
    subscription?.hasOutstandingPendingPayment === true;
  const renewalPeriodLapsed =
    planStripPeriodEnd !== null
      ? planStripPeriodEnd.getTime() <= Date.now()
      : false;
  const isPaymentPastDue =
    subscriptionStatus === "PAST_DUE" ||
    subscriptionStatus === "PAYMENT_DUE" ||
    (hasOutstandingPendingPayment && renewalPeriodLapsed);
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const starterLongMonthlyWindow = starterMonthlyAccessTermMismatch(
    subscription,
    planStripDaysLeft,
  );
  const showStarterAccessThroughLabel = starterLongMonthlyWindow;

  return {
    subscriptionStatus,
    subscriptionPeriodEnd,
    daysLeftInPeriod,
    displayBillingPeriod,
    planStripPeriodEnd,
    planStripDaysLeft,
    isTrialing,
    isTrialExpired,
    isSubscriptionExpired,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    isPaymentPastDue,
    isInGracePeriod,
    effectiveCurrentTier,
    starterLongMonthlyWindow,
    showStarterAccessThroughLabel,
  };
}

export function buildBilledTierLabel(
  tier: string | undefined,
  currentMode: PlanMode,
  currentTierInfoName: string,
): { billedTierName: TierName | null; billedTierLabel: string; billedModeLabel: string } {
  const parsed = tierSchema.safeParse(tier);
  const billedTierName: TierName | null = parsed.success ? parsed.data : null;
  const billedTierLabel = billedTierName
    ? (TIER_INFO[billedTierName]?.name ?? currentTierInfoName)
    : currentTierInfoName;
  const billedModeLabel =
    currentMode !== "FULL" ? ` · ${PLAN_MODE_INFO[currentMode].name}` : "";

  return { billedTierName, billedTierLabel, billedModeLabel };
}

export function buildPlanDetails(params: {
  billedTierLabel: string;
  billedModeLabel: string;
  hasOutstandingPendingPayment: boolean;
  renewalPeriodLapsed: boolean;
  subscriptionStatus: string | undefined;
  subscription: SubscriptionLike | null | undefined;
  isTrialing: boolean;
  isTrialExpired: boolean;
  showStarterAccessThroughLabel: boolean;
  planStripPeriodEnd: Date | null;
  planStripDaysLeft: number | null;
  /** Clinic wall-clock timezone; defaults to IST when absent. */
  clinicTimezone?: string;
}) {
  return [
    { label: "Plan", value: `${params.billedTierLabel}${params.billedModeLabel}` },
    {
      label: "Status",
      value:
        params.hasOutstandingPendingPayment && params.renewalPeriodLapsed
          ? "Payment pending"
          : formatStatusLabel(params.subscriptionStatus),
    },
    {
      label: "Billing",
      value: formatPlanBillingDetail(params.subscription, params.subscriptionStatus),
    },
    {
      label:
        params.isTrialing && !params.isTrialExpired
          ? "Trial Ends"
          : params.subscription?.cancelAtPeriodEnd
            ? "Ends On"
            : params.showStarterAccessThroughLabel
              ? "Access through"
              : "Renews On",
      value:
        params.planStripPeriodEnd !== null
          ? `${formatPlanDate(
              params.planStripPeriodEnd.toISOString(),
              params.clinicTimezone,
            )}${
              params.planStripDaysLeft !== null
                ? ` (${params.planStripDaysLeft} day${params.planStripDaysLeft === 1 ? "" : "s"} left)`
                : ""
            }`
          : "Not scheduled",
    },
  ];
}

export type SubscriptionDerivedState = ReturnType<typeof computeSubscriptionDerivedState>;

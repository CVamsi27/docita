"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  getTierInfo,
  getTierValue,
  Tier,
} from "@/lib/subscription/tier-access";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { useResolveSubscriptionPayment } from "@/features/subscription/hooks/use-resolve-subscription-payment";
import {
  useCancelScheduledPlanChange,
  useSchedulePlanChange,
  useSubscription,
} from "@workspace/data-access";
import {
  useCurrentUsage,
  usePricingConfig,
} from "@/features/subscription/hooks/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  type PlanMode,
  PLAN_MODE_INFO,
  TIER_INFO,
  type TierName,
  tierSchema,
} from "@workspace/types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { getTierName } from "@workspace/utils";
import {
  formatPlanDate,
  formatStatusLabel,
  formatPlanBillingDetail,
  starterMonthlyAccessTermMismatch,
} from "@/features/subscription/components/billing-subscription-helpers";
import { buildCurrentPlanStatusNotice } from "@/features/subscription/lib/billing-workspace-status-notice";

/** Subscription billing hooks in one module so Fast Refresh cannot desync parent/child hook order. */
export function useBillingSubscriptionWorkspace() {
  const { currentTier, currentMode } = usePermissionStore();
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription({ enabled: true });
  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);
  const {
    usage,
    isLoading: isUsageLoading,
    error: usageError,
  } = useCurrentUsage();
  const scheduleMutation = useSchedulePlanChange();
  const cancelScheduledMutation = useCancelScheduledPlanChange();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);

  const {
    checkoutTier,
    isProcessing: isCheckoutProcessing,
    closeCheckout,
    isCheckoutOpen,
  } = useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
    setShowTierChangeDialog(false);
  });

  const {
    resolvePayment,
    isResolving: isResolvePaymentProcessing,
    hasRecoverablePayment,
    recoverablePayment,
    isBillingHistoryLoading,
  } = useResolveSubscriptionPayment({
    subscription,
    checkoutTier,
    isCheckoutProcessing,
  });

  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [legalDialog, setLegalDialog] = useState<null | "terms" | "privacy">(
    null,
  );
  const plansRef = useRef<HTMLDivElement>(null);

  const subscriptionStatus = subscription?.subscriptionStatus;
  const subscriptionPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const daysLeftInPeriod =
    subscriptionPeriodEnd !== null
      ? Math.max(
          0,
          Math.ceil(
            (subscriptionPeriodEnd.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;
  const displayBillingPeriod =
    subscription?.subscriptionStatus === "ACTIVE"
      ? getDisplayBillingPeriodEndAndDaysLeft(subscription)
      : null;
  const planStripPeriodEnd =
    displayBillingPeriod?.periodEnd ?? subscriptionPeriodEnd;
  const planStripDaysLeft = displayBillingPeriod?.daysLeft ?? daysLeftInPeriod;
  const isTrialing = subscriptionStatus === "TRIALING";
  const isTrialExpired =
    isTrialing && subscriptionPeriodEnd !== null
      ? subscriptionPeriodEnd.getTime() <= Date.now()
      : false;
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
  const effectiveCurrentTier = isTrialExpired ? Tier.STARTER : currentTier;
  const starterLongMonthlyWindow = starterMonthlyAccessTermMismatch(
    subscription,
    planStripDaysLeft,
  );
  const showStarterAccessThroughLabel = starterLongMonthlyWindow;

  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY", mode: PlanMode = "FULL") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
      setSelectedMode(mode);
      setShowTierChangeDialog(true);
    },
    [],
  );

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier) return;
    if (selectedTier === "ENTERPRISE") {
      setShowTierChangeDialog(false);
      setShowContactSalesModal(true);
      return;
    }
    await checkoutTier({
      tier: selectedTier,
      billingCycle: selectedCycle,
      planMode: selectedMode,
    });
  }, [selectedTier, selectedCycle, selectedMode, checkoutTier]);

  const handleScheduleTierChange = useCallback(async () => {
    if (!selectedTier) return;
    await scheduleMutation.mutateAsync({
      tier: selectedTier,
      billingCycle: selectedCycle,
      planMode: selectedMode,
    });
    setShowTierChangeDialog(false);
  }, [selectedTier, selectedCycle, selectedMode, scheduleMutation]);

  const currentTierInfo = getTierInfo(effectiveCurrentTier);
  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const recommendation = recommendTier(
    getTierName(effectiveCurrentTier),
    usage,
  );

  const currentPlanStatusNotice = buildCurrentPlanStatusNotice({
    isSubscriptionExpired,
    isInGracePeriod,
    isPaymentPastDue,
    isTrialing,
    isTrialExpired,
    planStripDaysLeft,
    subscriptionStatus,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    resolvePayment,
    scrollToPlans,
  });

  // Show the plan label the customer is actually paying for (subscription.tier),
  // not the access-downgraded `effectiveCurrentTier` (which falls back to Starter
  // when a trial expires). Mode suffix appears when the clinic is on a non-Full
  // PlanMode so "Hospital · Front Desk" reads consistently with the upgrade UI.
  const billedTierName: TierName | null = (() => {
    const parsed = tierSchema.safeParse(subscription?.tier);
    return parsed.success ? parsed.data : null;
  })();
  const billedTierLabel = billedTierName
    ? (TIER_INFO[billedTierName]?.name ?? currentTierInfo.name)
    : currentTierInfo.name;
  const billedModeLabel =
    currentMode !== "FULL" ? ` · ${PLAN_MODE_INFO[currentMode].name}` : "";

  // The plan the customer is actually subscribed to — drives every "current
  // plan" display (header card, plan-grid badge, compare table, change dialog)
  // so a trialing Essential reads as Essential, not the access-tier Starter
  // that `effectiveCurrentTier` falls back to. Once a trial expires we defer to
  // the access tier so the downgrade is reflected honestly.
  const currentPlanTier: Tier =
    billedTierName && !isTrialExpired
      ? getTierValue(billedTierName)
      : effectiveCurrentTier;
  const currentPlanTierInfo = getTierInfo(currentPlanTier);

  const planDetails = [
    { label: "Plan", value: `${billedTierLabel}${billedModeLabel}` },
    {
      label: "Status",
      value:
        hasOutstandingPendingPayment && renewalPeriodLapsed
          ? "Payment pending"
          : formatStatusLabel(subscriptionStatus),
    },
    {
      label: "Billing",
      value: formatPlanBillingDetail(subscription, subscriptionStatus),
    },
    {
      label:
        isTrialing && !isTrialExpired
          ? "Trial Ends"
          : subscription?.cancelAtPeriodEnd
            ? "Ends On"
            : showStarterAccessThroughLabel
              ? "Access through"
              : "Renews On",
      value:
        planStripPeriodEnd !== null
          ? `${formatPlanDate(planStripPeriodEnd.toISOString())}${
              planStripDaysLeft !== null
                ? ` (${planStripDaysLeft} day${planStripDaysLeft === 1 ? "" : "s"} left)`
                : ""
            }`
          : "Not scheduled",
    },
  ];

  return {
    isSubscriptionLoading,
    recoverablePayment,
    isBillingHistoryLoading,
    showContactSalesModal,
    setShowContactSalesModal,
    showTierChangeDialog,
    setShowTierChangeDialog,
    selectedTier,
    selectedCycle,
    setSelectedCycle,
    selectedMode,
    setSelectedMode,
    showSuccessModal,
    setShowSuccessModal,
    successData,
    showInvoiceHistory,
    setShowInvoiceHistory,
    legalDialog,
    setLegalDialog,
    plansRef,
    isCheckoutProcessing: isCheckoutProcessing || isResolvePaymentProcessing,
    closeCheckout,
    isCheckoutOpen,
    resolvePayment,
    hasRecoverablePayment,
    currency,
    pricingConfig,
    subscription,
    usage,
    isUsageLoading,
    usageError,
    effectiveCurrentTier,
    currentTierInfo,
    currentPlanTier,
    currentPlanTierInfo,
    daysLeftInPeriod,
    subscriptionStatus,
    isSubscriptionExpired,
    handleSelectTier,
    handleConfirmTierChange,
    handleScheduleTierChange,
    scheduleMutation,
    cancelScheduledMutation,
    scrollToPlans,
    recommendation,
    currentPlanStatusNotice,
    planDetails,
    checkoutTier,
    billingAllowed: true,
  };
}

export type BillingSubscriptionWorkspaceState = ReturnType<
  typeof useBillingSubscriptionWorkspace
>;

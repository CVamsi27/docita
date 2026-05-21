"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import {
  useCancelScheduledPlanChange,
  useSchedulePlanChange,
} from "@workspace/data-access";
import { useCurrentUsage, usePricingConfig } from "@/features/subscription/hooks/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useSubscription } from "@workspace/data-access";
import type { TierName } from "@workspace/types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { getTierName } from "@workspace/utils";
import {
  formatPlanDate,
  formatStatusLabel,
  formatPlanBillingDetail,
  starterMonthlyAccessTermMismatch,
} from "@/features/subscription/components/billing-subscription-helpers";

export function useBillingSubscriptionWorkspace() {
  const { currentTier, workspaceProfile } = usePermissionStore();

  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [legalDialog, setLegalDialog] = useState<null | "terms" | "privacy">(
    null,
  );
  const plansRef = useRef<HTMLDivElement>(null);

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

  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);
  const { data: subscription } = useSubscription({ enabled: true });
  const {
    usage,
    isLoading: isUsageLoading,
    error: usageError,
  } = useCurrentUsage();

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
  const isPaymentPastDue =
    subscriptionStatus === "PAST_DUE" || subscriptionStatus === "PAYMENT_DUE";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const effectiveCurrentTier = isTrialExpired ? Tier.STARTER : currentTier;
  const starterLongMonthlyWindow = starterMonthlyAccessTermMismatch(
    subscription,
    planStripDaysLeft,
  );
  const showStarterAccessThroughLabel = starterLongMonthlyWindow;

  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
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
    await checkoutTier({ tier: selectedTier, billingCycle: selectedCycle });
  }, [selectedTier, selectedCycle, checkoutTier]);

  const scheduleMutation = useSchedulePlanChange();
  const cancelScheduledMutation = useCancelScheduledPlanChange();
  const handleScheduleTierChange = useCallback(async () => {
    if (!selectedTier) return;
    await scheduleMutation.mutateAsync({
      tier: selectedTier,
      billingCycle: selectedCycle,
    });
    setShowTierChangeDialog(false);
  }, [selectedTier, selectedCycle, scheduleMutation]);

  const currentTierInfo = getTierInfo(effectiveCurrentTier);
  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const recommendation = recommendTier(
    getTierName(effectiveCurrentTier),
    usage,
  );

  const currentPlanStatusNotice = isSubscriptionExpired
    ? {
        title: "Subscription Expired",
        badgeLabel: "Workspace Locked",
        description:
          "Your facility is locked because the subscription has expired. Choose a plan and complete payment to restore access.",
        actionLabel: "Choose a Plan",
        onAction: scrollToPlans,
        variant: "destructive" as const,
      }
    : isInGracePeriod
      ? {
          title: "Payment Grace Period",
          badgeLabel: "Access Restricted",
          description:
            "Your subscription is in grace period after a missed payment. Complete payment now to prevent the workspace from being locked.",
          actionLabel: "Resolve Payment",
          onAction: scrollToPlans,
          variant: "warning" as const,
        }
      : isPaymentPastDue
        ? {
            title: "Payment Past Due",
            badgeLabel: "Action Required",
            description:
              "Your payment is overdue. Complete payment to keep Docita access active.",
            actionLabel: "Resolve Payment",
            onAction: scrollToPlans,
            variant: "warning" as const,
          }
        : isTrialing || isTrialExpired
          ? {
              title: isTrialExpired ? "Trial Ended" : "Trial In Progress",
              badgeLabel: isTrialExpired ? "Starter" : "Trial Active",
              description: isTrialExpired
                ? "Your trial has ended and your facility is now on the Starter plan. Upgrade to continue paid features."
                : planStripDaysLeft !== null && planStripDaysLeft > 0
                  ? "Upgrade anytime to keep paid features after the trial."
                  : "Your trial ends today. Upgrade anytime to keep paid features active.",
              variant: isTrialExpired
                ? ("warning" as const)
                : ("default" as const),
            }
          : subscriptionStatus === "ACTIVE"
            ? undefined
            : {
                title: "Starter plan",
                badgeLabel: "Starter",
                description:
                  "Your clinic is on the Starter plan. Choose a paid plan when you need higher limits or advanced workflows.",
                variant: "default" as const,
              };

  const planDetails = [
    { label: "Plan", value: currentTierInfo.name },
    { label: "Status", value: formatStatusLabel(subscriptionStatus) },
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
    workspaceProfile,
    showContactSalesModal,
    setShowContactSalesModal,
    showTierChangeDialog,
    setShowTierChangeDialog,
    selectedTier,
    selectedCycle,
    setSelectedCycle,
    showSuccessModal,
    setShowSuccessModal,
    successData,
    showInvoiceHistory,
    setShowInvoiceHistory,
    legalDialog,
    setLegalDialog,
    plansRef,
    isCheckoutProcessing,
    closeCheckout,
    isCheckoutOpen,
    currency,
    pricingConfig,
    subscription,
    usage,
    isUsageLoading,
    usageError,
    effectiveCurrentTier,
    currentTierInfo,
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

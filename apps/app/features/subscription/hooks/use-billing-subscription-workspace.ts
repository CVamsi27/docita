"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";
import { resolveCurrentPlanTier } from "@/lib/subscription/current-plan-tier";
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
import { type PlanMode, type TierName } from "@workspace/types";
import { getTierName } from "@workspace/utils";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { buildCurrentPlanStatusNotice } from "@/features/subscription/lib/billing-workspace-status-notice";
import {
  computeSubscriptionDerivedState,
  buildBilledTierLabel,
  buildPlanDetails,
} from "./billing-subscription-workspace-helpers";

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

  const derived = computeSubscriptionDerivedState(subscription, currentTier);
  const {
    isTrialing,
    isTrialExpired,
    planStripPeriodEnd,
    planStripDaysLeft,
    subscriptionStatus,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    isSubscriptionExpired,
    isInGracePeriod,
    isPaymentPastDue,
    effectiveCurrentTier,
    showStarterAccessThroughLabel,
    daysLeftInPeriod,
  } = derived;

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

  const { billedTierLabel, billedModeLabel } = buildBilledTierLabel(
    subscription?.tier,
    currentMode,
    currentTierInfo.name,
  );

  const currentPlanTier: Tier = resolveCurrentPlanTier({
    subscriptionTier: subscription?.tier,
    isTrialExpired,
    accessTier: effectiveCurrentTier,
  });
  const currentPlanTierInfo = getTierInfo(currentPlanTier);

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

"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { X } from "lucide-react";
import { ContactSalesModal } from "@/features/dialogs";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";
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
import { tierSchema, type TierName } from "@workspace/types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { getTierName, parseSupportedCurrency } from "@workspace/utils";
import {
  formatPlanDate,
  formatStatusLabel,
  formatPlanBillingDetail,
  starterMonthlyAccessTermMismatch,
} from "@/features/subscription/components/billing-subscription-helpers";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { EnterpriseContractCard } from "@/features/subscription/components/cards/enterprise-contract-card";
import { UsageDashboard } from "@/features/subscription/components/usage-dashboard";
import { InvoiceHistoryDialog } from "@/features/subscription/components/dialogs/invoice-history-dialog";
import { PaymentSuccessModal } from "@/features/subscription/components/modals/payment-success-modal";
import { TierChangeDialog } from "@/features/subscription/components/dialogs/tier-change-dialog";
import {
  PlansSection,
  PlanTabsSection,
  ContactSalesCard,
  LegalFooter,
  LegalDialog,
} from "@/features/subscription/components/billing-subscription-sections";

/** All subscription billing hooks live in this module so Fast Refresh cannot desync parent/child hook order. */
export function useBillingSubscriptionWorkspace() {
  const { currentTier } = usePermissionStore();
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
          onAction: () => void resolvePayment(),
          variant: "warning" as const,
        }
      : isPaymentPastDue
        ? {
            title: "Payment Past Due",
            badgeLabel: "Action Required",
            description:
              "Your payment is overdue. Complete payment to keep Docita access active.",
            actionLabel: "Resolve Payment",
            onAction: () => void resolvePayment(),
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
          : subscriptionStatus === "ACTIVE" &&
              hasOutstandingPendingPayment &&
              renewalPeriodLapsed
            ? {
                title: "Payment Pending",
                badgeLabel: "Action Required",
                description:
                  "Your renewal payment is still outstanding. Complete payment to keep Docita access active.",
                actionLabel: "Pay now",
                onAction: () => void resolvePayment(),
                variant: "warning" as const,
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

export function BillingSubscriptionWorkspaceView({
  workspace: ws,
}: {
  workspace: BillingSubscriptionWorkspaceState;
}) {
  return (
    <div className="space-y-6">
      {ws.isCheckoutOpen ? (
        <div
          className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:top-6"
          role="region"
          aria-label="Razorpay checkout in progress"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2 rounded-full shadow-lg ring-1 ring-border/60 backdrop-blur"
            onClick={ws.closeCheckout}
          >
            <X className="h-4 w-4" aria-hidden />
            Cancel checkout
          </Button>
        </div>
      ) : null}
      {ws.subscription?.tier === "ENTERPRISE" ? <EnterpriseContractCard /> : null}
      <CurrentPlanCard
        tierInfo={ws.currentTierInfo}
        currentTier={ws.effectiveCurrentTier}
        hasIntelligence={false}
        canChangeTier={ws.billingAllowed}
        onChangePlan={ws.scrollToPlans}
        onViewBillingHistory={() => ws.setShowInvoiceHistory(true)}
        onRenewNow={
          ws.subscription &&
          ws.subscription.tier !== "ENTERPRISE" &&
          (ws.subscription.basePriceCents ?? 0) > 0 &&
          !ws.isSubscriptionExpired
            ? () => void ws.resolvePayment()
            : undefined
        }
        renewActionLabel={
          ws.hasRecoverablePayment || ws.subscription?.hasOutstandingPendingPayment
            ? "Pay now"
            : ws.subscriptionStatus === "TRIALING"
              ? "Add payment method"
              : ws.daysLeftInPeriod !== null && ws.daysLeftInPeriod <= 7
                ? "Renew now"
                : "Pay for next cycle"
        }
        emphasizeRenew={
          ws.subscriptionStatus === "TRIALING" ||
          (ws.daysLeftInPeriod !== null && ws.daysLeftInPeriod <= 7)
        }
        isRenewProcessing={ws.isCheckoutProcessing}
        scheduledChange={
          ws.subscription?.scheduledChange
            ? {
                planName: (() => {
                  const parsedPlan = tierSchema.safeParse(
                    ws.subscription.scheduledChange.plan,
                  );
                  return parsedPlan.success
                    ? (getTierInfo(parsedPlan.data)?.name ??
                        ws.subscription.scheduledChange.plan)
                    : ws.subscription.scheduledChange.plan;
                })(),
                effectiveAt: ws.subscription.scheduledChange.effectiveAt,
                onCancel: () => ws.cancelScheduledMutation.mutate(),
                isCancelling: ws.cancelScheduledMutation.isPending,
              }
            : null
        }
        accountCreditCents={ws.subscription?.accountCreditCents ?? 0}
        accountCreditCurrency={ws.subscription?.currency}
        planDetails={ws.planDetails}
        usage={ws.usage}
        isUsageLoading={ws.isUsageLoading}
        hasUsageError={!!ws.usageError}
        statusNotice={ws.currentPlanStatusNotice}
        showWhatsAppUsageMeter={ws.subscription?.tier !== "STARTER"}
      />

      <UsageDashboard />

      <PlansSection
        effectiveCurrentTier={ws.effectiveCurrentTier}
        selectedCycle={ws.selectedCycle}
        setSelectedCycle={ws.setSelectedCycle}
        recommendation={ws.recommendation}
        billingAllowed={ws.billingAllowed}
        handleSelectTier={ws.handleSelectTier}
        setShowContactSalesModal={ws.setShowContactSalesModal}
        pricingConfig={ws.pricingConfig}
        currency={ws.currency}
        plansRef={ws.plansRef}
      />

      <PlanTabsSection effectiveCurrentTier={ws.effectiveCurrentTier} />

      <ContactSalesCard onContactSales={() => ws.setShowContactSalesModal(true)} />

      <LegalFooter
        onOpenTerms={() => ws.setLegalDialog("terms")}
        onOpenPrivacy={() => ws.setLegalDialog("privacy")}
      />

      <LegalDialog
        legalDialog={ws.legalDialog}
        onClose={() => ws.setLegalDialog(null)}
      />

      <ContactSalesModal
        open={ws.showContactSalesModal}
        onOpenChange={ws.setShowContactSalesModal}
        source="billing_subscription_settings"
      />
      <TierChangeDialog
        open={ws.showTierChangeDialog}
        onOpenChange={ws.setShowTierChangeDialog}
        currentTier={ws.effectiveCurrentTier}
        selectedTier={ws.selectedTier}
        billingCycle={ws.selectedCycle}
        currency={parseSupportedCurrency(ws.currency)}
        onConfirm={ws.handleConfirmTierChange}
        onSchedule={ws.handleScheduleTierChange}
        currentPeriodEnd={ws.subscription?.currentPeriodEnd ?? null}
        checkoutInFlight={
          ws.isCheckoutProcessing || ws.scheduleMutation.isPending
        }
      />
      <PaymentSuccessModal
        open={ws.showSuccessModal}
        onOpenChange={ws.setShowSuccessModal}
        {...ws.successData}
      />
      <InvoiceHistoryDialog
        open={ws.showInvoiceHistory}
        onOpenChange={ws.setShowInvoiceHistory}
        onResolvePayment={() => {
          ws.setShowInvoiceHistory(false);
          void ws.resolvePayment();
        }}
      />
    </div>
  );
}

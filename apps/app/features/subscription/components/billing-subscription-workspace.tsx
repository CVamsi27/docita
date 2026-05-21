"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";
import { Button } from "@workspace/ui/components/form/button";
import { X } from "lucide-react";
import { ContactSalesModal } from "@/features/dialogs";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { EnterpriseContractCard } from "@/features/subscription/components/cards/enterprise-contract-card";
import { UsageDashboard } from "@/features/subscription/components/usage-dashboard";
import { InvoiceHistoryDialog } from "@/features/subscription/components/dialogs/invoice-history-dialog";
import { PaymentSuccessModal } from "@/features/subscription/components/modals/payment-success-modal";
import { TierChangeDialog } from "@/features/subscription/components/dialogs/tier-change-dialog";
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
import { tierSchema, type TierName } from "@workspace/types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { getTierName, parseSupportedCurrency } from "@workspace/utils";
import {
  formatPlanDate,
  formatStatusLabel,
  formatPlanBillingDetail,
  starterMonthlyAccessTermMismatch,
} from "./billing-subscription-helpers";
import {
  PlansSection,
  PlanTabsSection,
  ContactSalesCard,
  LegalFooter,
  LegalDialog,
} from "./billing-subscription-sections";

export function BillingSubscriptionWorkspace() {
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
  /** Date row label only; do not drive billing copy (paid Starter can have a long prepaid window). */
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

  const billingAllowed = true;

  return (
    <div className="space-y-6">
      {isCheckoutOpen ? (
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
            onClick={closeCheckout}
          >
            <X className="h-4 w-4" aria-hidden />
            Cancel checkout
          </Button>
        </div>
      ) : null}
      {subscription?.tier === "ENTERPRISE" && <EnterpriseContractCard />}
      <CurrentPlanCard
        tierInfo={currentTierInfo}
        currentTier={effectiveCurrentTier}
        hasIntelligence={false}
        canChangeTier={billingAllowed}
        onChangePlan={scrollToPlans}
        onViewBillingHistory={() => setShowInvoiceHistory(true)}
        onRenewNow={
          subscription &&
          subscription.tier !== "ENTERPRISE" &&
          (subscription.basePriceCents ?? 0) > 0 &&
          !isSubscriptionExpired
            ? () =>
                checkoutTier({
                  tier: subscription.tier,
                  billingCycle: subscription.billingCycle ?? "MONTHLY",
                })
            : undefined
        }
        renewActionLabel={
          subscriptionStatus === "TRIALING"
            ? "Add payment method"
            : daysLeftInPeriod !== null && daysLeftInPeriod <= 7
              ? "Renew now"
              : "Pay for next cycle"
        }
        emphasizeRenew={
          subscriptionStatus === "TRIALING" ||
          (daysLeftInPeriod !== null && daysLeftInPeriod <= 7)
        }
        isRenewProcessing={isCheckoutProcessing}
        scheduledChange={
          subscription?.scheduledChange
            ? {
                planName: (() => {
                  const parsedPlan = tierSchema.safeParse(
                    subscription.scheduledChange.plan,
                  );
                  return parsedPlan.success
                    ? (getTierInfo(parsedPlan.data)?.name ??
                        subscription.scheduledChange.plan)
                    : subscription.scheduledChange.plan;
                })(),
                effectiveAt: subscription.scheduledChange.effectiveAt,
                onCancel: () => cancelScheduledMutation.mutate(),
                isCancelling: cancelScheduledMutation.isPending,
              }
            : null
        }
        accountCreditCents={subscription?.accountCreditCents ?? 0}
        accountCreditCurrency={subscription?.currency}
        planDetails={planDetails}
        usage={usage}
        isUsageLoading={isUsageLoading}
        hasUsageError={!!usageError}
        statusNotice={currentPlanStatusNotice}
        showWhatsAppUsageMeter={subscription?.tier !== "STARTER"}
      />

      <UsageDashboard />

      <PlansSection
        effectiveCurrentTier={effectiveCurrentTier}
        selectedCycle={selectedCycle}
        setSelectedCycle={setSelectedCycle}
        recommendation={recommendation}
        billingAllowed={billingAllowed}
        handleSelectTier={handleSelectTier}
        setShowContactSalesModal={setShowContactSalesModal}
        pricingConfig={pricingConfig}
        currency={currency}
        workspaceProfile={workspaceProfile}
        plansRef={plansRef}
      />

      <PlanTabsSection effectiveCurrentTier={effectiveCurrentTier} />

      <ContactSalesCard onContactSales={() => setShowContactSalesModal(true)} />

      <LegalFooter
        onOpenTerms={() => setLegalDialog("terms")}
        onOpenPrivacy={() => setLegalDialog("privacy")}
      />

      <LegalDialog
        legalDialog={legalDialog}
        onClose={() => setLegalDialog(null)}
      />

      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
        source="billing_subscription_settings"
      />
      <TierChangeDialog
        open={showTierChangeDialog}
        onOpenChange={setShowTierChangeDialog}
        currentTier={effectiveCurrentTier}
        selectedTier={selectedTier}
        billingCycle={selectedCycle}
        currency={parseSupportedCurrency(currency)}
        onConfirm={handleConfirmTierChange}
        onSchedule={handleScheduleTierChange}
        currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
        checkoutInFlight={isCheckoutProcessing || scheduleMutation.isPending}
      />
      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        {...successData}
      />
      <InvoiceHistoryDialog
        open={showInvoiceHistory}
        onOpenChange={setShowInvoiceHistory}
        onResolvePayment={() => {
          setShowInvoiceHistory(false);
          scrollToPlans();
        }}
      />
    </div>
  );
}

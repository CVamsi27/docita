"use client";

import { Button } from "@workspace/ui/components/form/button";
import { X } from "lucide-react";
import { ContactSalesModal } from "@/features/dialogs";
import { getTierInfo, getTierName, Tier } from "@/lib/subscription/tier-access";
import { tierSchema } from "@workspace/types";
import { parseSupportedCurrency } from "@workspace/utils";
import type { BillingSubscriptionWorkspaceState } from "@/features/subscription/hooks/use-billing-subscription-workspace";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { EnterpriseContractCard } from "@/features/subscription/components/cards/enterprise-contract-card";
import { UsageDashboard } from "@/features/subscription/components/usage-dashboard";
import { InvoiceHistoryDialog } from "@/features/subscription/components/dialogs/invoice-history-dialog";
import { PaymentSuccessModal } from "@/features/subscription/components/modals/payment-success-modal";
import { TierChangeDialog } from "@/features/subscription/components/dialogs/tier-change-dialog";
import { PlansSection, PlanTabsSection, ContactSalesCard, LegalFooter, LegalDialog } from "@/features/subscription/components/billing-subscription-sections";

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
      {ws.subscription?.tier === "ENTERPRISE" ? (
        <EnterpriseContractCard />
      ) : null}
      <CurrentPlanCard
        tierInfo={ws.currentPlanTierInfo}
        currentTier={ws.currentPlanTier}
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
          ws.hasRecoverablePayment ||
          ws.subscription?.hasOutstandingPendingPayment
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
        showWhatsAppUsageMeter={ws.subscription?.tier !== getTierName(Tier.STARTER)}
      />

      <UsageDashboard />

      <PlansSection
        effectiveCurrentTier={ws.currentPlanTier}
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

      <PlanTabsSection effectiveCurrentTier={ws.currentPlanTier} />

      <ContactSalesCard
        onContactSales={() => ws.setShowContactSalesModal(true)}
      />

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
        currentTier={ws.currentPlanTier}
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

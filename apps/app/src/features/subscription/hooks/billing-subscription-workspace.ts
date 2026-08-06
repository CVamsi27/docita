import { useBillingData } from "./use-billing-data";
import { useCheckoutFlow } from "./use-checkout-flow";
import { useBillingSubscriptionActions } from "./use-billing-subscription-actions";
import { useTierComparison } from "./use-tier-comparison";
import { usePlanStatusDisplay } from "./use-plan-status-display";

export function useBillingSubscriptionWorkspace() {
  const billing = useBillingData();
  const checkout = useCheckoutFlow(billing.subscription);
  const actions = useBillingSubscriptionActions(
    checkout.checkoutTier,
    checkout.setShowContactSalesModal,
  );
  const tier = useTierComparison(
    billing.derived,
    billing.subscription,
    billing.usage,
    checkout.resolvePayment,
    actions.plansRef,
  );
  const display = usePlanStatusDisplay(
    billing.derived,
    billing.currentMode,
    billing.subscription,
    tier.currentTierInfo.name,
  );

  return {
    isSubscriptionLoading: billing.isSubscriptionLoading,
    recoverablePayment: checkout.recoverablePayment,
    isBillingHistoryLoading: checkout.isBillingHistoryLoading,
    showContactSalesModal: checkout.showContactSalesModal,
    setShowContactSalesModal: checkout.setShowContactSalesModal,
    showTierChangeDialog: actions.showTierChangeDialog,
    setShowTierChangeDialog: actions.setShowTierChangeDialog,
    selectedTier: actions.selectedTier,
    selectedCycle: actions.selectedCycle,
    setSelectedCycle: actions.setSelectedCycle,
    selectedMode: actions.selectedMode,
    setSelectedMode: actions.setSelectedMode,
    showSuccessModal: checkout.showSuccessModal,
    setShowSuccessModal: checkout.setShowSuccessModal,
    successData: checkout.successData,
    showInvoiceHistory: actions.showInvoiceHistory,
    setShowInvoiceHistory: actions.setShowInvoiceHistory,
    legalDialog: actions.legalDialog,
    setLegalDialog: actions.setLegalDialog,
    plansRef: actions.plansRef,
    isCheckoutProcessing: checkout.isProcessing,
    closeCheckout: checkout.closeCheckout,
    isCheckoutOpen: checkout.isCheckoutOpen,
    resolvePayment: checkout.resolvePayment,
    hasRecoverablePayment: checkout.hasRecoverablePayment,
    currency: billing.currency,
    pricingConfig: billing.pricingConfig,
    subscription: billing.subscription,
    usage: billing.usage,
    isUsageLoading: billing.isUsageLoading,
    usageError: billing.usageError,
    effectiveCurrentTier: billing.derived.effectiveCurrentTier,
    currentTierInfo: tier.currentTierInfo,
    currentPlanTier: tier.currentPlanTier,
    currentPlanTierInfo: tier.currentPlanTierInfo,
    daysLeftInPeriod: billing.derived.daysLeftInPeriod,
    subscriptionStatus: billing.derived.subscriptionStatus,
    isSubscriptionExpired: billing.derived.isSubscriptionExpired,
    handleSelectTier: actions.handleSelectTier,
    handleConfirmTierChange: actions.handleConfirmTierChange,
    handleScheduleTierChange: actions.handleScheduleTierChange,
    scheduleMutation: actions.scheduleMutation,
    cancelScheduledMutation: actions.cancelScheduledMutation,
    scrollToPlans: tier.scrollToPlans,
    recommendation: tier.recommendation,
    currentPlanStatusNotice: tier.currentPlanStatusNotice,
    planDetails: display.planDetails,
    checkoutTier: checkout.checkoutTier,
    billingAllowed: true,
  };
}

export type BillingSubscriptionWorkspaceState = ReturnType<
  typeof useBillingSubscriptionWorkspace
>;

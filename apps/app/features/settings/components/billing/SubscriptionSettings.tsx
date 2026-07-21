"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { PaymentRecoveryCard, BillingSubscriptionWorkspaceView, useBillingSubscriptionWorkspace, useAutoResolveSubscriptionPayment } from "@/features/subscription";
import { Section } from "@workspace/ui/components/layout/section";
import { billingHistoryEmptyDescription, billingHistorySectionActions, billingHistorySectionDescription, deriveSubscriptionSettingsState } from "./subscription-settings-helpers";
import { BillingHistory } from "./subscription-billing-history";
import { SubscriptionLoadingState, NonAdminSubscriptionView, BillingSupportBlock } from "./SubscriptionSettingsSections";
import { SubscriptionAlertSection } from "./subscription-settings-alerts";

export function SubscriptionSettings() {
  const { isAdmin } = useAuth();
  const { clinic } = useClinic();
  const billing = useBillingSubscriptionWorkspace();

  useAutoResolveSubscriptionPayment({
    enabled: isAdmin,
    subscription: billing.subscription,
    isLoading: billing.isSubscriptionLoading,
    isBillingHistoryLoading: billing.isBillingHistoryLoading,
    resolvePayment: billing.resolvePayment,
    clinic,
  });

  const subscription = billing.subscription;
  const subscriptionSettingsState = deriveSubscriptionSettingsState({
    clinic,
    subscription,
  });

  if (billing.isSubscriptionLoading) return <SubscriptionLoadingState />;

  const { tierName, subscriptionStatusLabel } = subscriptionSettingsState;

  if (!isAdmin) {
    return (
      <NonAdminSubscriptionView
        tierName={tierName}
        subscriptionStatusLabel={subscriptionStatusLabel}
      />
    );
  }

  const isResolving = billing.isCheckoutProcessing;

  return (
    <div className="space-y-6">
      <PaymentRecoveryCard
        show={subscriptionSettingsState.showRecoveryCard}
        recoverablePayment={billing.recoverablePayment}
        resolvePayment={billing.resolvePayment}
        isResolving={isResolving}
      />

      <SubscriptionAlertSection
        state={subscriptionSettingsState}
        isResolving={isResolving}
        resolvePayment={billing.resolvePayment}
      />

      <Section
        id="billing-subscription-section"
        title="Billing & subscription"
        description="Change plan, compare features, and view invoices"
        contentClassName="space-y-6"
      >
        <BillingSubscriptionWorkspaceView workspace={billing} />

        <BillingSupportBlock />
      </Section>

      <div className="scroll-mt-6">
        <Section
          id="billing-history-section"
          title="Billing history"
          description={billingHistorySectionDescription(
            subscription ?? undefined,
          )}
          actions={billingHistorySectionActions(subscription ?? undefined)}
        >
          <BillingHistory
            emptyStateDescription={billingHistoryEmptyDescription(
              subscription ?? undefined,
            )}
          />
        </Section>
      </div>
    </div>
  );
}

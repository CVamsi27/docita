"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { getSupportPhoneNumber } from "@/lib/constants/support-contact";
import { WhatsAppButton } from "@/components/whatsapp/whatsapp-button";
import {
  PaymentRecoveryCard,
  BillingSubscriptionWorkspaceView,
  useBillingSubscriptionWorkspace,
  useAutoResolveSubscriptionPayment,
} from "@/features/subscription";
import { Section } from "@workspace/ui/components/layout/section";
import {
  billingHistoryEmptyDescription,
  billingHistorySectionActions,
  billingHistorySectionDescription,
  deriveSubscriptionSettingsState,
} from "./subscription-settings-helpers";
import { BillingHistory } from "./subscription-billing-history";
import {
  SubscriptionLoadingState,
  NonAdminSubscriptionView,
  TrialAlert,
  FreeStarterAlert,
  GstinReminderAlert,
  PaymentDueAlert,
  GracePeriodAlert,
  ExpiredSubscriptionAlert,
} from "./SubscriptionSettingsSections";

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

  const supportPhone = getSupportPhoneNumber();
  const subscription = billing.subscription;
  const subscriptionSettingsState = deriveSubscriptionSettingsState({
    clinic,
    subscription,
  });

  if (billing.isSubscriptionLoading) return <SubscriptionLoadingState />;

  const {
    tierName,
    subscriptionStatusLabel,
    trialDaysLeft,
    freeStarterActive,
    isPaymentDue,
    isExpired,
    isInGracePeriod,
    showRecoveryCard,
    needsGstinForInvoices,
  } = subscriptionSettingsState;

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
        show={showRecoveryCard}
        recoverablePayment={billing.recoverablePayment}
        resolvePayment={billing.resolvePayment}
        isResolving={isResolving}
      />
      {trialDaysLeft !== null ? (
        <TrialAlert trialDaysLeft={trialDaysLeft} tierName={tierName} />
      ) : freeStarterActive ? (
        <FreeStarterAlert />
      ) : null}

      {needsGstinForInvoices && <GstinReminderAlert />}

      {isPaymentDue && !showRecoveryCard && (
        <PaymentDueAlert
          isResolving={isResolving}
          resolvePayment={billing.resolvePayment}
        />
      )}

      {isInGracePeriod && !showRecoveryCard && (
        <GracePeriodAlert
          isResolving={isResolving}
          resolvePayment={billing.resolvePayment}
        />
      )}

      {isExpired && <ExpiredSubscriptionAlert />}

      <Section
        id="billing-subscription-section"
        title="Billing & subscription"
        description="Change plan, compare features, and view invoices"
        contentClassName="space-y-6"
      >
        <BillingSubscriptionWorkspaceView workspace={billing} />

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--fs-sm)] text-muted-foreground">
              Need help with billing or onboarding?
            </p>
            <WhatsAppButton
              phoneNumber={supportPhone}
              message="Hi Docita team, I need help with billing and onboarding"
              label="Message support"
              variant="outline"
              size="sm"
              className="shrink-0"
            />
          </div>
        </div>
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

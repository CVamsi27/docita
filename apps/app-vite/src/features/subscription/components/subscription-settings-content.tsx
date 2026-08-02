import { DataState } from "@workspace/ui/components";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useBillingSubscriptionWorkspace } from "../hooks/billing-subscription-workspace";
import { useAutoResolveSubscriptionPayment } from "../hooks/use-auto-resolve-subscription-payment";
import { BillingSubscriptionWorkspaceView } from "./billing-subscription-workspace-view";
import { PaymentRecoveryCard } from "./cards/payment-recovery-card";

export function SubscriptionSettingsContent() {
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

  if (!isAdmin) {
    return (
      <DataState
        status="empty"
        emptyTitle="Admin access required"
        emptyDescription="Only clinic admins can manage the subscription and billing settings."
      />
    );
  }

  if (billing.isSubscriptionLoading) {
    return <DataState status="loading" loadingMessage="Loading subscription details…" />;
  }

  return (
    <div className="space-y-6">
      {billing.hasRecoverablePayment ? (
        <PaymentRecoveryCard
          recoverablePayment={billing.recoverablePayment}
          resolvePayment={billing.resolvePayment}
          isResolving={billing.isCheckoutProcessing}
        />
      ) : null}
      <BillingSubscriptionWorkspaceView workspace={billing} />
    </div>
  );
}

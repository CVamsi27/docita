import type { SubscriptionSettingsState } from "./subscription-settings-helpers";
import {
  TrialAlert,
  FreeStarterAlert,
  GstinReminderAlert,
  PaymentDueAlert,
  GracePeriodAlert,
  ExpiredSubscriptionAlert,
} from "./SubscriptionSettingsSections";

interface SubscriptionAlertSectionProps {
  state: SubscriptionSettingsState;
  isResolving: boolean;
  resolvePayment: () => Promise<void>;
}

export function SubscriptionAlertSection({
  state,
  isResolving,
  resolvePayment,
}: SubscriptionAlertSectionProps) {
  const {
    trialDaysLeft,
    tierName,
    freeStarterActive,
    needsGstinForInvoices,
    isPaymentDue,
    showRecoveryCard,
    isInGracePeriod,
    isExpired,
  } = state;

  return (
    <>
      {trialDaysLeft !== null ? (
        <TrialAlert trialDaysLeft={trialDaysLeft} tierName={tierName} />
      ) : freeStarterActive ? (
        <FreeStarterAlert />
      ) : null}

      {needsGstinForInvoices && <GstinReminderAlert />}

      {isPaymentDue && !showRecoveryCard && (
        <PaymentDueAlert isResolving={isResolving} resolvePayment={resolvePayment} />
      )}

      {isInGracePeriod && !showRecoveryCard && (
        <GracePeriodAlert isResolving={isResolving} resolvePayment={resolvePayment} />
      )}

      {isExpired && <ExpiredSubscriptionAlert />}
    </>
  );
}

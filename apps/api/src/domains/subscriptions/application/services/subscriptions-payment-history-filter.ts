import type { PaymentHistoryRecord } from './subscription-payment-history.types';
import {
  isPendingLikeStatus,
  readPaymentStatus,
} from './subscriptions-payment-history-status';
import {
  isTierUpgradeSubscriptionDescription,
  parseTierFromUpgradeDescription,
} from './subscriptions-payment-history-tier';

export function filterPendingPlanCheckoutMismatches<
  T extends PaymentHistoryRecord,
>(records: T[], currentPlan: string | undefined): T[] {
  if (!currentPlan) return records;
  return records.filter((record) =>
    keepsCurrentPlanPendingCheckout(record, currentPlan),
  );
}

function keepsCurrentPlanPendingCheckout(
  record: PaymentHistoryRecord,
  currentPlan: string,
): boolean {
  const status = readPaymentStatus(record);
  if (!isPendingLikeStatus(status)) return true;
  if (!isTierUpgradeSubscriptionDescription(record.description)) return true;
  const rowTier = parseTierFromUpgradeDescription(record.description);
  return rowTier ? rowTier === currentPlan : true;
}

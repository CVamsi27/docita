import type { PaymentHistoryRecord } from './subscription-payment-history.types';
import {
  isPendingLikeStatus,
  readPaymentStatus,
} from './subscriptions-payment-history-status';
import { isTierUpgradeSubscriptionDescription } from './subscriptions-payment-history-tier';

export function collapseStaleUpgradePendingCheckouts<
  T extends PaymentHistoryRecord,
>(records: T[]): T[] {
  const pendingUpgradeIndexes = collectPendingUpgradeIndexes(records);
  if (pendingUpgradeIndexes.length <= 1) return records;
  const newestIndex = findNewestRecordIndex(records, pendingUpgradeIndexes);
  const drop = new Set(
    pendingUpgradeIndexes.filter((idx) => idx !== newestIndex),
  );
  return records.filter((_, index) => !drop.has(index));
}

function collectPendingUpgradeIndexes<T extends PaymentHistoryRecord>(
  records: T[],
): number[] {
  const indexes: number[] = [];
  records.forEach((record, index) => {
    if (isPendingUpgradeRecord(record)) indexes.push(index);
  });
  return indexes;
}

function isPendingUpgradeRecord(
  record: PaymentHistoryRecord | undefined,
): boolean {
  if (!record) return false;
  return (
    isPendingLikeStatus(readPaymentStatus(record)) &&
    isTierUpgradeSubscriptionDescription(record.description)
  );
}

function findNewestRecordIndex<T extends PaymentHistoryRecord>(
  records: T[],
  indexes: number[],
): number {
  return indexes.reduce((newestIndex, index) => {
    const newestTime = new Date(records[newestIndex].createdAt).getTime();
    const candidateTime = new Date(records[index].createdAt).getTime();
    return candidateTime >= newestTime ? index : newestIndex;
  }, indexes[0] ?? 0);
}

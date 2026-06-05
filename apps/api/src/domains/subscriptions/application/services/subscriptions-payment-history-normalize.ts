import type { PaymentHistoryRecord } from './subscription-payment-history.types';
import { readPaymentStatus } from './subscriptions-payment-history-status';

export function normalizePaymentHistory<T extends PaymentHistoryRecord>(
  records: T[],
): T[] {
  const seenPendingKeys = new Set<string>();
  const normalized: T[] = [];
  for (const record of records) {
    appendNormalizedRecord(record, seenPendingKeys, normalized);
  }
  return normalized;
}

function appendNormalizedRecord<T extends PaymentHistoryRecord>(
  record: T,
  seenPendingKeys: Set<string>,
  normalized: T[],
): void {
  const status = readPaymentStatus(record);
  if (status === 'expired') return;
  if (status === 'pending' && hasSeenPendingRecord(record, seenPendingKeys)) {
    return;
  }
  normalized.push(record);
}

function hasSeenPendingRecord(
  record: PaymentHistoryRecord,
  seenPendingKeys: Set<string>,
): boolean {
  const key = [
    record.description ?? '',
    record.amountCents,
    record.currency,
  ].join('|');
  if (seenPendingKeys.has(key)) return true;
  seenPendingKeys.add(key);
  return false;
}

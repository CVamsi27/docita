import type { PaymentHistoryRecord } from './subscription-payment-history.types';

export function readPaymentStatus(record: PaymentHistoryRecord): string {
  return (record.status ?? String(record.getStatus?.() ?? '')).toLowerCase();
}

export function isPendingLikeStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return PENDING_LIKE_STATUSES.has(normalized);
}

const PENDING_LIKE_STATUSES = new Set([
  'pending',
  'processing',
  'created',
  'requires_action',
  'attempted',
  'due',
]);

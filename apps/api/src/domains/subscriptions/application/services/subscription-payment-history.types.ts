import { isRecord } from '@workspace/utils';

export type PaymentHistoryRecord = {
  amountCents: number;
  currency: string;
  status?: string;
  description?: string | null;
  createdAt: Date;
  getStatus?: () => unknown;
  id?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  paidAt?: Date | null;
};

function isPaymentHistoryRecord(value: unknown): value is PaymentHistoryRecord {
  if (!isRecord(value)) {
    return false;
  }
  const row = value;
  return (
    typeof row.amountCents === 'number' &&
    typeof row.currency === 'string' &&
    row.createdAt instanceof Date
  );
}

/** Normalize repository rows at the payment-history boundary. */
export function parsePaymentHistoryRecords(
  rows: unknown[],
): PaymentHistoryRecord[] {
  return rows.filter(isPaymentHistoryRecord);
}

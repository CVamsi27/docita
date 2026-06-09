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

// jscpd:ignore-start
type SubscriptionPaymentLookup = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

export function parseSubscriptionPaymentLookup(
  // jscpd:ignore-end
  value: unknown,
): SubscriptionPaymentLookup | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id : '';
  const clinicId = typeof value.clinicId === 'string' ? value.clinicId : '';
  const amountCents =
    typeof value.amountCents === 'number' ? value.amountCents : NaN;
  const currency = typeof value.currency === 'string' ? value.currency : '';
  const status = typeof value.status === 'string' ? value.status : '';

  if (
    !id ||
    !clinicId ||
    !Number.isFinite(amountCents) ||
    !currency ||
    !status
  ) {
    return null;
  }

  return {
    id,
    clinicId,
    amountCents,
    currency,
    status,
    razorpayOrderId:
      typeof value.razorpayOrderId === 'string' ? value.razorpayOrderId : null,
    razorpayPaymentId:
      typeof value.razorpayPaymentId === 'string'
        ? value.razorpayPaymentId
        : null,
  };
}

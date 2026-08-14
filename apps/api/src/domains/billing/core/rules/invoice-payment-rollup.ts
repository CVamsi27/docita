import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';

/**
 * Payment-session statuses that represent money actually collected and applied
 * to an invoice balance. CREATED/PENDING links are not counted until captured.
 */
const SETTLED_PAYMENT_STATUSES: readonly PaymentSessionStatus[] = [
  PaymentSessionStatus.CAPTURED,
  PaymentSessionStatus.PAID,
];

const SETTLED_PAYMENT_STATUS_SET: ReadonlySet<PaymentSessionStatus> = new Set(
  SETTLED_PAYMENT_STATUSES,
);

export function isSettledPaymentStatus(status: PaymentSessionStatus): boolean {
  return SETTLED_PAYMENT_STATUS_SET.has(status);
}

/** Sum of `amount` (paise) across the settled sessions of an invoice. */
export function sumSettledPaymentCents(
  sessions: readonly { status: PaymentSessionStatus; amount: number }[],
): number {
  return sessions.reduce(
    (total, session) =>
      isSettledPaymentStatus(session.status) ? total + session.amount : total,
    0,
  );
}

interface InvoicePaidState {
  amountPaidCents: number;
  balanceDueCents: number;
  status: InvoiceStatus;
}

/**
 * Derive an invoice's paid amount, remaining balance, and status from the total
 * collected so far. PAID/CANCELLED are terminal and never reopened here; an
 * unpaid invoice keeps its current open status (PENDING/OVERDUE).
 */
export function computeInvoicePaidState(params: {
  totalCents: number;
  paidCents: number;
  currentStatus: InvoiceStatus;
}): InvoicePaidState {
  const amountPaidCents = Math.max(0, Math.round(params.paidCents));
  const totalCents = Math.max(0, Math.round(params.totalCents));
  const balanceDueCents = Math.max(0, totalCents - amountPaidCents);

  let status: InvoiceStatus;
  if (
    params.currentStatus === InvoiceStatus.CANCELLED ||
    params.currentStatus === InvoiceStatus.PAID
  ) {
    status = params.currentStatus;
  } else if (amountPaidCents >= totalCents && totalCents > 0) {
    status = InvoiceStatus.PAID;
  } else if (amountPaidCents > 0) {
    status = InvoiceStatus.PARTIALLY_PAID;
  } else {
    status = params.currentStatus;
  }

  return { amountPaidCents, balanceDueCents, status };
}

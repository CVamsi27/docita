import type { InvoiceListRow } from "@workspace/types";
import { formatInvoicePaymentMethodLabel } from "@/features/invoices";

export interface DaybookMethodTotal {
  /** Raw payment-method key (e.g. "cash"); "unknown" when not recorded. */
  method: string;
  label: string;
  count: number;
  total: number;
}

export interface DaybookLedgerRow {
  id: string;
  invoiceNumber: string | null;
  patientName: string;
  amount: number;
  methodLabel: string | null;
  status: string;
  at: string | Date | undefined;
}

export interface DaybookSummary {
  /** Settled today (status PAID). */
  collected: number;
  /** Outstanding (PENDING + OVERDUE + PARTIALLY_PAID). */
  pending: number;
  /** Subset of collected that was paid in cash. */
  cashOnHand: number;
  invoiceCount: number;
  paidCount: number;
  byMethod: DaybookMethodTotal[];
  ledger: DaybookLedgerRow[];
}

function toFiniteAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function amountOf(invoice: InvoiceListRow): number {
  const grand = toFiniteAmount(invoice.grandTotal);
  return grand > 0 ? grand : toFiniteAmount(invoice.total);
}

function patientNameOf(invoice: InvoiceListRow): string {
  const first = invoice.patient?.firstName ?? "";
  const last = invoice.patient?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full.length > 0 ? full : "Patient";
}

const PAID_STATUSES = new Set(["PAID"]);
const PENDING_STATUSES = new Set(["PENDING", "OVERDUE", "PARTIALLY_PAID"]);

/**
 * Pure end-of-day reconciliation over a single day's invoices. Callers are
 * responsible for scoping `invoices` to the target clinic day; this function
 * only sums/groups. Amounts use grandTotal when present, else total.
 */
export function aggregateDaybook(
  invoices: readonly InvoiceListRow[],
  t: (key: string) => string,
): DaybookSummary {
  let collected = 0;
  let pending = 0;
  let cashOnHand = 0;
  let paidCount = 0;
  const methodMap = new Map<string, DaybookMethodTotal>();
  const ledger: DaybookLedgerRow[] = [];

  for (const invoice of invoices) {
    const status = String(invoice.status ?? "").toUpperCase();
    if (status === "CANCELLED") continue;

    const amount = amountOf(invoice);
    const method = invoice.paymentMethod
      ? String(invoice.paymentMethod).toLowerCase()
      : "unknown";
    const methodLabel = formatInvoicePaymentMethodLabel(
      invoice.paymentMethod,
      t,
    );

    if (PAID_STATUSES.has(status)) {
      collected += amount;
      paidCount += 1;
      if (method === "cash") cashOnHand += amount;

      const existing = methodMap.get(method);
      if (existing) {
        existing.count += 1;
        existing.total += amount;
      } else {
        methodMap.set(method, {
          method,
          label: methodLabel ?? t("paidSummary.unspecified"),
          count: 1,
          total: amount,
        });
      }
    } else if (PENDING_STATUSES.has(status)) {
      pending += amount;
    }

    ledger.push({
      id: invoice.id ?? `${invoice.patientId}-${String(invoice.createdAt)}`,
      invoiceNumber: invoice.invoiceNumber ?? null,
      patientName: patientNameOf(invoice),
      amount,
      methodLabel,
      status,
      at: invoice.paidAt ?? invoice.issuedAt ?? invoice.createdAt,
    });
  }

  const byMethod = Array.from(methodMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return {
    collected,
    pending,
    cashOnHand,
    invoiceCount: ledger.length,
    paidCount,
    byMethod,
    ledger,
  };
}

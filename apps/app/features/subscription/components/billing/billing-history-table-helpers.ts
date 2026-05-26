import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import type { BillingHistoryItem } from "@workspace/data-access";

export function formatMoney(amountCents: number, currency: string | undefined) {
  return formatCurrency(amountCents / 100, {
    currency: currency || DEFAULT_CURRENCY,
  });
}

export function normalizeStatus(status: string | undefined): string {
  return (status ?? "").toLowerCase().trim();
}

export function isPaidStatus(status: string): boolean {
  return status === "paid" || status === "captured";
}

export function isTerminalClosed(status: string): boolean {
  return status === "refunded" || status === "void" || status === "voided";
}

export function isFailedLike(status: string): boolean {
  return status === "failed" || status === "declined";
}

export function isPendingLike(status: string): boolean {
  return (
    status === "pending" ||
    status === "processing" ||
    status === "created" ||
    status === "requires_action" ||
    status === "attempted" ||
    status === "due"
  );
}

export function badgeClassForStatus(status: string): string {
  if (isPaidStatus(status)) return "badge-success";
  if (isTerminalClosed(status)) return "";
  if (isFailedLike(status)) return "badge-destructive";
  if (isPendingLike(status)) return "badge-warning";
  return "badge-warning";
}

export type StatusFilterValue =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "refunded_void";

export function parseStatusFilterValue(value: string): StatusFilterValue {
  switch (value) {
    case "all":
    case "paid":
    case "pending":
    case "failed":
    case "refunded_void":
      return value;
    default:
      return "all";
  }
}

export function readBillingHistoryActions(
  invoice: BillingHistoryItem,
): BillingHistoryItemWithActions {
  const payUrl =
    "payUrl" in invoice && typeof invoice.payUrl === "string"
      ? invoice.payUrl
      : undefined;
  const receiptUrl =
    "receiptUrl" in invoice && typeof invoice.receiptUrl === "string"
      ? invoice.receiptUrl
      : undefined;
  return { ...invoice, payUrl, receiptUrl };
}

export function matchesStatusFilter(
  status: string,
  filter: StatusFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return isPaidStatus(status);
  if (filter === "pending")
    return (
      isPendingLike(status) ||
      (!isPaidStatus(status) && !isTerminalClosed(status) && !isFailedLike(status))
    );
  if (filter === "failed") return isFailedLike(status);
  if (filter === "refunded_void") return isTerminalClosed(status);
  return true;
}

export function parseDayBoundary(
  value: string,
  endOfDay: boolean,
): number | null {
  if (!value.trim()) return null;
  const d = new Date(value + (endOfDay ? "T23:59:59.999" : "T00:00:00.000"));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

export type BillingHistoryItemWithActions = BillingHistoryItem & {
  payUrl?: string;
  receiptUrl?: string;
};

export function buildBillingCsvContent(
  invoices: BillingHistoryItem[],
): string {
  const header = [
    "Date",
    "PaidAt",
    "Description",
    "Amount",
    "Currency",
    "Status",
    "PayUrl",
    "ReceiptUrl",
  ];

  const rows = invoices.map((invoice) => {
    const withActions = readBillingHistoryActions(invoice);
    const formattedDate = new Date(invoice.createdAt).toISOString();
    const paidAt = invoice.paidAt
      ? new Date(invoice.paidAt).toISOString()
      : "";
    const description = (
      invoice.description || "Subscription Payment"
    ).replaceAll('"', '""');
    const amount = (invoice.amountCents / 100).toFixed(2);
    const currency = invoice.currency || DEFAULT_CURRENCY;
    const status = invoice.status;
    const payUrl = withActions.payUrl ?? "";
    const receiptUrl = withActions.receiptUrl ?? "";

    return [
      formattedDate,
      paidAt,
      `"${description}"`,
      amount,
      currency,
      status,
      `"${payUrl}"`,
      `"${receiptUrl}"`,
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export function triggerCsvDownload(csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `billing-history-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

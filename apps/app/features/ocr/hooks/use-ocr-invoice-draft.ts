import {
  importInvoiceDraftSchema,
  type OcrImportCommitRequest,
} from "@workspace/types";
import type { OCRInvoiceForm } from "@/features/ocr/types";
import { parseMoneyInput } from "./use-ocr-money";

type InvoiceDraftItem = NonNullable<
  OcrImportCommitRequest["invoiceDraft"]
>["items"][number];

export function buildInvoiceDraftForCommit(
  invoice: OCRInvoiceForm,
): OcrImportCommitRequest["invoiceDraft"] | undefined {
  if (!invoice.saveAsPending) return undefined;
  const parsed = importInvoiceDraftSchema.safeParse({
    grandTotal: parseMoneyInput(invoice.grandTotal),
    subtotal: optionalMoney(invoice.subtotal),
    taxTotal: optionalMoney(invoice.taxTotal),
    items: invoice.items.flatMap(toInvoiceDraftItem),
  });
  return parsed.success ? parsed.data : undefined;
}

function optionalMoney(raw: string): number | undefined {
  const value = parseMoneyInput(raw);
  return Number.isFinite(value) ? value : undefined;
}

function toInvoiceDraftItem(
  row: OCRInvoiceForm["items"][number],
): InvoiceDraftItem[] {
  const description = row.description.trim();
  if (description.length === 0) return [];
  const quantity = parseMoneyInput(row.quantity);
  const unitPrice = parseMoneyInput(row.unitPrice);
  const total = resolveLineTotal(row.total, quantity, unitPrice);
  return hasValidLineMoney(quantity, unitPrice, total)
    ? [{ description, quantity, unitPrice, total }]
    : [];
}

function resolveLineTotal(
  rawTotal: string,
  quantity: number,
  unitPrice: number,
): number {
  const parsedTotal = parseMoneyInput(rawTotal);
  if (Number.isFinite(parsedTotal)) return parsedTotal;
  return Number.isFinite(quantity) && Number.isFinite(unitPrice)
    ? quantity * unitPrice
    : Number.NaN;
}

function hasValidLineMoney(
  quantity: number,
  unitPrice: number,
  total: number,
): boolean {
  return [quantity, unitPrice, total].every(
    (value) => Number.isFinite(value) && value >= 0,
  );
}

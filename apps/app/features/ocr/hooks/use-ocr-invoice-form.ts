import type {
  ProcessOcrFields,
  ProcessOcrInvoiceItem,
} from "@workspace/data-access";
import type { OCRInvoiceForm } from "@/features/ocr/types";
import { parseMoneyInput } from "./use-ocr-money";

export function emptyOcrInvoiceForm(): OCRInvoiceForm {
  return {
    saveAsPending: false,
    grandTotal: "",
    subtotal: "",
    taxTotal: "",
    items: [],
  };
}

export function mapOcrFieldsToInvoiceForm(
  fields: ProcessOcrFields | undefined,
): OCRInvoiceForm {
  const invoice = fields?.invoice;
  if (!invoice) return emptyOcrInvoiceForm();
  const items = parseInvoiceItems(invoice.items);
  return {
    saveAsPending: false,
    grandTotal: computeGrandTotal(invoice.total, items),
    subtotal: invoiceFieldToString(invoice.subtotal),
    taxTotal: invoiceFieldToString(invoice.tax),
    items,
  };
}

function parseInvoiceItems(
  rawItems: ProcessOcrInvoiceItem[] | undefined,
): OCRInvoiceForm["items"] {
  return (rawItems ?? []).flatMap((row) => [parseInvoiceItem(row)]);
}

function parseInvoiceItem(
  row: ProcessOcrInvoiceItem,
): OCRInvoiceForm["items"][number] {
  return {
    description: row.description ?? "",
    quantity: invoiceFieldToString(row.quantity),
    unitPrice: invoiceFieldToString(row.unitPrice),
    total: invoiceFieldToString(row.total),
  };
}

function invoiceFieldToString(
  value: number | string | null | undefined,
): string {
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "";
  return value?.trim() ?? "";
}

function computeGrandTotal(
  invoiceTotal: number | string | null | undefined,
  items: OCRInvoiceForm["items"],
): string {
  const total = invoiceFieldToString(invoiceTotal);
  if (total) return total;
  const itemTotals = items
    .map((item) => parseMoneyInput(item.total))
    .filter(Number.isFinite);
  return itemTotals.length > 0
    ? String(itemTotals.reduce((sum, value) => sum + value, 0))
    : "";
}

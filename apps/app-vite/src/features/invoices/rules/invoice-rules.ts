export {
  applyInvoiceDiscountToFirstLine,
  calculateInvoiceTotals,
  calculateTax,
  calculateTotal,
} from "@workspace/utils";

export const isInvoiceOverdue = (invoice: {
  status: string;
  dueDate?: string | Date;
}): boolean => {
  if (invoice.status === "PAID") return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
};

export const canEditInvoice = (invoice: { status: string }): boolean => {
  return invoice.status !== "PAID" && invoice.status !== "CANCELLED";
};

const DEFAULT_INVOICE_ITEM = {
  description: "",
  quantity: 1,
  price: 0,
  taxTreatment: "EXEMPT_HEALTHCARE" as const,
  taxRate: 0,
};

export function createDefaultInvoiceItems() {
  return [{ ...DEFAULT_INVOICE_ITEM }];
}

export const validateInvoiceItems = (
  items: { description?: string; quantity: number; unitPrice: number }[],
): boolean => {
  return items.every(
    (item) => item.description && item.quantity > 0 && item.unitPrice >= 0,
  );
};

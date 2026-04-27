export interface TaxAwareInvoiceItem {
  quantity: number;
  price: number;
  discountRate?: number;
  discountAmount?: number;
  taxTreatment?: string;
  taxRate?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  exemptAmount: number;
  taxTotal: number;
  grandTotal: number;
}

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateTax = (subtotal: number, taxRate: number = 0): number => {
  return roundCurrency(subtotal * (taxRate / 100));
};

export const calculateTotal = (
  subtotal: number,
  taxRate: number = 0,
  discount: number = 0,
): number => {
  const tax = calculateTax(subtotal, taxRate);
  return roundCurrency(subtotal + tax - discount);
};

export const calculateInvoiceTotals = (
  items: TaxAwareInvoiceItem[],
  invoiceDiscount: number = 0,
): InvoiceTotals => {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.quantity * item.price, 0),
  );
  const lineDiscount = roundCurrency(
    items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.price;
      const rateDiscount = lineSubtotal * ((item.discountRate ?? 0) / 100);
      return sum + rateDiscount + (item.discountAmount ?? 0);
    }, 0),
  );
  const discountTotal = Math.min(
    subtotal,
    roundCurrency(lineDiscount + invoiceDiscount),
  );
  const effectiveDiscountRatio = subtotal > 0 ? discountTotal / subtotal : 0;

  const taxableAmount = roundCurrency(
    items.reduce((sum, item) => {
      if (item.taxTreatment !== "TAXABLE") return sum;
      const lineSubtotal = item.quantity * item.price;
      return sum + lineSubtotal * (1 - effectiveDiscountRatio);
    }, 0),
  );
  const exemptAmount = roundCurrency(subtotal - discountTotal - taxableAmount);
  const taxTotal = roundCurrency(
    items.reduce((sum, item) => {
      if (item.taxTreatment !== "TAXABLE") return sum;
      const lineSubtotal = item.quantity * item.price;
      const taxableLine = lineSubtotal * (1 - effectiveDiscountRatio);
      return sum + calculateTax(taxableLine, item.taxRate ?? 0);
    }, 0),
  );

  return {
    subtotal,
    discountTotal,
    taxableAmount,
    exemptAmount,
    taxTotal,
    grandTotal: roundCurrency(subtotal - discountTotal + taxTotal),
  };
};

export const applyInvoiceDiscountToFirstLine = <T extends TaxAwareInvoiceItem>(
  items: T[],
  invoiceDiscount: number,
): T[] => {
  if (invoiceDiscount <= 0 || items.length === 0) return items;
  const [first, ...rest] = items;
  const firstSubtotal = first.quantity * first.price;
  const appliedDiscount = Math.min(invoiceDiscount, firstSubtotal);
  return [
    {
      ...first,
      discountAmount: roundCurrency(
        (first.discountAmount ?? 0) + appliedDiscount,
      ),
    },
    ...rest,
  ];
};

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

export const validateInvoiceItems = (
  items: { description?: string; quantity: number; unitPrice: number }[],
): boolean => {
  return items.every(
    (item) => item.description && item.quantity > 0 && item.unitPrice >= 0,
  );
};

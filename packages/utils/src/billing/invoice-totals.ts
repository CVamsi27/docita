export interface TaxAwareInvoiceItem {
  quantity: number;
  price: number;
  unitPrice?: number;
  discountRate?: number;
  discountAmount?: number;
  taxTreatment?: string;
  taxRate?: number;
}

export interface InvoiceLineAmounts {
  subtotal: number;
  discount: number;
  netAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  taxAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  exemptAmount: number;
  taxTotal: number;
  grandTotal: number;
}

export const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const sumCurrency = (values: number[]): number =>
  roundCurrency(values.reduce((total, value) => total + value, 0));

export const calculateTax = (subtotal: number, taxRate: number = 0): number =>
  roundCurrency(subtotal * (taxRate / 100));

export const calculateTotal = (
  subtotal: number,
  taxRate: number = 0,
  discount: number = 0,
): number =>
  roundCurrency(subtotal + calculateTax(subtotal, taxRate) - discount);

export function calculateInvoiceLineAmounts(
  item: TaxAwareInvoiceItem,
  options: { taxable?: boolean } = {},
): InvoiceLineAmounts {
  const unitPrice = item.unitPrice ?? item.price;
  const subtotal = roundCurrency(unitPrice * item.quantity);
  const rateDiscount = roundCurrency(
    subtotal * ((item.discountRate ?? 0) / 100),
  );
  const discount = Math.min(
    subtotal,
    roundCurrency((item.discountAmount ?? 0) + rateDiscount),
  );
  const netAmount = roundCurrency(subtotal - discount);
  const taxable =
    options.taxable ??
    (item.taxTreatment === "TAXABLE" && (item.taxRate ?? 0) > 0);
  const taxAmount = taxable ? calculateTax(netAmount, item.taxRate ?? 0) : 0;

  return {
    subtotal,
    discount,
    netAmount,
    taxableAmount: taxable ? netAmount : 0,
    exemptAmount: taxable ? 0 : netAmount,
    taxAmount,
  };
}

export const applyInvoiceDiscountToFirstLine = <T extends TaxAwareInvoiceItem>(
  items: T[],
  invoiceDiscount: number,
): T[] => {
  if (invoiceDiscount <= 0 || items.length === 0) return items;
  const [first, ...rest] = items;
  if (!first) return items;
  const firstSubtotal = (first.unitPrice ?? first.price) * first.quantity;
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

export function calculateInvoiceTotals(
  items: TaxAwareInvoiceItem[],
  invoiceDiscount: number = 0,
): InvoiceTotals {
  const discountedItems = applyInvoiceDiscountToFirstLine(
    items,
    invoiceDiscount,
  );
  const lines = discountedItems.map((item) =>
    calculateInvoiceLineAmounts(item),
  );
  const subtotal = sumCurrency(lines.map((line) => line.subtotal));
  const discountTotal = sumCurrency(lines.map((line) => line.discount));
  const taxableAmount = sumCurrency(lines.map((line) => line.taxableAmount));
  const exemptAmount = sumCurrency(lines.map((line) => line.exemptAmount));
  const taxTotal = sumCurrency(lines.map((line) => line.taxAmount));

  return {
    subtotal,
    discountTotal,
    taxableAmount,
    exemptAmount,
    taxTotal,
    grandTotal: roundCurrency(subtotal - discountTotal + taxTotal),
  };
}

import {
  invoiceItemSchema,
  type InvoiceItem,
  type JsonValue,
} from '@workspace/types';

/** Row shape from `INVOICE_DETAIL_SELECT.lineItems`. */
export type InvoiceLineItemRow = {
  id: string;
  description: string;
  code: string | null;
  sourceType: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  hsnSac: string | null;
  metadata: JsonValue | null;
};

const centsToAmount = (cents: number): number => cents / 100;
const bpsToRate = (bps: number): number => bps / 100;

export const parseInvoiceItemsFromJson = (items: JsonValue): InvoiceItem[] => {
  const parsed = invoiceItemSchema.array().safeParse(items);
  return parsed.success ? parsed.data : [];
};

export const lineItemRowToInvoiceItem = (
  row: InvoiceLineItemRow,
): InvoiceItem => {
  const fromMetadata = row.metadata
    ? invoiceItemSchema.safeParse(row.metadata)
    : null;
  if (fromMetadata?.success) {
    return { ...fromMetadata.data, id: fromMetadata.data.id ?? row.id };
  }

  const unitPrice = centsToAmount(row.unitPriceCents);
  const item: InvoiceItem = {
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    price: unitPrice,
    unitPrice,
    taxRate: bpsToRate(row.taxRateBps),
    discountAmount: centsToAmount(row.discountCents),
    taxAmount: centsToAmount(row.taxCents),
    lineTotal: centsToAmount(row.totalCents),
  };

  if (row.code && row.sourceType === 'CPT') {
    item.cptCode = row.code;
  }
  if (row.hsnSac) {
    if (row.sourceType === 'HSN') {
      item.hsnCode = row.hsnSac;
    } else {
      item.sacCode = row.hsnSac;
    }
  }

  return item;
};

/** Prefer normalized `InvoiceItem` rows; fall back to legacy JSON `items`. */
export const resolveInvoiceItems = (invoice: {
  items: JsonValue;
  lineItems?: InvoiceLineItemRow[];
}): InvoiceItem[] => {
  if (invoice.lineItems && invoice.lineItems.length > 0)
    return invoice.lineItems.map(lineItemRowToInvoiceItem);
  return parseInvoiceItemsFromJson(invoice.items);
};

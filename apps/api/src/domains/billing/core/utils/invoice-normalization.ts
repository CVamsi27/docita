import { Prisma } from '@workspace/db';
import type { InvoiceItem } from '@workspace/types';

type InvoiceTotals = {
  total: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};

export const toPrismaJson = <T>(value: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export const toCents = (amount: number | null | undefined): number =>
  Math.round((amount ?? 0) * 100);

export const toInvoiceCentCreateFields = (
  totals: InvoiceTotals,
): Pick<
  Prisma.InvoiceCreateInput,
  | 'totalCents'
  | 'subtotalCents'
  | 'discountTotalCents'
  | 'taxTotalCents'
  | 'grandTotalCents'
> => ({
  totalCents: toCents(totals.total),
  subtotalCents: toCents(totals.subtotal),
  discountTotalCents: toCents(totals.discountTotal),
  taxTotalCents: toCents(totals.taxTotal),
  grandTotalCents: toCents(totals.grandTotal),
});

export const toInvoiceCentUpdateFields = (
  totals: InvoiceTotals,
): Pick<
  Prisma.InvoiceUpdateInput,
  | 'totalCents'
  | 'subtotalCents'
  | 'discountTotalCents'
  | 'taxTotalCents'
  | 'grandTotalCents'
> => ({
  totalCents: toCents(totals.total),
  subtotalCents: toCents(totals.subtotal),
  discountTotalCents: toCents(totals.discountTotal),
  taxTotalCents: toCents(totals.taxTotal),
  grandTotalCents: toCents(totals.grandTotal),
});

const sourceTypeForItem = (item: InvoiceItem): string | undefined => {
  if (item.cptCode) return 'CPT';
  if (item.hsnCode) return 'HSN';
  if (item.sacCode) return 'SAC';
  return undefined;
};

export const toInvoiceLineItemCreates = (
  items: InvoiceItem[],
  clinicId?: string,
): Prisma.InvoiceItemCreateWithoutInvoiceInput[] =>
  items.map((item) => {
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
    const unitPrice = item.unitPrice ?? item.price;
    const subtotal = unitPrice * quantity;
    const discount = item.discountAmount ?? 0;
    const tax = item.taxAmount ?? 0;
    const total = item.lineTotal ?? Math.max(0, subtotal - discount + tax);
    const sourceType = sourceTypeForItem(item);

    return {
      description: item.description,
      code: item.cptCode ?? item.hsnCode ?? item.sacCode,
      sourceType,
      sourceId: sourceType
        ? (item.cptCode ?? item.hsnCode ?? item.sacCode)
        : undefined,
      quantity,
      unitPriceCents: toCents(unitPrice),
      subtotalCents: toCents(subtotal),
      discountCents: toCents(discount),
      taxRateBps: Math.round((item.taxRate ?? 0) * 100),
      taxCents: toCents(tax),
      totalCents: toCents(total),
      hsnSac: item.hsnCode ?? item.sacCode,
      metadata: toPrismaJson(item),
      clinic: clinicId ? { connect: { id: clinicId } } : undefined,
    };
  });

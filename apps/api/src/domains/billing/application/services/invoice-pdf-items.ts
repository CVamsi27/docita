import type { InvoiceItem, PDFInvoiceItem } from '@workspace/types';

export function buildPdfItems(
  items: InvoiceItem[],
  procedureCptMap: Record<string, string>,
): PDFInvoiceItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? item.price,
    amount:
      item.lineTotal ??
      item.quantity * (item.unitPrice ?? item.price) -
        (item.discountAmount ?? 0) +
        (item.taxAmount ?? 0),
    cptCode: item.cptCode ?? procedureCptMap[item.description],
    hsnCode: item.hsnCode ?? item.sacCode,
    gstRate: item.taxRate,
  }));
}

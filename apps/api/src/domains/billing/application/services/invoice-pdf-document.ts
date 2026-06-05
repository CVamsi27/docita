import type { InvoiceTaxSummary } from '@workspace/types';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';

export function buildPdfInvoiceId(invoice: InvoiceDetail): string {
  return invoice.invoiceNumber ?? invoice.id.slice(0, 8).toUpperCase();
}

export function buildPdfTitle(
  invoice: InvoiceDetail,
  taxSummary: InvoiceTaxSummary | undefined,
): string {
  return (
    taxSummary?.documentTitle ??
    (invoice.invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply')
  );
}

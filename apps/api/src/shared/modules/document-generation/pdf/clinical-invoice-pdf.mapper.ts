import type { ClinicalInvoicePdfInput } from './clinical-invoice-pdf.service';
import type { InvoicePdfInput } from './pdf.types';

export function isClinicalInvoiceInput(data: InvoicePdfInput): boolean {
  return Boolean(
    data.taxSummary ||
    data.sellerTaxSnapshot ||
    data.buyerTaxSnapshot ||
    data.authorizedSignatureUrl ||
    data.hospitalConfig ||
    data.items.some(
      (item) => item.cptCode || item.icdCode || item.gstRate || item.hsnCode,
    ),
  );
}

export function mapInvoicePdfInputToClinical(
  data: InvoicePdfInput,
): ClinicalInvoicePdfInput {
  const {
    subtotal: _subtotal,
    discount: _discount,
    tax: _tax,
    total: _total,
    paymentMethod: _paymentMethod,
    notes: _notes,
    ...clinical
  } = data;
  return clinical;
}

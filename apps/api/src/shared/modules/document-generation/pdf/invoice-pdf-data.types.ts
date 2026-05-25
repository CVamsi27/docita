import type {
  InvoiceTaxSummary,
  TaxRegistrationSnapshot,
} from '@workspace/types';

/** Invoice fields required by shared invoice PDF layout helpers. */
export interface InvoicePdfRenderData {
  taxSummary?: InvoiceTaxSummary;
  sellerTaxSnapshot?: TaxRegistrationSnapshot;
  buyerTaxSnapshot?: TaxRegistrationSnapshot;
  authorizedSignatureUrl?: string;
  authorizedSignatureLabel?: string;
}

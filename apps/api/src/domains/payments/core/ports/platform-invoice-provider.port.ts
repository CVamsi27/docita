export interface CreatePlatformInvoiceInput {
  customerId: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amountCents: number;
  currency: string;
  description: string;
  orderId?: string;
  paymentId?: string;
  notes?: Record<string, string>;
}

export interface PlatformInvoiceSummary {
  id: string;
  shortUrl: string | null;
  invoiceNumber: string | null;
  status: string;
  amountCents: number;
  amountPaidCents: number;
  currency: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface IPlatformInvoiceProvider {
  createInvoice(
    input: CreatePlatformInvoiceInput,
  ): Promise<PlatformInvoiceSummary | null>;

  listInvoicesByCustomer(
    customerId: string,
    options?: { count?: number },
  ): Promise<PlatformInvoiceSummary[]>;
}

export const PLATFORM_INVOICE_PROVIDER_TOKEN = 'IPlatformInvoiceProvider';

import { Injectable, Logger } from '@nestjs/common';
import {
  type CreatePlatformInvoiceInput,
  type IPlatformInvoiceProvider,
  type PlatformInvoiceSummary,
} from '@/domains/payments/core/ports/platform-invoice-provider.port';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import { RazorpayClientAdapter } from './razorpay-client.adapter';
import { getRazorpayInvoicesApi } from './razorpay-invoices-api';
import {
  asRazorpayInvoiceRecord,
  readInvoiceNumberField,
  readInvoiceStringField,
} from './razorpay-invoice-record';

@Injectable()
export class RazorpayInvoiceAdapter
  extends BaseRazorpayAdapter
  implements IPlatformInvoiceProvider
{
  private readonly logger = new Logger(RazorpayInvoiceAdapter.name);

  constructor(razorpayClient: RazorpayClientAdapter) {
    super(razorpayClient);
  }

  /**
   * Creates a Razorpay-hosted invoice tied to a customer. Razorpay renders a
   * GST-compliant PDF with HSN/SAC, CGST/SGST/IGST split, and a hosted URL
   * (short_url) — no in-house PDF generation required.
   *
   * Failures are logged but not thrown — invoice creation is best-effort and
   * must not block subscription activation.
   */
  async createInvoice(
    input: CreatePlatformInvoiceInput,
  ): Promise<PlatformInvoiceSummary | null> {
    try {
      const invoicesApi = getRazorpayInvoicesApi(this.getClient());
      const invoice = await this.withRazorpayTimeout(() =>
        invoicesApi.create({
          type: 'invoice',
          customer_id: input.customerId,
          currency: input.currency,
          description: input.description,
          order_id: input.orderId,
          line_items: [
            {
              name: input.description,
              amount: input.amountCents,
              currency: input.currency,
              quantity: 1,
            },
          ],
          notes: input.notes ?? {},
          draft: '0',
        }),
      );

      return this.toSummary(invoice);
    } catch (error) {
      this.logger.warn(
        `Failed to create Razorpay invoice for customer ${input.customerId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }

  /**
   * Lists invoices Razorpay has on file for a given customer. Useful as a
   * fallback when our local SubscriptionPayment table is missing rows
   * (e.g. when a webhook never landed in development).
   */
  async listInvoicesByCustomer(
    customerId: string,
    options: { count?: number } = {},
  ): Promise<PlatformInvoiceSummary[]> {
    try {
      const invoicesApi = getRazorpayInvoicesApi(this.getClient());
      const response = await this.withRazorpayTimeout(() =>
        invoicesApi.all({
          customer_id: customerId,
          count: options.count ?? 50,
        }),
      );
      return (response.items ?? [])
        .map((item) => {
          const record = asRazorpayInvoiceRecord(item);
          return record ? this.toSummary(record) : null;
        })
        .filter((s): s is PlatformInvoiceSummary => s !== null);
    } catch (error) {
      this.logger.warn(
        `Failed to list Razorpay invoices for customer ${customerId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private toSummary(
    invoice: Record<string, unknown>,
  ): PlatformInvoiceSummary | null {
    const id = readInvoiceStringField(invoice, 'id');
    if (!id) return null;

    const amount = readInvoiceNumberField(invoice, 'amount');
    const amountPaid = readInvoiceNumberField(invoice, 'amount_paid');
    const createdAtUnix = readInvoiceNumberField(invoice, 'created_at');
    const paidAtUnix = readInvoiceNumberField(invoice, 'paid_at', NaN);
    const paidAtValid = Number.isFinite(paidAtUnix) && paidAtUnix > 0;

    return {
      id,
      shortUrl: readInvoiceStringField(invoice, 'short_url'),
      invoiceNumber: readInvoiceStringField(invoice, 'invoice_number'),
      status: readInvoiceStringField(invoice, 'status', 'unknown') ?? 'unknown',
      amountCents: amount,
      amountPaidCents: amountPaid,
      currency: readInvoiceStringField(invoice, 'currency', 'INR') ?? 'INR',
      createdAt: new Date(createdAtUnix * 1000),
      paidAt: paidAtValid ? new Date(paidAtUnix * 1000) : null,
    };
  }
}

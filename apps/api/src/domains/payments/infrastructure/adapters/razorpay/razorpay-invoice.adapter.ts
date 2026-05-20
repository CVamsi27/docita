import { Injectable, Logger } from '@nestjs/common';
import {
  type CreatePlatformInvoiceInput,
  type IPlatformInvoiceProvider,
  type PlatformInvoiceSummary,
} from '@/domains/payments/core/ports/platform-invoice-provider.port';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import { RazorpayClientService } from './razorpay-client.service';

export type {
  CreatePlatformInvoiceInput as CreateRazorpayInvoiceInput,
  PlatformInvoiceSummary as RazorpayInvoiceSummary,
};

@Injectable()
export class RazorpayInvoiceAdapter
  extends BaseRazorpayAdapter
  implements IPlatformInvoiceProvider
{
  private readonly logger = new Logger(RazorpayInvoiceAdapter.name);

  constructor(razorpayClient: RazorpayClientService) {
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
      const razorpay = this.getClient();
      // Cast — razorpay node SDK types for `invoices.create` are loose.
      const invoicesApi = razorpay.invoices as unknown as {
        create: (
          body: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>;
      };
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
      const razorpay = this.getClient();
      const invoicesApi = razorpay.invoices as unknown as {
        all: (query: Record<string, unknown>) => Promise<{ items: unknown[] }>;
      };
      const response = await this.withRazorpayTimeout(() =>
        invoicesApi.all({
          customer_id: customerId,
          count: options.count ?? 50,
        }),
      );
      return (response.items ?? [])
        .map((item) => this.toSummary(item as Record<string, unknown>))
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
    const id = invoice['id'];
    if (typeof id !== 'string') return null;

    const amount =
      typeof invoice['amount'] === 'number'
        ? (invoice['amount'] as number)
        : Number(invoice['amount']) || 0;
    const amountPaid =
      typeof invoice['amount_paid'] === 'number'
        ? (invoice['amount_paid'] as number)
        : Number(invoice['amount_paid']) || 0;
    const createdAtUnix =
      typeof invoice['created_at'] === 'number'
        ? (invoice['created_at'] as number)
        : Number(invoice['created_at']) || 0;
    const paidAtUnix =
      typeof invoice['paid_at'] === 'number'
        ? (invoice['paid_at'] as number)
        : null;

    return {
      id,
      shortUrl:
        typeof invoice['short_url'] === 'string'
          ? (invoice['short_url'] as string)
          : null,
      invoiceNumber:
        typeof invoice['invoice_number'] === 'string'
          ? (invoice['invoice_number'] as string)
          : null,
      status:
        typeof invoice['status'] === 'string'
          ? (invoice['status'] as string)
          : 'unknown',
      amountCents: amount,
      amountPaidCents: amountPaid,
      currency:
        typeof invoice['currency'] === 'string'
          ? (invoice['currency'] as string)
          : 'INR',
      createdAt: new Date(createdAtUnix * 1000),
      paidAt: paidAtUnix ? new Date(paidAtUnix * 1000) : null,
    };
  }
}

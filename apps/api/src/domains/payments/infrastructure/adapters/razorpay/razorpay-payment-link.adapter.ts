import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import {
  IPaymentLinkProvider,
  CreatePaymentLinkRequest,
  PaymentLinkResponse,
} from '@/domains/payments/core/ports';
import { PaymentLinkStatus } from '@/domains/payments/core/entities/payment-link-status.enum';

/**
 * Razorpay Payment Links using **Docita env** credentials (platform keys).
 * Intended for **Docita SaaS** billing links. Flow B may also use Razorpay,
 * but only with **clinic** keys from payment settings (Flow A), via a
 * separate clinic-scoped adapter — see docs/product/PAYMENT_FLOWS.md.
 */
@Injectable()
export class RazorpayPaymentLinkAdapter
  extends BaseRazorpayAdapter
  implements IPaymentLinkProvider
{
  private readonly logger = new Logger(RazorpayPaymentLinkAdapter.name);

  async createPaymentLink(
    request: CreatePaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    try {
      const razorpay = this.getClient();

      const link = await this.withRazorpayTimeout(() =>
        razorpay.paymentLink.create({
          amount: Math.round(request.amount.toCents()),
          currency: request.amount.currency,
          description: request.description,
          customer: {
            name: request.customer.name,
            email: request.customer.email,
            contact: request.customer.phone,
          },
          notify: {
            sms: false,
            email: false,
          },
          reminder_enable: false,
          callback_url: request.callbackUrl,
          callback_method: 'get',
          ...(request.expiresAt && {
            expire_by: Math.floor(request.expiresAt.getTime() / 1000),
          }),
          ...(request.metadata && {
            notes: request.metadata,
          }),
        }),
      );

      return {
        id: link.id,
        url: link.short_url,
        shortUrl: link.short_url,
        status: this.mapStatus(link.status),
        expiresAt: request.expiresAt,
      };
    } catch (error) {
      this.logger.error('Failed to create payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }
  }

  async getPaymentLink(linkId: string): Promise<PaymentLinkResponse | null> {
    try {
      const razorpay = this.getClient();
      const link = await this.withRazorpayTimeout(() =>
        razorpay.paymentLink.fetch(linkId),
      );

      return {
        id: link.id,
        url: link.short_url,
        shortUrl: link.short_url,
        status: this.mapStatus(link.status),
      };
    } catch (error) {
      // Caller treats null as "not found / not yet available" — that
      // contract is preserved. Log the real cause so non-404 failures
      // (Razorpay 5xx, network, circuit-breaker open) are visible
      // in observability instead of masquerading as a missing record.
      this.logger.warn(
        `Payment link ${linkId} lookup returned no record: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async cancelPaymentLink(linkId: string): Promise<void> {
    try {
      const razorpay = this.getClient();
      await this.withRazorpayTimeout(() => razorpay.paymentLink.cancel(linkId));
    } catch (error) {
      this.logger.error(`Failed to cancel payment link ${linkId}`, error);
      throw new BadRequestException('Failed to cancel payment link');
    }
  }

  private mapStatus(razorpayStatus: string): PaymentLinkStatus {
    const statusMap: Record<string, PaymentLinkStatus> = {
      created: PaymentLinkStatus.CREATED,
      pending: PaymentLinkStatus.PENDING,
      paid: PaymentLinkStatus.PAID,
      expired: PaymentLinkStatus.EXPIRED,
      cancelled: PaymentLinkStatus.CANCELLED,
    };

    return statusMap[razorpayStatus] || PaymentLinkStatus.CREATED;
  }
}

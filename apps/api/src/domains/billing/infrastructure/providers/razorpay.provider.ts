import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  IPaymentProvider,
  CreatePaymentLinkDto,
  PaymentProviderLink,
  ChargeResult,
} from './payment.provider.interface';
export type { IPaymentProvider } from './payment.provider.interface';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER_TOKEN';

@Injectable()
export class RazorpayPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private razorpay: Razorpay;

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  constructor(private configService: AppConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.getRazorpayKeyId(),
      key_secret: this.configService.getRazorpayKeySecret(),
    });
  }

  async createPaymentLink(
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentProviderLink> {
    try {
      const link = await this.razorpay.paymentLink.create({
        amount: Math.round(dto.amount * 100),
        currency: dto.currency,
        description: dto.description,
        customer: {
          name: dto.customer.name,
          email: dto.customer.email,
          contact: dto.customer.contact,
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        callback_url: dto.callbackUrl,
        callback_method: 'get',
      });

      const rawLink: unknown = JSON.parse(JSON.stringify(link));

      return {
        id: link.id,
        shortUrl: link.short_url,
        status: link.status,
        raw: this.toRecord(rawLink),
      };
    } catch (error) {
      this.logger.error(
        'Failed to create Razorpay payment link',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new BadRequestException('Failed to create payment link');
    }
  }

  verifySignature(
    payload: Record<string, unknown>,
    signature: string,
  ): boolean {
    const webhookSecret = this.configService.getRazorpayWebhookSecret();
    if (!webhookSecret) {
      this.logger.error(
        'RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook',
      );
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }

  async chargeWithToken(
    customerId: string,
    tokenId: string,
    amountCents: number,
    currency: string,
    description: string,
  ): Promise<ChargeResult> {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: amountCents,
        currency,
        description,
        customer: {
          name: '',
          email: '',
          contact: '',
        },
      });

      return {
        paymentId: paymentLink.id,
        status: paymentLink.status,
        amount: amountCents,
        currency,
      };
    } catch (error) {
      this.logger.error(
        'Failed to charge with token',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new BadRequestException('Failed to process payment');
    }
  }
}

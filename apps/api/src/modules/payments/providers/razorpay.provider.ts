import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  IPaymentProvider,
  CreatePaymentLinkDto,
  PaymentProviderLink,
} from './payment.provider.interface';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
    });
  }

  async createPaymentLink(
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentProviderLink> {
    try {
      const link = await this.razorpay.paymentLink.create({
        amount: Math.round(dto.amount * 100), // Convert to paise
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

      return {
        id: link.id,
        shortUrl: link.short_url,
        status: link.status,
        raw: link,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }
  }

  verifySignature(payload: Record<string, unknown>, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return true;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }
}

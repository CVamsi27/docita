import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentGateway,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';

@Injectable()
export class RazorpayGateway implements IPaymentGateway {
  private readonly logger = new Logger(RazorpayGateway.name);
  private razorpay: Razorpay | null = null;

  constructor(private configService: AppConfigService) {
    this.initializeRazorpay();
  }

  private initializeRazorpay(): void {
    const keyId = this.configService.getRazorpayKeyId();
    const keySecret = this.configService.getRazorpayKeySecret();

    if (!keyId || !keySecret) {
      const message =
        'Razorpay credentials are missing. Subscription payment operations are disabled.';

      if (this.configService.isProduction()) {
        throw new Error(message);
      }

      this.logger.warn(message);
      return;
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  private getClient(): Razorpay {
    if (!this.razorpay) {
      throw new Error(
        'Razorpay gateway is not initialized. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }

    return this.razorpay;
  }

  async createCustomer(request: {
    email: string;
    name: string;
    phone?: string;
    clinicId: string;
  }): Promise<string> {
    try {
      const razorpay = this.getClient();
      const customer = await razorpay.customers.create({
        email: request.email,
        name: request.name,
        contact: request.phone,
        notes: { clinicId: request.clinicId },
      });
      return customer.id;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay customer',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const razorpay = this.getClient();
      const order = await razorpay.orders.create({
        amount: request.amountCents,
        currency: request.currency,
        receipt: request.orderId,
        notes: request.notes,
      });

      return {
        razorpayOrderId: order.id,
        amountCents: request.amountCents,
        currency: request.currency,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay order',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async verifyPayment(
    request: VerifyPaymentRequest,
  ): Promise<VerifyPaymentResponse> {
    const text = `${request.razorpayOrderId}|${request.razorpayPaymentId}`;
    const secret = this.configService.getRazorpayKeySecret();
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const verified = generated_signature === request.razorpaySignature;

    if (!verified) {
      return { verified: false, paymentId: '', orderId: '', amountCents: 0 };
    }

    try {
      const razorpay = this.getClient();
      const payment = await razorpay.payments.fetch(request.razorpayPaymentId);
      return {
        verified: true,
        paymentId: request.razorpayPaymentId,
        orderId: request.razorpayOrderId,
        amountCents: Number(payment.amount),
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to fetch payment details during verification',
        error instanceof Error ? error.message : String(error),
      );
      return { verified: false, paymentId: '', orderId: '', amountCents: 0 };
    }
  }

  async createSubscription(
    planId: string,
    customerId: string,
    totalCount: number,
  ): Promise<{ subscriptionId: string }> {
    try {
      const razorpay = this.getClient();
      const payload: Parameters<typeof razorpay.subscriptions.create>[0] & {
        customer_id: string;
      } = {
        plan_id: planId,
        customer_id: customerId,
        total_count: totalCount,
      };
      const subscription = (await razorpay.subscriptions.create(payload)) as {
        id: string;
      };
      return { subscriptionId: subscription.id };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.getClient();
      await razorpay.subscriptions.cancel(subscriptionId);
    } catch (error: unknown) {
      this.logger.error(
        'Failed to cancel Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async refundPayment(paymentId: string, amountCents?: number): Promise<void> {
    try {
      const razorpay = this.getClient();
      await razorpay.payments.refund(paymentId, {
        amount: amountCents,
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to refund Razorpay payment',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.getRazorpayWebhookSecret();
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to verify webhook signature',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
}

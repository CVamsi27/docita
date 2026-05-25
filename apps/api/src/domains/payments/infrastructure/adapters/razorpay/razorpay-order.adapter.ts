import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { isRecord } from '@workspace/utils';
import { asRazorpayRecord } from './razorpay-record.util';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import { RazorpayClientService } from './razorpay-client.service';
import {
  IOrderProvider,
  CreateOrderRequest,
  PaymentGatewayOrder,
  PaymentGatewayPayment,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

@Injectable()
export class RazorpayOrderAdapter
  extends BaseRazorpayAdapter
  implements IOrderProvider
{
  private readonly logger = new Logger(RazorpayOrderAdapter.name);

  constructor(
    razorpayClient: RazorpayClientService,
    private configService: ConfigService,
  ) {
    super(razorpayClient);
  }

  async createOrder(request: CreateOrderRequest): Promise<PaymentGatewayOrder> {
    try {
      const razorpay = this.getClient();
      const order = await this.withRazorpayTimeout(() =>
        razorpay.orders.create({
          amount: request.amount.toCents(),
          currency: request.amount.currency,
          notes: request.metadata || {},
        }),
      );

      return {
        id: order.id,
        amount: Money.fromCents(
          typeof order.amount === 'number'
            ? order.amount
            : parseInt(order.amount, 10),
          order.currency,
        ),
        currency: order.currency,
        status: order.status,
        metadata: order.notes,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      // Surface the actual Razorpay error message (or the SDK's) instead of
      // a generic "Failed to create order" — devs need to see auth failures,
      // invalid amounts, key mismatches, etc.
      const message = this.extractRazorpayErrorMessage(error);
      throw new BadRequestException(
        message
          ? `Razorpay order creation failed: ${message}`
          : 'Razorpay order creation failed. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and try again.',
      );
    }
  }

  private extractRazorpayErrorMessage(error: unknown): string | null {
    const err = asRazorpayRecord(error);
    if (!err) return null;
    const nested = isRecord(err.error) ? err.error : null;
    if (nested && typeof nested.description === 'string') {
      return nested.description;
    }
    if (nested && typeof nested.reason === 'string') {
      return nested.reason;
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
    return null;
  }

  async getOrder(orderId: string): Promise<PaymentGatewayOrder | null> {
    try {
      const razorpay = this.getClient();
      const order = await this.withRazorpayTimeout(() =>
        razorpay.orders.fetch(orderId),
      );

      return {
        id: order.id,
        amount: Money.fromCents(
          typeof order.amount === 'number'
            ? order.amount
            : parseInt(order.amount, 10),
          order.currency,
        ),
        currency: order.currency,
        status: order.status,
        metadata: order.notes,
      };
    } catch {
      this.logger.warn(`Order ${orderId} not found`);
      return null;
    }
  }

  async capturePayment(orderId: string): Promise<PaymentGatewayPayment> {
    try {
      const razorpay = this.getClient();
      const paymentsResponse = await this.withRazorpayTimeout(() =>
        razorpay.orders.fetchPayments(orderId),
      );
      const payments = Array.isArray(paymentsResponse.items)
        ? paymentsResponse.items
        : [];

      if (!payments.length) {
        throw new BadRequestException('No payments found for the given order');
      }

      const existingCapturedPayment = payments.find(
        (payment) => payment.status === 'captured',
      );
      if (existingCapturedPayment) {
        return this.toPaymentGatewayPayment(existingCapturedPayment);
      }

      const authorizedPayment = payments.find(
        (payment) => payment.status === 'authorized',
      );

      if (!authorizedPayment) {
        throw new BadRequestException(
          'No capturable payment found for the given order',
        );
      }

      const amountInCents =
        typeof authorizedPayment.amount === 'number'
          ? authorizedPayment.amount
          : parseInt(authorizedPayment.amount, 10);

      const capturedPayment = await this.withRazorpayTimeout(() =>
        razorpay.payments.capture(
          authorizedPayment.id,
          amountInCents,
          authorizedPayment.currency,
        ),
      );

      return this.toPaymentGatewayPayment(capturedPayment);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to capture payment for order ${orderId}`,
        error,
      );
      throw new BadRequestException('Failed to capture payment');
    }
  }

  async verifyPayment(
    request: VerifyPaymentRequest,
  ): Promise<VerifyPaymentResponse> {
    try {
      const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
      if (!keySecret) {
        throw new Error('Razorpay key secret not configured');
      }

      const text = `${request.orderId}|${request.paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      const verified = this.timingSafeEqual(
        expectedSignature,
        request.signature,
      );

      if (!verified) {
        return { verified: false };
      }

      const razorpay = this.getClient();
      const payment = await this.withRazorpayTimeout(() =>
        razorpay.payments.fetch(request.paymentId),
      );

      return {
        verified: true,
        payment: this.toPaymentGatewayPayment(payment),
      };
    } catch (error) {
      this.logger.error('Failed to verify payment', error);
      return { verified: false };
    }
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private toPaymentGatewayPayment(payment: {
    id: string;
    order_id: string;
    amount: number | string;
    currency: string;
    status: string;
    method: string;
    captured?: boolean;
    created_at: number;
    notes?: Record<string, unknown>;
  }): PaymentGatewayPayment {
    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: Money.fromCents(
        typeof payment.amount === 'number'
          ? payment.amount
          : parseInt(payment.amount, 10),
        payment.currency,
      ),
      status: payment.status,
      method: payment.method,
      capturedAt: payment.captured
        ? new Date(payment.created_at * 1000)
        : undefined,
      metadata: payment.notes,
    };
  }
}

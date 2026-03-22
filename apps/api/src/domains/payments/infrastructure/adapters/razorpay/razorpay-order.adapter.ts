import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
      const order = await razorpay.orders.create({
        amount: request.amount.toCents(),
        currency: request.amount.currency,
        notes: request.metadata || {},
      });

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
      this.logger.error('Failed to create order', error);
      throw new BadRequestException('Failed to create order');
    }
  }

  async getOrder(orderId: string): Promise<PaymentGatewayOrder | null> {
    try {
      const razorpay = this.getClient();
      const order = await razorpay.orders.fetch(orderId);

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
      this.logger.warn(`Order ${orderId} not found`);
      return null;
    }
  }

  async capturePayment(orderId: string): Promise<PaymentGatewayPayment> {
    throw new Error('Manual capture not implemented for Razorpay orders');
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
      const payment = await razorpay.payments.fetch(request.paymentId);

      return {
        verified: true,
        payment: {
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
        },
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
}

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';
import {
  ISubscriptionProvider,
  SUBSCRIPTION_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/subscription-provider.port';
import {
  IOrderProvider,
  ORDER_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/order-provider.port';
import {
  IRefundProvider,
  REFUND_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/refund-provider.port';
import {
  IWebhookHandler,
  WEBHOOK_HANDLER_TOKEN,
} from '@/domains/payments/core/ports/webhook-handler.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

@Injectable()
export class PaymentGatewayFacade implements IPaymentGateway {
  private readonly logger = new Logger(PaymentGatewayFacade.name);

  constructor(
    @Inject(SUBSCRIPTION_PROVIDER_TOKEN)
    private subscriptionProvider: ISubscriptionProvider,
    @Inject(ORDER_PROVIDER_TOKEN)
    private orderProvider: IOrderProvider,
    @Inject(REFUND_PROVIDER_TOKEN)
    private refundProvider: IRefundProvider,
    @Inject(WEBHOOK_HANDLER_TOKEN)
    private webhookHandler: IWebhookHandler,
  ) {}

  async createCustomer(request: {
    email: string;
    name: string;
    phone?: string;
    clinicId: string;
  }): Promise<string> {
    const customer = await this.subscriptionProvider.createCustomer({
      email: request.email,
      name: request.name,
      phone: request.phone,
      metadata: {
        clinicId: request.clinicId,
      },
    });

    return customer.id;
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const amount = Money.fromCents(request.amountCents, request.currency);

    const order = await this.orderProvider.createOrder({
      amount,
      customerId: request.customerId,
      description: request.description,
      metadata: request.notes,
    });

    return {
      razorpayOrderId: order.id,
      amountCents: request.amountCents,
      currency: request.currency,
    };
  }

  async verifyPayment(
    request: VerifyPaymentRequest,
  ): Promise<VerifyPaymentResponse> {
    const result = await this.orderProvider.verifyPayment({
      orderId: request.razorpayOrderId,
      paymentId: request.razorpayPaymentId,
      signature: request.razorpaySignature,
    });

    if (!result.verified) {
      return {
        verified: false,
        paymentId: '',
        orderId: '',
        amountCents: 0,
      };
    }

    return {
      verified: true,
      paymentId: result.payment?.id || '',
      orderId: result.payment?.orderId || '',
      amountCents: result.payment?.amount.toCents() || 0,
    };
  }

  async createSubscription(
    planId: string,
    customerId: string,
    totalCount: number,
  ): Promise<{ subscriptionId: string }> {
    const subscription = await this.subscriptionProvider.createSubscription({
      planId,
      customerId,
      quantity: totalCount,
    });

    return { subscriptionId: subscription.id };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.subscriptionProvider.cancelSubscription(subscriptionId);
  }

  async refundPayment(paymentId: string, amountCents?: number): Promise<void> {
    const amount = amountCents
      ? Money.fromCents(amountCents, 'INR')
      : undefined;

    await this.refundProvider.createRefund({
      paymentId,
      amount,
    });
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.webhookHandler.verifyWebhookSignature(payload, signature);
  }
}

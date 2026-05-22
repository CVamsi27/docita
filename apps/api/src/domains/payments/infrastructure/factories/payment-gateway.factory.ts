import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';
import {
  IPaymentLinkProvider,
  ISubscriptionProvider,
  IOrderProvider,
  IWebhookHandler,
  IRefundProvider,
} from '@/domains/payments/core/ports';
import { RazorpayPaymentLinkAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-payment-link.adapter';
import { RazorpaySubscriptionAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-subscription.adapter';
import { RazorpayOrderAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-order.adapter';
import { RazorpayWebhookAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-webhook.adapter';
import { RazorpayRefundAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-refund.adapter';
import { detectPaymentProviderFromWebhookHeaders } from './payment-webhook-provider-detection.registry';

/**
 * Registry for **Docita SaaS** Razorpay capabilities (Docita merchant):
 * payment links for platform billing, subscriptions, orders, refunds, webhooks.
 * Flow B (patient pays clinic) uses `CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN`
 * and must resolve clinic credentials from settings (Flow A) per
 * docs/product/PAYMENT_FLOWS.md. Tokens may share one adapter instance only until
 * clinic-scoped Flow B implementations exist.
 */
@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);

  private paymentLinkProviders = new Map<
    PaymentProvider,
    IPaymentLinkProvider
  >();
  private subscriptionProviders = new Map<
    PaymentProvider,
    ISubscriptionProvider
  >();
  private orderProviders = new Map<PaymentProvider, IOrderProvider>();
  private webhookHandlers = new Map<PaymentProvider, IWebhookHandler>();
  private refundProviders = new Map<PaymentProvider, IRefundProvider>();

  constructor(
    private razorpayPaymentLink: RazorpayPaymentLinkAdapter,
    private razorpaySubscription: RazorpaySubscriptionAdapter,
    private razorpayOrder: RazorpayOrderAdapter,
    private razorpayWebhook: RazorpayWebhookAdapter,
    private razorpayRefund: RazorpayRefundAdapter,
  ) {
    this.registerProviders();
  }

  private registerProviders(): void {
    this.paymentLinkProviders.set(
      PaymentProvider.RAZORPAY,
      this.razorpayPaymentLink,
    );
    this.subscriptionProviders.set(
      PaymentProvider.RAZORPAY,
      this.razorpaySubscription,
    );
    this.orderProviders.set(PaymentProvider.RAZORPAY, this.razorpayOrder);
    this.webhookHandlers.set(PaymentProvider.RAZORPAY, this.razorpayWebhook);
    this.refundProviders.set(PaymentProvider.RAZORPAY, this.razorpayRefund);
  }

  getPaymentLinkProvider(provider?: PaymentProvider): IPaymentLinkProvider {
    const targetProvider = provider || this.getDefaultProvider();
    const instance = this.paymentLinkProviders.get(targetProvider);

    if (!instance) {
      throw new Error(`Payment link provider ${targetProvider} not registered`);
    }

    return instance;
  }

  getSubscriptionProvider(provider?: PaymentProvider): ISubscriptionProvider {
    const targetProvider = provider || this.getDefaultProvider();
    const instance = this.subscriptionProviders.get(targetProvider);

    if (!instance) {
      throw new Error(`Subscription provider ${targetProvider} not registered`);
    }

    return instance;
  }

  getOrderProvider(provider?: PaymentProvider): IOrderProvider {
    const targetProvider = provider || this.getDefaultProvider();
    const instance = this.orderProviders.get(targetProvider);

    if (!instance) {
      throw new Error(`Order provider ${targetProvider} not registered`);
    }

    return instance;
  }

  getWebhookHandler(provider?: PaymentProvider): IWebhookHandler {
    const targetProvider = provider || this.getDefaultProvider();
    const instance = this.webhookHandlers.get(targetProvider);

    if (!instance) {
      throw new Error(`Webhook handler for ${targetProvider} not registered`);
    }

    return instance;
  }

  getRefundProvider(provider?: PaymentProvider): IRefundProvider {
    const targetProvider = provider || this.getDefaultProvider();
    const instance = this.refundProviders.get(targetProvider);

    if (!instance) {
      throw new Error(`Refund provider ${targetProvider} not registered`);
    }

    return instance;
  }

  getDefaultProvider(): PaymentProvider {
    return PaymentProvider.RAZORPAY;
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.paymentLinkProviders.keys());
  }

  detectProviderFromWebhook(headers: Record<string, string>): PaymentProvider {
    return detectPaymentProviderFromWebhookHeaders(headers);
  }
}

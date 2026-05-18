import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayClientService } from './infrastructure/adapters/razorpay/razorpay-client.service';
import { RazorpayPaymentLinkAdapter } from './infrastructure/adapters/razorpay/razorpay-payment-link.adapter';
import { RazorpaySubscriptionAdapter } from './infrastructure/adapters/razorpay/razorpay-subscription.adapter';
import { RazorpayOrderAdapter } from './infrastructure/adapters/razorpay/razorpay-order.adapter';
import { RazorpayWebhookAdapter } from './infrastructure/adapters/razorpay/razorpay-webhook.adapter';
import { RazorpayRefundAdapter } from './infrastructure/adapters/razorpay/razorpay-refund.adapter';
import { RazorpayInvoiceAdapter } from './infrastructure/adapters/razorpay/razorpay-invoice.adapter';
import { PaymentGatewayFactory } from './infrastructure/factories/payment-gateway.factory';
import {
  CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN,
  DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
  SUBSCRIPTION_PROVIDER_TOKEN,
  ORDER_PROVIDER_TOKEN,
  WEBHOOK_HANDLER_TOKEN,
  REFUND_PROVIDER_TOKEN,
} from './core/ports';

/** Wires Razorpay adapters for Docita SaaS + shared factory; see docs/product/PAYMENT_FLOWS.md. */
@Module({
  imports: [ConfigModule],
  providers: [
    RazorpayClientService,
    RazorpayPaymentLinkAdapter,
    RazorpaySubscriptionAdapter,
    RazorpayOrderAdapter,
    RazorpayWebhookAdapter,
    RazorpayRefundAdapter,
    RazorpayInvoiceAdapter,
    PaymentGatewayFactory,
    {
      provide: DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getPaymentLinkProvider(),
      inject: [PaymentGatewayFactory],
    },
    {
      provide: CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getPaymentLinkProvider(),
      inject: [PaymentGatewayFactory],
    },
    {
      provide: SUBSCRIPTION_PROVIDER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getSubscriptionProvider(),
      inject: [PaymentGatewayFactory],
    },
    {
      provide: ORDER_PROVIDER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getOrderProvider(),
      inject: [PaymentGatewayFactory],
    },
    {
      provide: REFUND_PROVIDER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getRefundProvider(),
      inject: [PaymentGatewayFactory],
    },
    {
      provide: WEBHOOK_HANDLER_TOKEN,
      useFactory: (factory: PaymentGatewayFactory) =>
        factory.getWebhookHandler(),
      inject: [PaymentGatewayFactory],
    },
  ],
  exports: [
    PaymentGatewayFactory,
    RazorpayInvoiceAdapter,
    DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
    CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN,
    SUBSCRIPTION_PROVIDER_TOKEN,
    ORDER_PROVIDER_TOKEN,
    WEBHOOK_HANDLER_TOKEN,
    REFUND_PROVIDER_TOKEN,
  ],
})
export class PaymentsModule {}

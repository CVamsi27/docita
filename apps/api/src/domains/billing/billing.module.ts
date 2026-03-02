import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import {
  BillingCalculatorService,
  InvoiceValidatorService,
} from './core/services';
import { PricingService } from './core/services/pricing.service';
import { UsageTrackingService } from './core/services/usage-tracking.service';
import { OverageCalculationService } from './core/services/overage-calculation.service';
import { UsageAggregationService } from './core/services/usage-aggregation.service';
import {
  InvoicesService,
  PaymentsService,
  RetryService,
  SchedulerService,
  PDFService,
} from './application/services';
import {
  PrismaInvoiceRepository,
  PrismaPaymentSessionRepository,
} from './infrastructure/repositories';
import {
  InvoicesController,
  PaymentsController,
  WebhooksController,
} from './presentation/controllers';
import { PricingController } from './presentation/controllers/pricing.controller';
import { INVOICE_REPOSITORY_TOKEN } from './core/repositories/invoice.repository';
import { PAYMENT_SESSION_REPOSITORY_TOKEN } from './core/repositories/payment-session.repository';
import {
  RazorpayPaymentProvider,
  PAYMENT_PROVIDER_TOKEN,
} from './infrastructure/providers/razorpay.provider';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { NotificationsModule } from '@/shared/modules/messaging/notifications/notifications.module';
import { GatewaysModule } from '@/gateways/gateways.module';
import { WebhooksModule } from '@/domains/webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    AuditModule,
    MessagingModule,
    NotificationsModule,
    GatewaysModule,
    WebhooksModule,
    BullModule.registerQueue({
      name: 'payment-retry',
    }),
  ],
  controllers: [
    InvoicesController,
    PaymentsController,
    WebhooksController,
    PricingController,
  ],
  providers: [
    BillingCalculatorService,
    InvoiceValidatorService,
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
    InvoicesService,
    PaymentsService,
    RetryService,
    SchedulerService,
    PDFService,
    RazorpayPaymentProvider,
    {
      provide: INVOICE_REPOSITORY_TOKEN,
      useClass: PrismaInvoiceRepository,
    },
    {
      provide: PAYMENT_SESSION_REPOSITORY_TOKEN,
      useClass: PrismaPaymentSessionRepository,
    },
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: RazorpayPaymentProvider,
    },
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    BillingCalculatorService,
    InvoiceValidatorService,
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
  ],
})
export class BillingModule {}

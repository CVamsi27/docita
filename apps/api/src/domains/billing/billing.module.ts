import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { MockBullModule as BullModule } from '@/common/mocks/mock-bull.module';
import {
  BillingCalculatorService,
  ClaimValidationService,
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
import { PaymentsModule } from '@/domains/payments/payments.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { NotificationsModule } from '@/shared/modules/messaging/notifications/notifications.module';
import { GatewaysModule } from '@/gateways/gateways.module';
import { WebhooksModule } from '@/domains/webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    DocumentsModule,
    PaymentsModule,
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
    ClaimValidationService,
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
    {
      provide: INVOICE_REPOSITORY_TOKEN,
      useClass: PrismaInvoiceRepository,
    },
    {
      provide: PAYMENT_SESSION_REPOSITORY_TOKEN,
      useClass: PrismaPaymentSessionRepository,
    },
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    BillingCalculatorService,
    ClaimValidationService,
    InvoiceValidatorService,
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
  ],
})
export class BillingModule {}

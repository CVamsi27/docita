import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { DocumentsWorkerModule } from '@/domains/documents/documents.worker.module';
import {
  BillingCalculatorService,
  ClaimValidationService,
  InvoiceValidatorService,
  TaxCalculatorService,
} from './core/services';
import { PricingService } from './core/services/pricing.service';
import { UsageTrackingService } from './core/services/usage-tracking.service';
import { OverageCalculationService } from './core/services/overage-calculation.service';
import { UsageAggregationService } from './core/services/usage-aggregation.service';
import {
  InvoicesService,
  InvoicesQueryService,
  InvoicesCommandService,
  PaymentsService,
  RetryService,
  SchedulerService,
  PDFService,
} from './application/services';
import { InvoicePdfProcessor } from './application/services/invoice-pdf.processor';
import {
  PrismaInvoiceRepository,
  PrismaPaymentSessionRepository,
} from './infrastructure/repositories';
import { INVOICE_REPOSITORY_TOKEN } from './core/repositories/invoice.repository';
import { PAYMENT_SESSION_REPOSITORY_TOKEN } from './core/repositories/payment-session.repository';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { WhatsAppWorkerModule } from '@/domains/whatsapp/whatsapp.worker.module';
import { NotificationsWorkerModule } from '@/shared/modules/messaging/notifications/notifications.worker.module';
import { QueueWorkerModule } from '@/shared/modules/queue/queue.worker.module';
import { BillingPaymentRetryCron } from './application/cron/billing-payment-retry.cron';
import { BillingScheduledPaymentRemindersCron } from './application/cron/billing-scheduled-payment-reminders.cron';
import { BillingUsageAggregationCron } from './application/cron/billing-usage-aggregation.cron';

@Module({
  imports: [
    PrismaWorkerModule,
    DocumentsWorkerModule,
    PaymentsModule,
    WhatsAppWorkerModule,
    NotificationsWorkerModule,
    QueueWorkerModule,
  ],
  providers: [
    BillingCalculatorService,
    TaxCalculatorService,
    ClaimValidationService,
    InvoiceValidatorService,
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
    InvoicesQueryService,
    InvoicesCommandService,
    InvoicesService,
    PaymentsService,
    RetryService,
    SchedulerService,
    PDFService,
    InvoicePdfProcessor,
    {
      provide: INVOICE_REPOSITORY_TOKEN,
      useClass: PrismaInvoiceRepository,
    },
    {
      provide: PAYMENT_SESSION_REPOSITORY_TOKEN,
      useClass: PrismaPaymentSessionRepository,
    },
    BillingPaymentRetryCron,
    BillingScheduledPaymentRemindersCron,
    BillingUsageAggregationCron,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    BillingCalculatorService,
    TaxCalculatorService,
    ClaimValidationService,
    InvoiceValidatorService,
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
  ],
})
export class BillingWorkerModule {}

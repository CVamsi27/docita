import { BILLING_PERSISTENCE_PORT } from './application/ports/billing-persistence.port';
import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
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
  PaymentsQueryService,
  PaymentsCommandService,
  RazorpayInvoiceWebhookService,
  PaymentsService,
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
import { BillingScheduledPaymentRemindersCron } from './application/cron/billing-scheduled-payment-reminders.cron';
import { BillingUsageAggregationCron } from './application/cron/billing-usage-aggregation.cron';
import { PDF_JOB_PROCESSOR_PRISMA_TOKEN } from '@/shared/modules/queue/pdf-job.service';
import {
  CLINIC_PRICING_QUERY_TOKEN,
  CLINIC_USAGE_PORT_TOKEN,
  OVERAGE_CALCULATION_TOKEN,
  INVOICE_TAX_CALCULATOR_TOKEN,
} from './application/ports';

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
    { provide: BILLING_PERSISTENCE_PORT, useExisting: PrismaService },
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
    PaymentsQueryService,
    PaymentsCommandService,
    RazorpayInvoiceWebhookService,
    PaymentsService,
    SchedulerService,
    PDFService,
    InvoicePdfProcessor,
    {
      provide: PDF_JOB_PROCESSOR_PRISMA_TOKEN,
      useExisting: PrismaService,
    },
    {
      provide: INVOICE_REPOSITORY_TOKEN,
      useClass: PrismaInvoiceRepository,
    },
    {
      provide: PAYMENT_SESSION_REPOSITORY_TOKEN,
      useClass: PrismaPaymentSessionRepository,
    },
    {
      provide: CLINIC_PRICING_QUERY_TOKEN,
      useExisting: PricingService,
    },
    {
      provide: CLINIC_USAGE_PORT_TOKEN,
      useExisting: UsageTrackingService,
    },
    {
      provide: OVERAGE_CALCULATION_TOKEN,
      useExisting: OverageCalculationService,
    },
    {
      provide: INVOICE_TAX_CALCULATOR_TOKEN,
      useExisting: TaxCalculatorService,
    },
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
    PDFService,
    CLINIC_PRICING_QUERY_TOKEN,
    CLINIC_USAGE_PORT_TOKEN,
    OVERAGE_CALCULATION_TOKEN,
    INVOICE_TAX_CALCULATOR_TOKEN,
  ],
})
export class BillingWorkerModule {}

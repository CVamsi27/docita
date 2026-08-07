import {
  BillingCalculatorService,
  ClaimValidationService,
  InvoiceValidatorService,
  TaxCalculatorService,
} from './core/services';
import { PricingService } from './core/services/pricing.service';
import { UsageTrackingService } from './core/services/usage-tracking.service';
import { UsageTrackingQueryService } from './core/services/usage-tracking-query.service';
import { UsageTrackingCommandService } from './core/services/usage-tracking-command.service';
import { OverageCalculationService } from './core/services/overage-calculation.service';
import { UsageAggregationService } from './core/services/usage-aggregation.service';
import {
  InvoicesService,
  InvoicesQueryService,
  InvoicesCommandService,
  PaymentsQueryService,
  PaymentsCommandService,
  InvoiceSettlementService,
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
import {
  CLINIC_PRICING_QUERY_TOKEN,
  CLINIC_USAGE_PORT_TOKEN,
  OVERAGE_CALCULATION_TOKEN,
  INVOICE_TAX_CALCULATOR_TOKEN,
} from './application/ports';
import { BILLING_PERSISTENCE_PORT } from './application/ports/billing-persistence.port';
import { PrismaService } from '@/prisma/prisma.service';
import { PDF_JOB_PROCESSOR_PRISMA_TOKEN } from '@/shared/modules/queue/pdf-job.service';

export const BILLING_SHARED_PROVIDERS = [
  { provide: BILLING_PERSISTENCE_PORT, useExisting: PrismaService },
  BillingCalculatorService,
  TaxCalculatorService,
  ClaimValidationService,
  InvoiceValidatorService,
  PricingService,
  UsageTrackingQueryService,
  UsageTrackingCommandService,
  UsageTrackingService,
  OverageCalculationService,
  UsageAggregationService,
  InvoicesQueryService,
  InvoicesCommandService,
  InvoicesService,
  PaymentsQueryService,
  PaymentsCommandService,
  InvoiceSettlementService,
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
];

export const BILLING_SHARED_EXPORTS = [
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
  INVOICE_REPOSITORY_TOKEN,
  CLINIC_PRICING_QUERY_TOKEN,
  CLINIC_USAGE_PORT_TOKEN,
  OVERAGE_CALCULATION_TOKEN,
  INVOICE_TAX_CALCULATOR_TOKEN,
];

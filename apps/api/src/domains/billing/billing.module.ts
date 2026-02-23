import { Module } from '@nestjs/common';

// Core layer
import {
  BillingCalculatorService,
  InvoiceValidatorService,
} from './core/services';

// Application layer (use cases)
import {
  CreateInvoiceUseCase,
  CalculateInvoiceTotalUseCase,
  UpdateInvoiceStatusUseCase,
} from './application/use-cases';

// Infrastructure layer
import {
  InMemoryInvoiceRepository,
} from './infrastructure/repositories';

// Presentation layer
import { InvoicesController } from './presentation/controllers';

// Legacy code (to be migrated)
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { UsageTrackingService } from './usage-tracking.service';
import { OverageCalculationService } from './domain-services/overage-calculation.service';
import { UsageAggregationService } from './domain-services/usage-aggregation.service';
import { PrismaModule } from '../../prisma/prisma.module';

// Port tokens
import { INVOICE_REPOSITORY_TOKEN } from './application/ports';

@Module({
  imports: [PrismaModule],
  controllers: [
    // New DDD-based controllers
    InvoicesController,
    // Legacy controllers (to be replaced)
    PricingController,
  ],
  providers: [
    // ============================================
    // CORE LAYER (Pure domain logic)
    // ============================================
    BillingCalculatorService,
    InvoiceValidatorService,

    // ============================================
    // APPLICATION LAYER (Use cases / Orchestration)
    // ============================================
    CreateInvoiceUseCase,
    CalculateInvoiceTotalUseCase,
    UpdateInvoiceStatusUseCase,

    // ============================================
    // INFRASTRUCTURE LAYER (Implementations)
    // ============================================
    // Repository implementations
    {
      provide: INVOICE_REPOSITORY_TOKEN,
      useClass: InMemoryInvoiceRepository,
      // In production, replace with:
      // provide: INVOICE_REPOSITORY_TOKEN,
      // useClass: PrismaInvoiceRepository,
    },

    // ============================================
    // LEGACY SERVICES (To be refactored)
    // ============================================
    PricingService,
    UsageTrackingService,
    OverageCalculationService,
    UsageAggregationService,
  ],
  exports: [
    // Export use cases for other modules
    CreateInvoiceUseCase,
    CalculateInvoiceTotalUseCase,
    UpdateInvoiceStatusUseCase,
    // Export domain services
    BillingCalculatorService,
    InvoiceValidatorService,
    // Legacy exports
    UsageTrackingService,
    OverageCalculationService,
  ],
})
export class BillingModule {}
export class BillingModule {}

import { Module } from '@nestjs/common';

import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { UsageTrackingService } from './usage-tracking.service';
import { OverageCalculationService } from './domain-services/overage-calculation.service';
import { UsageAggregationService } from './domain-services/usage-aggregation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    UsageTrackingService,
    // Domain services (SRP extraction from UsageTrackingService)
    OverageCalculationService,
    UsageAggregationService,
  ],
  exports: [UsageTrackingService, OverageCalculationService],
})
export class BillingModule {}

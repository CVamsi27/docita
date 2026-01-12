import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { UsageTrackingService } from './usage-tracking.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, PricingController],
  providers: [BillingService, PricingService, UsageTrackingService],
  exports: [BillingService, UsageTrackingService],
})
export class BillingModule {}

import { Module } from '@nestjs/common';

import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { UsageTrackingService } from './usage-tracking.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController],
  providers: [PricingService, UsageTrackingService],
  exports: [UsageTrackingService],
})
export class BillingModule {}

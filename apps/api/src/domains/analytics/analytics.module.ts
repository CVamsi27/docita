import { Module } from '@nestjs/common';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { AnalyticsService } from './application/services/analytics.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { FinancialAnalyticsFactory } from './factories/financial-analytics.factory';
import { ClinicalAnalyticsFactory } from './factories/clinical-analytics.factory';
import { OperationalAnalyticsFactory } from './factories/operational-analytics.factory';
import { SnapshotAnalyticsFactory } from './factories/snapshot-analytics.factory';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    FinancialAnalyticsFactory,
    ClinicalAnalyticsFactory,
    OperationalAnalyticsFactory,
    SnapshotAnalyticsFactory,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

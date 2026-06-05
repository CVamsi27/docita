import { Module } from '@nestjs/common';
import { AnalyticsOverviewController } from './presentation/controllers/analytics-overview.controller';
import { AnalyticsAdvancedController } from './presentation/controllers/analytics-advanced.controller';
import { AnalyticsService } from './application/services/analytics.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { FinancialAnalyticsFactory } from './core/factories/financial-analytics.factory';
import { ClinicalAnalyticsFactory } from './core/factories/clinical-analytics.factory';
import { OperationalAnalyticsFactory } from './core/factories/operational-analytics.factory';
import { SnapshotAnalyticsFactory } from './core/factories/snapshot-analytics.factory';
import { ANALYTICS_REPOSITORY_TOKEN } from './core/repositories/analytics.repository.interface';
import { PrismaAnalyticsRepository } from './infrastructure/repositories/prisma-analytics.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsOverviewController, AnalyticsAdvancedController],
  providers: [
    AnalyticsService,
    FinancialAnalyticsFactory,
    ClinicalAnalyticsFactory,
    OperationalAnalyticsFactory,
    SnapshotAnalyticsFactory,
    {
      provide: ANALYTICS_REPOSITORY_TOKEN,
      useClass: PrismaAnalyticsRepository,
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

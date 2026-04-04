import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaDashboardRepository } from '@/domains/dashboards/dashboard/infrastructure/persistence/prisma-dashboard.repository';
import { DASHBOARD_REPOSITORY_TOKEN } from '@/domains/dashboards/dashboard/core/repositories/dashboard.repository.interface';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY_TOKEN,
      useClass: PrismaDashboardRepository,
    },
  ],
})
export class DashboardModule {}

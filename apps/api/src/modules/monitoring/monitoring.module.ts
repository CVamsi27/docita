import { Module, Global } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { HealthController } from './health.controller';
import { MetricsScheduler } from './metrics.scheduler';
import { HealthService } from './health.service';
import { MonitoringFactory } from './factories/monitoring.factory';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController, HealthController],
  providers: [
    MonitoringService,
    MetricsScheduler,
    HealthService,
    MonitoringFactory,
  ],
  exports: [MonitoringService, HealthService, MonitoringFactory],
})
export class MonitoringModule {}

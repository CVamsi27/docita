import { Module } from '@nestjs/common';
import { MonitoringModule } from './monitoring.module';
import { MetricsScheduler } from './metrics.scheduler';

@Module({
  imports: [MonitoringModule],
  providers: [MetricsScheduler],
})
export class MonitoringSchedulerModule {}

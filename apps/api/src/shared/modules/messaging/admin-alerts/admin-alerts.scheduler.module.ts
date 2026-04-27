import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminAlertsModule } from './admin-alerts.module';
import { PlatformHealthAlertsScheduler } from './platform-health-alerts.scheduler';

@Module({
  imports: [ScheduleModule, AdminAlertsModule],
  providers: [PlatformHealthAlertsScheduler],
})
export class AdminAlertsSchedulerModule {}

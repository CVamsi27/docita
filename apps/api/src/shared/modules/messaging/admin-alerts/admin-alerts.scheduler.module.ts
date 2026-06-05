import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminAlertsModule } from './admin-alerts.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { PlatformHealthAlertsScheduler } from './platform-health-alerts.scheduler';

@Module({
  imports: [ScheduleModule, AdminAlertsModule, EmailModule],
  providers: [PlatformHealthAlertsScheduler],
})
export class AdminAlertsSchedulerModule {}

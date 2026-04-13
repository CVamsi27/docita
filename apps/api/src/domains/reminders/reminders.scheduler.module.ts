import { Module } from '@nestjs/common';
import { RemindersModule } from './reminders.module';
import { ReminderSchedulerService } from './application/services/reminder-scheduler.service';

@Module({
  imports: [RemindersModule],
  providers: [ReminderSchedulerService],
})
export class RemindersSchedulerModule {}

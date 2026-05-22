import { PrismaService } from '@/prisma/prisma.service';
import { REMINDER_PERSISTENCE_PORT } from './application/ports/reminder-persistence.port';
import { Module } from '@nestjs/common';
import { RemindersModule } from './reminders.module';
import { ReminderSchedulerService } from './application/services/reminder-scheduler.service';

@Module({
  imports: [RemindersModule],
  providers: [
    { provide: REMINDER_PERSISTENCE_PORT, useExisting: PrismaService },
    ReminderSchedulerService,
  ],
})
export class RemindersSchedulerModule {}

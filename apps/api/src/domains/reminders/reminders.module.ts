import { Module, forwardRef as _forwardRef } from '@nestjs/common';
import { RemindersController } from './presentation/controllers/reminders.controller';
import { RemindersService } from './application/services/reminders.service';
import { ReminderSettingsService } from './application/services/reminder-settings.service';
import { ReminderSchedulerService } from './application/services/reminder-scheduler.service';
import { ReminderNotificationService } from './application/services/reminder-notification.service';
import { ReminderHistoryService } from './application/services/reminder-history.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [RemindersController],
  providers: [
    ReminderSettingsService,
    ReminderSchedulerService,
    ReminderNotificationService,
    ReminderHistoryService,
    RemindersService,
  ],
  exports: [RemindersService],
})
export class RemindersModule {}

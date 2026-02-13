import { Module, forwardRef } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderNotificationService } from './reminder-notification.service';
import { ReminderHistoryService } from './reminder-history.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WhatsappModule)],
  controllers: [RemindersController],
  providers: [
    // Specialized services (Phase 7 decomposition)
    ReminderSettingsService,
    ReminderSchedulerService,
    ReminderNotificationService,
    ReminderHistoryService,
    // Facade service - maintains backward compatibility
    RemindersService,
  ],
  exports: [RemindersService],
})
export class RemindersModule {}

import { Injectable } from '@nestjs/common';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderHistoryService } from './reminder-history.service';
import { ReminderSettingsDto } from '@/domains/reminders/dto/reminder-settings.dto';

@Injectable()
export class RemindersService {
  constructor(
    private settingsService: ReminderSettingsService,
    private historyService: ReminderHistoryService,
  ) {}

  async getSettings(clinicId?: string) {
    return this.settingsService.getSettings(clinicId);
  }

  async updateSettings(data: ReminderSettingsDto, clinicId?: string) {
    return this.settingsService.updateSettings(data, clinicId);
  }

  async getReminderHistory(clinicId: string, limit?: number) {
    return this.historyService.getReminderHistory(clinicId, limit);
  }

  async sendManualReminder(
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp',
  ) {
    return this.historyService.sendManualReminder(appointmentId, type);
  }
}

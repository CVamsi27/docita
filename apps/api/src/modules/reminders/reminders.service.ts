import { Injectable } from '@nestjs/common';
import { ReminderSettingsService } from './reminder-settings.service';
import { ReminderHistoryService } from './reminder-history.service';

/**
 * RemindersService (Facade)
 *
 * Public API for appointment reminders. Orchestrates the following specialized services:
 * - ReminderSettingsService: Configuration management
 * - ReminderSchedulerService: Cron-based reminder scheduling (auto-runs)
 * - ReminderNotificationService: Multi-channel notification sending
 * - ReminderHistoryService: Reminder tracking and manual sending
 *
 * This facade maintains 100% backward compatibility with the original monolithic service.
 * All public methods are delegated to appropriate specialized services.
 *
 * Decomposition achieved:
 * - Before: 557 lines (monolithic service with 12 methods)
 * - After: 4 specialized services + 1 facade
 *   - RemindersService (facade): ~50L
 *   - ReminderSettingsService: ~70L
 *   - ReminderNotificationService: ~220L
 *   - ReminderSchedulerService: ~180L
 *   - ReminderHistoryService: ~100L
 * - Average per service: ~120L (78% reduction from monolith)
 */
@Injectable()
export class RemindersService {
  constructor(
    private settingsService: ReminderSettingsService,
    private historyService: ReminderHistoryService,
  ) {}

  /**
   * Get current reminder settings
   * @public API - used by controllers and other services
   */
  async getSettings() {
    return this.settingsService.getSettings();
  }

  /**
   * Update reminder settings
   * @public API - used by controllers and other services
   */
  async updateSettings(data: any) {
    return this.settingsService.updateSettings(data);
  }

  /**
   * Get reminder history for a clinic
   * @public API - used by controllers and other services
   */
  async getReminderHistory(clinicId: string, limit?: number) {
    return this.historyService.getReminderHistory(clinicId, limit);
  }

  /**
   * Send a manual reminder for an appointment
   * @public API - used by controllers and other services
   */
  async sendManualReminder(
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp',
  ) {
    return this.historyService.sendManualReminder(appointmentId, type);
  }
}

import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  REMINDER_PERSISTENCE_PORT,
  type ReminderPersistencePort,
} from '@/domains/reminders/application/ports/reminder-persistence.port';
import { ReminderSettings } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { isDatabaseAuthError } from '@/shared/modules/auth/auth/auth-database.util';

interface ReminderSettingsData {
  enabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  hoursBeforeAppt?: number;
  minutesBefore30?: boolean;
  emailSubject?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  whatsappTemplate?: string;
}

@Injectable()
export class ReminderSettingsService {
  private readonly logger = new Logger(ReminderSettingsService.name);
  private databaseAccessDisabled = false;

  constructor(
    @Inject(REMINDER_PERSISTENCE_PORT)
    private persistence: ReminderPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getFallbackSettings(clinicId?: string): ReminderSettings {
    const now = this.clock.now();
    return {
      id: 'local-fallback-reminder-settings',
      clinicId: clinicId ?? '',
      enabled: true,
      smsEnabled: false,
      emailEnabled: true,
      whatsappEnabled: true,
      hoursBeforeAppt: 24,
      minutesBefore30: true,
      emailSubject: 'Appointment Reminder - {clinicName}',
      emailTemplate: `Dear {patientName},

This is a friendly reminder about your upcoming appointment:

Date & Time: {appointmentDate} at {appointmentTime}
Doctor: Dr. {doctorName}
Type: {appointmentType}

Please arrive 10 minutes early. If you need to reschedule, please contact us.

Thank you,
{clinicName}`,
      smsTemplate:
        'Reminder: You have an appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}. - {clinicName}',
      whatsappTemplate:
        'Reminder: You have an appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}. - {clinicName}',
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSettings(clinicId?: string): Promise<ReminderSettings> {
    if (this.databaseAccessDisabled) return this.getFallbackSettings(clinicId);

    let settings: ReminderSettings | null = null;
    try {
      if (clinicId) {
        settings = await this.persistence.reminderSettings.findUnique({
          where: { clinicId },
        });
      } else {
        settings = await this.persistence.reminderSettings.findFirst();
      }

      if (!settings && clinicId) {
        settings = await this.persistence.reminderSettings.create({
          data: {
            clinicId,
            enabled: true,
            smsEnabled: false,
            emailEnabled: true,
            whatsappEnabled: true,
            hoursBeforeAppt: 24,
            minutesBefore30: true,
            emailSubject: 'Appointment Reminder - {clinicName}',
            emailTemplate: `Dear {patientName},

This is a friendly reminder about your upcoming appointment:

Date & Time: {appointmentDate} at {appointmentTime}
Doctor: Dr. {doctorName}
Type: {appointmentType}

Please arrive 10 minutes early. If you need to reschedule, please contact us.

Thank you,
{clinicName}`,
            smsTemplate:
              'Reminder: You have an appointment on {appointmentDate} at {appointmentTime} with Dr. {doctorName}. - {clinicName}',
          },
        });
      }

      return settings ?? this.getFallbackSettings(clinicId);
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling reminder settings database access due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return this.getFallbackSettings(clinicId);
      }

      throw error;
    }
  }

  async updateSettings(
    data: ReminderSettingsData,
    clinicId?: string,
  ): Promise<ReminderSettings> {
    if (this.databaseAccessDisabled) {
      return {
        ...this.getFallbackSettings(clinicId),
        ...data,
        updatedAt: this.clock.now(),
      } satisfies ReminderSettings;
    }

    const existing = await this.getSettings(clinicId);
    try {
      return await this.persistence.reminderSettings.update({
        where: { id: existing.id },
        data,
      });
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling reminder settings database access due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return {
          ...this.getFallbackSettings(clinicId),
          ...data,
          updatedAt: this.clock.now(),
        } satisfies ReminderSettings;
      }

      throw error;
    }
  }
}

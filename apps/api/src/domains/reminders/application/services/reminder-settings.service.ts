import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ReminderSettings } from '@workspace/db';

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

  constructor(private prisma: PrismaService) {}

  async getSettings(clinicId?: string): Promise<ReminderSettings> {
    let settings: ReminderSettings | null = null;

    if (clinicId) {
      settings = await this.prisma.reminderSettings.findUnique({
        where: { clinicId },
      });
    } else {
      settings = await this.prisma.reminderSettings.findFirst();
    }

    if (!settings && clinicId) {
      settings = await this.prisma.reminderSettings.create({
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

    return settings!;
  }

  async updateSettings(
    data: ReminderSettingsData,
    clinicId?: string,
  ): Promise<ReminderSettings> {
    const existing = await this.getSettings(clinicId);
    return this.prisma.reminderSettings.update({
      where: { id: existing.id },
      data,
    });
  }
}

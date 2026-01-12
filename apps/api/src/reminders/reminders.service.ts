import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderSettings } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service';
import { WhatsappTemplatesService } from '../modules/whatsapp/templates.service';

interface AppointmentForReminder {
  id: string;
  startTime: Date;
  type: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
  };
  doctor: {
    id: string;
    name: string;
  };
  clinic?: {
    id: string;
    name: string;
  };
}

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
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    @Inject(forwardRef(() => WhatsappTemplatesService))
    private templatesService: WhatsappTemplatesService,
  ) {}

  async getSettings() {
    let settings = await this.prisma.reminderSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.reminderSettings.create({
        data: {
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

    return settings;
  }

  async updateSettings(data: ReminderSettingsData) {
    const existing = await this.getSettings();
    return this.prisma.reminderSettings.update({
      where: { id: existing.id },
      data,
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAndSendReminders() {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      this.logger.log('Reminders are disabled');
      return;
    }

    const now = new Date();
    const reminderTime = new Date(
      now.getTime() + settings.hoursBeforeAppt * 60 * 60 * 1000,
    );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now,
          lte: reminderTime,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Found ${appointments.length} appointments needing reminders`,
    );

    for (const appointment of appointments) {
      const existingReminder = await this.prisma.appointmentReminder.findFirst({
        where: {
          appointmentId: appointment.id,
          status: 'sent',
        },
      });

      if (existingReminder) {
        continue;
      }

      if (settings.emailEnabled && appointment.patient.email) {
        await this.sendEmailReminder(
          appointment as AppointmentForReminder,
          settings,
        );
      }

      if (settings.smsEnabled && appointment.patient.phoneNumber) {
        await this.sendSmsReminder(
          appointment as AppointmentForReminder,
          settings,
        );
      }

      // Send WhatsApp reminder (24-hour)
      if (settings.whatsappEnabled && appointment.patient.phoneNumber) {
        await this.sendWhatsappReminder(
          appointment as AppointmentForReminder,
          settings,
          'appointment_reminder_24hr',
        );
      }
    }
  }

  /**
   * Check and send 30-minute reminders (runs every 5 minutes)
   */
  @Cron('*/5 * * * *')
  async checkAndSend30MinReminders() {
    const settings = await this.getSettings();

    if (
      !settings.enabled ||
      !settings.minutesBefore30 ||
      !settings.whatsappEnabled
    ) {
      return;
    }

    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const thirtyFiveMinFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    // Find appointments between 30-35 minutes from now
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: {
          gte: thirtyMinFromNow,
          lt: thirtyFiveMinFromNow,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Found ${appointments.length} appointments needing 30-min reminders`,
    );

    for (const appointment of appointments) {
      // Check if 30-min reminder already sent
      const existingReminder = await this.prisma.appointmentReminder.findFirst({
        where: {
          appointmentId: appointment.id,
          type: 'whatsapp_30min',
          status: 'sent',
        },
      });

      if (existingReminder) {
        continue;
      }

      if (appointment.patient.phoneNumber) {
        await this.sendWhatsappReminder(
          appointment as AppointmentForReminder,
          settings,
          'appointment_reminder_30min',
          'whatsapp_30min',
        );
      }
    }
  }

  private async sendEmailReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ) {
    try {
      const message = this.replacePlaceholders(
        settings.emailTemplate || '',
        appointment,
      );
      const subject = this.replacePlaceholders(
        settings.emailSubject || 'Appointment Reminder',
        appointment,
      );

      this.logger.log(`[EMAIL] To: ${appointment.patient.email}`);
      this.logger.log(`[EMAIL] Subject: ${subject}`);
      this.logger.log(`[EMAIL] Message: ${message}`);

      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email reminder: ${error.message}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  private async sendSmsReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ) {
    try {
      const message = this.replacePlaceholders(
        settings.smsTemplate || '',
        appointment,
      );

      this.logger.log(`[SMS] To: ${appointment.patient.phoneNumber}`);
      this.logger.log(`[SMS] Message: ${message}`);

      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`SMS reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS reminder: ${error.message}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  /**
   * Send WhatsApp reminder using template
   */
  private async sendWhatsappReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
    templateId: string,
    reminderType: string = 'whatsapp',
  ) {
    try {
      const clinicId = appointment.clinic?.id || '';
      const clinicName = appointment.clinic?.name || 'Docita';

      // Prepare template variables
      const variables = {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        doctorName: appointment.doctor.name,
        clinicName,
        date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
          timezone: DEFAULT_TIMEZONE,
        }),
        time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
          timezone: DEFAULT_TIMEZONE,
        }),
        appointmentType: appointment.type,
        appointmentId: appointment.id,
      };

      // Resolve template
      const resolved = await this.templatesService.resolveTemplate(
        templateId,
        variables,
        clinicId,
      );

      if (!resolved) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Get message based on mode (production vs sandbox)
      const message = this.templatesService.getMessageForMode(resolved);

      // Send WhatsApp message
      await this.whatsappService.sendMessage({
        to: appointment.patient.phoneNumber,
        message,
      });

      // Log the WhatsApp message
      await this.prisma.whatsappLog.create({
        data: {
          clinicId: clinicId || '',
          patientId: appointment.patient.id,
          phoneNumber: appointment.patient.phoneNumber,
          message,
          type: 'reminder',
          status: 'sent',
        },
      });

      // Create reminder record
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: reminderType,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(
        `[WhatsApp] ${reminderType} reminder sent for appointment ${appointment.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp reminder: ${error.message}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: reminderType,
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  private replacePlaceholders(
    template: string,
    appointment: AppointmentForReminder,
    timezone: string = DEFAULT_TIMEZONE,
  ): string {
    return template
      .replace(
        /{patientName}/g,
        `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      )
      .replace(/{doctorName}/g, appointment.doctor.name)
      .replace(
        /{appointmentDate}/g,
        formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
          timezone,
        }),
      )
      .replace(
        /{appointmentTime}/g,
        formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
          timezone,
        }),
      )
      .replace(/{appointmentType}/g, appointment.type)
      .replace(/{clinicName}/g, 'Your Clinic');
  }

  async getReminderHistory(limit: number = 50) {
    return this.prisma.appointmentReminder.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendManualReminder(
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp',
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const settings = await this.getSettings();

    if (type === 'email') {
      await this.sendEmailReminder(appointment, settings);
    } else if (type === 'sms') {
      await this.sendSmsReminder(appointment, settings);
    } else if (type === 'whatsapp') {
      await this.sendWhatsappReminder(
        appointment as AppointmentForReminder,
        settings,
        'appointment_reminder_24hr',
        'whatsapp_manual',
      );
    }

    return { success: true, message: `${type} reminder sent` };
  }
}

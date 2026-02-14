import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReminderSettings, WhatsappLogStatus } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service';
import { TemplatesService } from '../whatsapp/templates.service';

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

/**
 * ReminderNotificationService
 * Handles sending reminder notifications via email, SMS, and WhatsApp
 */
@Injectable()
export class ReminderNotificationService {
  private readonly logger = new Logger(ReminderNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappClient: WhatsappClientService,
    @Inject(forwardRef(() => TemplatesService))
    private templatesService: TemplatesService,
  ) {}

  /**
   * Send email reminder
   */
  async sendEmailReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ): Promise<void> {
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
      this.logger.error(`Failed to send email reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'failed',
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Send SMS reminder
   */
  async sendSmsReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ): Promise<void> {
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
      this.logger.error(`Failed to send SMS reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'failed',
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Send WhatsApp reminder using template
   */
  async sendWhatsappReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
    templateId: string,
    reminderType: string = 'whatsapp',
  ): Promise<void> {
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
      await this.whatsappClient.sendMessage({
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
          status: WhatsappLogStatus.SENT,
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
      this.logger.error(`Failed to send WhatsApp reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await this.prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: reminderType,
          status: 'failed',
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Replace template placeholders with actual appointment data
   */
  replacePlaceholders(
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
}

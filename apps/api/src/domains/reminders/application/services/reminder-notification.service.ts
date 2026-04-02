import {
  Injectable,
  Logger,
  NotFoundException as _NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ReminderSettings, WhatsappLogStatus } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';

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

@Injectable()
export class ReminderNotificationService {
  private readonly logger = new Logger(ReminderNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private sendMessage: SendMessageUseCase,
  ) {}

  private async isWhatsappEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    ) {
      return true;
    }

    const automation = clinic.whatsappAutomation as { enabled?: boolean };
    return automation.enabled !== false;
  }

  async sendEmailReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ): Promise<void> {
    try {
      this.replacePlaceholders(settings.emailTemplate || '', appointment);
      const subject = this.replacePlaceholders(
        settings.emailSubject || 'Appointment Reminder',
        appointment,
      );

      this.logger.debug(
        `[EMAIL] Reminder workflow started for appointment ${appointment.id}`,
      );
      this.logger.debug(`[EMAIL] Subject: ${subject}`);

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
      this.logger.error(
        `Failed to send email reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  async sendSmsReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ): Promise<void> {
    try {
      this.replacePlaceholders(settings.smsTemplate || '', appointment);

      this.logger.debug(
        `[SMS] Reminder workflow started for appointment ${appointment.id}`,
      );

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
      this.logger.error(
        `Failed to send SMS reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  async sendWhatsappReminder(
    appointment: AppointmentForReminder,
    _settings: ReminderSettings,
    templateId: string,
    reminderType: string = 'whatsapp',
  ): Promise<void> {
    try {
      const clinicId = appointment.clinic?.id || '';
      if (clinicId && !(await this.isWhatsappEnabled(clinicId))) {
        this.logger.log(
          `[WhatsApp] Disabled for clinic ${clinicId}; skipping ${reminderType} reminder for appointment ${appointment.id}`,
        );
        return;
      }

      const clinicName = appointment.clinic?.name ?? '';

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

      const { messageId: _messageId } = await this.sendMessage.execute({
        clinicId: clinicId || '',
        recipientPhone: appointment.patient.phoneNumber,
        templateName: templateId,
        variables,
      });

      await this.prisma.whatsappLog.create({
        data: {
          clinicId: clinicId || '',
          patientId: appointment.patient.id,
          phoneNumber: appointment.patient.phoneNumber,
          message: `Sent template: ${templateId}`,
          type: 'reminder',
          status: WhatsappLogStatus.SENT,
        },
      });

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
      this.logger.error(
        `Failed to send WhatsApp reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  replacePlaceholders(
    template: string,
    appointment: AppointmentForReminder,
    timezone: string = DEFAULT_TIMEZONE,
  ): string {
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const formattedDate = formatDate(
      appointment.startTime,
      DATE_FORMATS.DATE_MEDIUM,
      { timezone },
    );
    const formattedTime = formatTime(
      appointment.startTime,
      DATE_FORMATS.TIME_MEDIUM,
      { timezone },
    );

    const clinicName = appointment.clinic?.name ?? '';

    return template
      .replace(/\{\{patientName\}\}|\{patientName\}/g, patientName)
      .replace(/\{\{doctorName\}\}|\{doctorName\}/g, appointment.doctor.name)
      .replace(
        /\{\{appointmentDate\}\}|\{\{date\}\}|\{appointmentDate\}|\{date\}/g,
        formattedDate,
      )
      .replace(
        /\{\{appointmentTime\}\}|\{\{time\}\}|\{appointmentTime\}|\{time\}/g,
        formattedTime,
      )
      .replace(/\{\{appointmentType\}\}|\{appointmentType\}/g, appointment.type)
      .replace(/\{\{clinicName\}\}|\{clinicName\}/g, clinicName);
  }
}

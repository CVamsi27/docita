import {
  Injectable,
  Logger,
  NotFoundException as _NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  REMINDER_PERSISTENCE_PORT,
  type ReminderPersistencePort,
} from '@/domains/reminders/application/ports/reminder-persistence.port';
import { ReminderSettings, WhatsappLogStatus } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';

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
    @Inject(REMINDER_PERSISTENCE_PORT)
    private persistence: ReminderPersistencePort,
    private sendMessage: SendMessageUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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

      await this.persistence.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'email',
          status: 'sent',
          sentAt: this.clock.now(),
        },
      });

      this.logger.log(`Email reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.persistence.appointmentReminder.create({
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

      await this.persistence.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: 'sms',
          status: 'sent',
          sentAt: this.clock.now(),
        },
      });

      this.logger.log(`SMS reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send SMS reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.persistence.appointmentReminder.create({
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
      if (
        clinicId &&
        !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
      ) {
        this.logger.log(
          `[WhatsApp] Not allowed for clinic ${clinicId}; skipping ${reminderType} reminder for appointment ${appointment.id}`,
        );
        return;
      }

      const clinicName = appointment.clinic?.name ?? '';

      const variables: Record<string, string> = {
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
        appointmentId: String(appointment.id),
      };

      const sendResult = await this.sendMessage.execute({
        clinicId: clinicId || '',
        recipientPhone: appointment.patient.phoneNumber,
        templateName: templateId,
        variables,
      });

      await this.persistence.whatsappLog.create({
        data: {
          clinicId: clinicId || '',
          patientId: appointment.patient.id,
          phoneNumber: appointment.patient.phoneNumber,
          message: `Sent template: ${templateId}`,
          type: 'reminder',
          status: WhatsappLogStatus.SENT,
          senderMode: sendResult.senderMode ?? 'SHARED',
          senderPhoneNumberId: sendResult.senderPhoneNumberId ?? null,
        },
      });

      await this.persistence.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          type: reminderType,
          status: 'sent',
          sentAt: this.clock.now(),
        },
      });

      this.logger.log(
        `[WhatsApp] ${reminderType} reminder sent for appointment ${appointment.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.persistence.appointmentReminder.create({
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

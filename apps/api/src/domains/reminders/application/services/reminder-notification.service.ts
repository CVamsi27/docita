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
  getPatientFullName,
} from '@workspace/utils';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

function formatCaughtError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

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
    timezone?: string | null;
  };
}

const DEFAULT_EMAIL_TEMPLATE = [
  'Hello {{patientName}},',
  '',
  'This is a reminder for your appointment with {{doctorName}} at {{clinicName}} on {{appointmentDate}} at {{appointmentTime}}.',
].join('\n');

@Injectable()
export class ReminderNotificationService {
  private readonly logger = new Logger(ReminderNotificationService.name);

  constructor(
    @Inject(REMINDER_PERSISTENCE_PORT)
    private persistence: ReminderPersistencePort,
    private sendMessage: SendMessageUseCase,
    private readonly emailService: EmailService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}
  async sendEmailReminder(
    appointment: AppointmentForReminder,
    settings: ReminderSettings,
  ): Promise<void> {
    const timezone = appointment.clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
    try {
      if (!appointment.patient.email) {
        await this.recordReminderOutcome({
          appointmentId: appointment.id,
          type: 'email',
          status: 'skipped',
          error: 'patient has no email address on file',
        });
        return;
      }

      const subject = this.replacePlaceholders(
        settings.emailSubject || 'Appointment Reminder',
        appointment,
        timezone,
      );
      const body = this.replacePlaceholders(
        settings.emailTemplate || DEFAULT_EMAIL_TEMPLATE,
        appointment,
        timezone,
      );

      const result = await this.emailService.send({
        to: appointment.patient.email,
        subject,
        text: body,
        html: `<div style="font-family:sans-serif;white-space:pre-line">${body}</div>`,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'email provider rejected the send');
      }

      await this.recordReminderOutcome({
        appointmentId: appointment.id,
        type: 'email',
        status: 'sent',
        sentAt: this.clock.now(),
      });

      this.logger.log(`Email reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.recordReminderOutcome({
        appointmentId: appointment.id,
        type: 'email',
        status: 'failed',
        error: formatCaughtError(error),
      });
    }
  }

  async sendSmsReminder(
    appointment: AppointmentForReminder,
    _settings: ReminderSettings,
  ): Promise<void> {
    // No SMS provider transport is wired yet. Record an honest skipped row
    // (never "sent") so clinics are not misled and dedupe stays accurate.
    this.logger.warn(
      `SMS reminders are not configured for this deployment; skipping for appointment ${appointment.id}`,
    );
    await this.recordReminderOutcome({
      appointmentId: appointment.id,
      type: 'sms',
      status: 'skipped',
      error: 'SMS transport not configured',
    });
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
        !(await isClinicWhatsAppAutomationSendingAllowed(
          this.persistence,
          clinicId,
        ))
      ) {
        this.logger.log(
          `[WhatsApp] Not allowed for clinic ${clinicId}; skipping ${reminderType} reminder for appointment ${appointment.id}`,
        );
        return;
      }

      const clinicName = appointment.clinic?.name ?? '';
      const timezone = appointment.clinic?.timezone?.trim() || DEFAULT_TIMEZONE;

      const variables: Record<string, string> = {
        patientName: getPatientFullName(appointment.patient),
        doctorName: appointment.doctor.name,
        clinicName,
        date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
          timezone,
        }),
        time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
          timezone,
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

      await this.persistence.$transaction(async (tx) => {
        await tx.whatsappLog.create({
          data: {
            clinicId: clinicId || '',
            patientId: appointment.patient.id,
            phoneNumber: appointment.patient.phoneNumber,
            message: `Sent template: ${templateId}`,
            type: 'reminder',
            status: WhatsappLogStatus.SENT,
            providerMessageId: sendResult.providerMessageId || null,
            senderMode: sendResult.senderMode ?? 'SHARED',
            senderPhoneNumberId: sendResult.senderPhoneNumberId ?? null,
            requestBody: toPrismaInputJsonValue({
              appointmentId: appointment.id,
              templateId,
              variables,
            }),
          },
        });

        await tx.appointmentReminder.create({
          data: {
            appointmentId: appointment.id,
            type: reminderType,
            status: 'sent',
            sentAt: this.clock.now(),
          },
        });
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
          error: formatCaughtError(error),
        },
      });
    }
  }

  /** Single audit row per reminder attempt outcome (sent/failed/skipped). */
  private async recordReminderOutcome(input: {
    appointmentId: string;
    type: string;
    status: 'sent' | 'failed' | 'skipped';
    sentAt?: Date;
    error?: string;
  }): Promise<void> {
    await this.persistence.appointmentReminder.create({
      data: {
        appointmentId: input.appointmentId,
        type: input.type,
        status: input.status,
        ...(input.sentAt ? { sentAt: input.sentAt } : {}),
        ...(input.error ? { error: input.error } : {}),
      },
    });
  }

  replacePlaceholders(
    template: string,
    appointment: AppointmentForReminder,
    timezone: string = DEFAULT_TIMEZONE,
  ): string {
    const patientName = getPatientFullName(appointment.patient);
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

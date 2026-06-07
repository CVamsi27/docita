import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import {
  IWhatsAppRepository,
  WHATSAPP_REPOSITORY_TOKEN,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  DATE_FORMATS,
  formatDate,
  formatTime,
  getPatientFullName,
} from '@workspace/utils';
import {
  buildInvoiceCreatedVariables,
  buildPrescriptionCreatedVariables,
} from '@/shared/whatsapp/patient-whatsapp-template-variables';
import {
  INVOICE_NOTIFICATION_INCLUDE,
  PRESCRIPTION_NOTIFICATION_INCLUDE,
} from './whatsapp-notification-query.helpers';

@Injectable()
export class WhatsAppAutomationService {
  private readonly logger = new Logger(WhatsAppAutomationService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  async sendPrescriptionSystem(
    prescriptionId: string,
    clinicId: string,
  ): Promise<void> {
    if (!(await this.repository.isAutomationEnabled(clinicId))) return;

    const prescription = await this.persistence.prescription.findUnique({
      where: { id: prescriptionId },
      include: PRESCRIPTION_NOTIFICATION_INCLUDE,
    });

    if (!prescription?.patient.phoneNumber) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: prescription.patient.phoneNumber,
      templateName: 'prescription_created',
      variables: buildPrescriptionCreatedVariables({
        prescriptionId,
        patientName: getPatientFullName(prescription.patient),
        doctorName: prescription.doctor.name,
        clinicName: prescription.appointment?.clinic?.name ?? '',
      }),
    });
  }

  async sendInvoiceSystem(invoiceId: string, clinicId: string): Promise<void> {
    if (!(await this.repository.isAutomationEnabled(clinicId))) return;

    const invoice = await this.persistence.invoice.findUnique({
      where: { id: invoiceId },
      include: INVOICE_NOTIFICATION_INCLUDE,
    });

    if (!invoice?.patient.phoneNumber) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: invoice.patient.phoneNumber,
      templateName: 'invoice_created',
      variables: buildInvoiceCreatedVariables({
        invoiceId,
        patientName: getPatientFullName(invoice.patient),
        clinicName: invoice.appointment?.clinic?.name ?? '',
        amount: invoice.total,
        currency: invoice.currency ?? invoice.appointment?.clinic?.currency,
      }),
    });
  }

  /**
   * Loads an appointment for a WhatsApp automation send, gated on the
   * clinic having automations enabled and the patient having a phone
   * number to message. `sendAppointmentConfirmation` and
   * `sendAppointmentUpdate` both need this exact gate-and-fetch shape —
   * sharing it keeps the `include`/guard from drifting between them.
   * Returns `null` when the send should be skipped.
   */
  private async loadNotifiableAppointment(
    appointmentId: string,
    clinicId: string,
  ) {
    if (!(await this.repository.isAutomationEnabled(clinicId))) return null;

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { name: true } },
        clinic: { select: { name: true } },
      },
    });

    return appointment?.patient.phoneNumber ? appointment : null;
  }

  async sendAppointmentConfirmation(
    appointmentId: string,
    clinicId: string,
  ): Promise<void> {
    const appointment = await this.loadNotifiableAppointment(
      appointmentId,
      clinicId,
    );
    if (!appointment) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: appointment.patient.phoneNumber,
      templateName: 'appointment_confirmation',
      variables: {
        patientName: getPatientFullName(appointment.patient),
        clinicName: appointment.clinic?.name ?? '',
        doctorName: appointment.doctor.name,
        date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM),
        time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM),
      },
    });
  }

  async sendAppointmentUpdate(
    appointmentId: string,
    clinicId: string,
    type: 'CANCELLED' | 'RESCHEDULED',
  ): Promise<void> {
    const appointment = await this.loadNotifiableAppointment(
      appointmentId,
      clinicId,
    );
    if (!appointment) return;

    const templateName =
      type === 'CANCELLED'
        ? 'appointment_cancelled'
        : 'appointment_rescheduled';

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: appointment.patient.phoneNumber,
      templateName,
      variables: {
        patientName: getPatientFullName(appointment.patient),
        clinicName: appointment.clinic?.name ?? '',
        date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM),
        time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM),
      },
    });
  }

  async notifyStaffWhatsApp(payload: {
    clinicId: string;
    recipients: string[];
    title: string;
    message: string;
    variables?: Record<string, string>;
  }): Promise<void> {
    if (!(await this.repository.isAutomationEnabled(payload.clinicId))) return;

    for (const to of payload.recipients) {
      await this.sendMessage
        .execute({
          clinicId: payload.clinicId,
          recipientPhone: to,
          templateName: 'staff_notification',
          variables: {
            title: payload.title,
            message: payload.message,
            ...payload.variables,
          },
        })
        .catch((err) =>
          this.logger.error(`Failed to notify staff ${to}: ${err.message}`),
        );
    }
  }
}

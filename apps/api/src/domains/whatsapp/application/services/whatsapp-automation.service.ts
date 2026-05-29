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
  docitaPublicInvoiceUrl,
  docitaPublicRxUrl,
  formatDate,
  formatTime,
} from '@workspace/utils';

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
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { name: true } },
        appointment: { include: { clinic: { select: { name: true } } } },
      },
    });

    if (!prescription?.patient.phoneNumber) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: prescription.patient.phoneNumber,
      templateName: 'prescription_created',
      variables: {
        clinicName: prescription.appointment?.clinic?.name ?? '',
        patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
        doctorName: prescription.doctor.name,
        rxToken: prescriptionId,
        rxLink: docitaPublicRxUrl(prescriptionId),
      },
    });
  }

  async sendInvoiceSystem(invoiceId: string, clinicId: string): Promise<void> {
    if (!(await this.repository.isAutomationEnabled(clinicId))) return;

    const invoice = await this.persistence.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        appointment: { include: { clinic: { select: { name: true } } } },
      },
    });

    if (!invoice?.patient.phoneNumber) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: invoice.patient.phoneNumber,
      templateName: 'invoice_created',
      variables: {
        clinicName: invoice.appointment?.clinic?.name ?? '',
        patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
        amount: `${invoice.total}`,
        invToken: invoiceId,
        invLink: docitaPublicInvoiceUrl(invoiceId),
      },
    });
  }

  async sendAppointmentConfirmation(
    appointmentId: string,
    clinicId: string,
  ): Promise<void> {
    if (!(await this.repository.isAutomationEnabled(clinicId))) return;

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

    if (!appointment?.patient.phoneNumber) return;

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: appointment.patient.phoneNumber,
      templateName: 'appointment_confirmation',
      variables: {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
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
    if (!(await this.repository.isAutomationEnabled(clinicId))) return;

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        clinic: { select: { name: true } },
      },
    });

    if (!appointment?.patient.phoneNumber) return;

    const templateName =
      type === 'CANCELLED'
        ? 'appointment_cancelled'
        : 'appointment_rescheduled';

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: appointment.patient.phoneNumber,
      templateName,
      variables: {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
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

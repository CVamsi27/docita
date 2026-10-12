import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';
import {
  DATE_FORMATS,
  formatDate,
  formatTime,
  getPatientFullName,
} from '@workspace/utils';
import {
  buildAppointmentDelayVariables,
  buildInvoiceCreatedVariables,
  buildPrescriptionCreatedVariables,
} from '@/shared/whatsapp/patient-whatsapp-template-variables';
import {
  logOutboundPatientTemplate,
  resolveAppointmentMapsLink,
} from './system-events.helpers';
import {
  APPOINTMENT_NOTIFICATION_INCLUDE,
  INVOICE_NOTIFICATION_INCLUDE,
  NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT,
  PRESCRIPTION_NOTIFICATION_INCLUDE,
} from './whatsapp-notification-query.helpers';

// Facade — loads appointment/prescription/invoice context then delegates sends
@Injectable()
export class SystemEventsService {
  private readonly logger = new Logger(SystemEventsService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly sendMessage: SendMessageUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async checkSendingAllowed(
    clinicId: string,
    notificationLabel: string,
  ): Promise<boolean> {
    if (
      await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId)
    ) {
      return false;
    }

    this.logger.log(
      `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping ${notificationLabel}`,
    );
    return true;
  }

  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
    if (await this.checkSendingAllowed(clinicId, 'prescription notification'))
      return;

    const prescription = await this.persistence.prescription.findUnique({
      where: { id: prescriptionId, clinicId },
      include: PRESCRIPTION_NOTIFICATION_INCLUDE,
    });

    if (!prescription || !prescription.patient.phoneNumber) return;

    const variables = buildPrescriptionCreatedVariables({
      prescriptionId: prescription.id,
      patientName: getPatientFullName(prescription.patient),
      doctorName: prescription.doctor.name,
      clinicName: prescription.appointment?.clinic?.name ?? '',
    });

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: prescription.patient.phoneNumber,
        templateName: 'prescription_created',
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send prescription WhatsApp for ${prescriptionId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendInvoiceSystem(invoiceId: string, clinicId: string) {
    if (await this.checkSendingAllowed(clinicId, 'invoice notification'))
      return;

    const invoice = await this.persistence.invoice.findUnique({
      where: { id: invoiceId, clinicId },
      include: INVOICE_NOTIFICATION_INCLUDE,
    });

    if (!invoice || !invoice.patient.phoneNumber) return;

    const variables = buildInvoiceCreatedVariables({
      invoiceId: invoice.id,
      patientName: getPatientFullName(invoice.patient),
      clinicName: invoice.appointment?.clinic?.name ?? '',
      amount: invoice.total,
      currency: invoice.currency ?? invoice.appointment?.clinic?.currency,
    });

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: invoice.patient.phoneNumber,
        templateName: 'invoice_created',
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invoice WhatsApp for ${invoiceId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendAppointmentConfirmation(appointmentId: string, clinicId: string) {
    if (await this.checkSendingAllowed(clinicId, 'appointment confirmation'))
      return;

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId, clinicId },
      include: {
        patient: {
          select: NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT,
        },
        doctor: { select: { name: true } },
        clinic: { select: { name: true, settings: true, timezone: true } },
      },
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const mapsLink = resolveAppointmentMapsLink(appointment.clinic?.settings);

    const variables = {
      patientName: getPatientFullName(appointment.patient),
      clinicName: appointment.clinic?.name ?? '',
      doctorName: appointment.doctor.name,
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
        timezone: appointment.clinic?.timezone,
      }),
      time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
        timezone: appointment.clinic?.timezone,
      }),
      mapsLink,
    };

    try {
      const sendResult = await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName: 'appointment_confirmation',
        variables,
      });
      await logOutboundPatientTemplate(this.persistence, {
        clinicId,
        patientId: appointment.patient.id,
        phoneNumber: appointment.patient.phoneNumber,
        templateId: 'appointment_confirmation',
        appointmentId,
        sendResult,
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send appointment confirmation WhatsApp for ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendPaymentConfirmation(invoiceId: string, clinicId: string) {
    if (await this.checkSendingAllowed(clinicId, 'payment confirmation'))
      return;

    const invoice = await this.persistence.invoice.findUnique({
      where: { id: invoiceId, clinicId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        appointment: {
          include: { clinic: { select: { name: true, timezone: true } } },
        },
        paymentSessions: {
          where: { status: 'CAPTURED' },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { providerPaymentId: true, paidAt: true, amount: true },
        },
      },
    });

    if (!invoice || !invoice.patient.phoneNumber) return;

    const session = invoice.paymentSessions[0];
    const paidAt = session?.paidAt ?? this.clock.now();

    const variables = {
      patientName: getPatientFullName(invoice.patient),
      clinicName: invoice.appointment?.clinic?.name ?? '',
      amount: `${invoice.total}`,
      invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
      date: formatDate(paidAt, DATE_FORMATS.DATE_MEDIUM, {
        timezone: invoice.appointment?.clinic?.timezone,
      }),
      paymentId: session?.providerPaymentId ?? '',
    };

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: invoice.patient.phoneNumber,
        templateName: 'payment_confirmation',
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation WhatsApp for invoice ${invoiceId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendAppointmentDelayNotification(
    appointmentId: string,
    clinicId: string,
    delayMinutes: number,
  ) {
    if (await this.checkSendingAllowed(clinicId, 'delay notification')) return;

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId, clinicId },
      include: APPOINTMENT_NOTIFICATION_INCLUDE,
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    // Appointments are shifted in DB before this event; startTime is the new slot.
    const variables = buildAppointmentDelayVariables({
      patientName: getPatientFullName(appointment.patient),
      clinicName: appointment.clinic?.name ?? '',
      delayMinutes,
      updatedStartTime: appointment.startTime,
      clinicTimezone: appointment.clinic?.timezone,
    });

    try {
      const sendResult = await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName: 'appointment_delay',
        variables,
      });
      await logOutboundPatientTemplate(this.persistence, {
        clinicId,
        patientId: appointment.patient.id,
        phoneNumber: appointment.patient.phoneNumber,
        templateId: 'appointment_delay',
        appointmentId,
        sendResult,
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send delay WhatsApp for appointment ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendAppointmentUpdate(
    appointmentId: string,
    clinicId: string,
    type: 'CANCELLED' | 'RESCHEDULED',
  ) {
    if (await this.checkSendingAllowed(clinicId, 'appointment update')) return;

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId, clinicId },
      include: APPOINTMENT_NOTIFICATION_INCLUDE,
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const templateName =
      type === 'CANCELLED'
        ? 'appointment_cancelled'
        : 'appointment_rescheduled';

    const variables = {
      patientName: getPatientFullName(appointment.patient),
      clinicName: appointment.clinic?.name ?? '',
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
        timezone: appointment.clinic?.timezone,
      }),
      time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM, {
        timezone: appointment.clinic?.timezone,
      }),
    };

    try {
      const sendResult = await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName,
        variables,
      });
      await logOutboundPatientTemplate(this.persistence, {
        clinicId,
        patientId: appointment.patient.id,
        phoneNumber: appointment.patient.phoneNumber,
        templateId: templateName,
        appointmentId,
        sendResult,
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send appointment update WhatsApp for ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}

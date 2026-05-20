import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';
import { DATE_FORMATS, formatDate, formatTime } from '@workspace/utils';
import { ClinicSettingsSchema } from '@/domains/clinics/presentation/schemas/settings.schema';

@Injectable()
export class SystemEventsService {
  private readonly logger = new Logger(SystemEventsService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
    if (
      !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
    ) {
      this.logger.log(
        `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping prescription notification`,
      );
      return;
    }

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

    if (!prescription || !prescription.patient.phoneNumber) return;

    const variables = {
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      clinicName: prescription.appointment?.clinic?.name ?? '',
      doctorName: prescription.doctor.name,
      link: `https://docita.com/prescription/${prescription.id}`,
    };

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
    if (
      !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
    ) {
      this.logger.log(
        `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping invoice notification`,
      );
      return;
    }

    const invoice = await this.persistence.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        appointment: { include: { clinic: { select: { name: true } } } },
      },
    });

    if (!invoice || !invoice.patient.phoneNumber) return;

    const variables = {
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      clinicName: invoice.appointment?.clinic?.name ?? '',
      amount: `${invoice.total}`,
      link: `https://docita.com/invoice/${invoice.id}`,
    };

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
    if (
      !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
    ) {
      this.logger.log(
        `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping appointment confirmation`,
      );
      return;
    }

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { name: true } },
        clinic: { select: { name: true, settings: true } },
      },
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const settingsParsed = ClinicSettingsSchema.safeParse(
      appointment.clinic?.settings,
    );
    const mapsLocation = settingsParsed.success
      ? settingsParsed.data.mapsLocation
      : undefined;
    const customMapsLink = settingsParsed.success
      ? settingsParsed.data.mapsLink?.trim()
      : undefined;
    const mapsLink =
      customMapsLink ||
      (mapsLocation
        ? `https://www.google.com/maps?q=${mapsLocation.lat},${mapsLocation.lng}`
        : '');

    const variables = {
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicName: appointment.clinic?.name ?? '',
      doctorName: appointment.doctor.name,
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM),
      time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM),
      mapsLink,
    };

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName: 'appointment_confirmation',
        variables,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send appointment confirmation WhatsApp for ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendAppointmentDelayNotification(
    appointmentId: string,
    clinicId: string,
    delayMinutes: number,
  ) {
    if (
      !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
    ) {
      this.logger.log(
        `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping delay notification`,
      );
      return;
    }

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        clinic: { select: { name: true } },
      },
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const variables = {
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicName: appointment.clinic?.name ?? '',
      delayMinutes: `${delayMinutes}`,
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM),
      time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM),
    };

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName: 'appointment_delay',
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
    if (
      !(await isClinicWhatsAppAutomationSendingAllowed(this.persistence, clinicId))
    ) {
      this.logger.log(
        `WhatsApp patient messaging not allowed for clinic ${clinicId}; skipping appointment update`,
      );
      return;
    }

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        clinic: { select: { name: true } },
      },
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const templateName =
      type === 'CANCELLED'
        ? 'appointment_cancelled'
        : 'appointment_rescheduled';

    const variables = {
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicName: appointment.clinic?.name ?? '',
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM),
      time: formatTime(appointment.startTime, DATE_FORMATS.TIME_MEDIUM),
    };

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: appointment.patient.phoneNumber,
        templateName,
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

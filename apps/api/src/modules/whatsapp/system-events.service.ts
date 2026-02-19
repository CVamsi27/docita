import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';

/**
 * Handles automatic/system event-triggered WhatsApp messages
 * Sends messages in response to system events (prescription created, appointment confirmed, etc.)
 */
@Injectable()
export class SystemEventsService {
  private readonly logger = new Logger(SystemEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
    private readonly whatsappClient: WhatsappClientService,
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

  /**
   * Send prescription created notification (system event)
   */
  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
    if (!(await this.isWhatsappEnabled(clinicId))) {
      this.logger.log(
        `WhatsApp disabled for clinic ${clinicId}; skipping prescription notification`,
      );
      return;
    }

    const prescription = await this.prisma.prescription.findUnique({
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
      clinicName: prescription.appointment?.clinic?.name || 'Clinic',
      doctorName: prescription.doctor.name,
      link: `https://docita.work/p/${prescriptionId}`,
    };

    const resolved = await this.templatesService.resolveTemplate(
      'prescription_created',
      variables,
      clinicId,
    );

    if (resolved) {
      const message = this.templatesService.getMessageForMode(resolved);
      await this.whatsappClient.sendMessage({
        to: prescription.patient.phoneNumber,
        message,
      });
    }
  }

  /**
   * Send invoice created notification (system event)
   */
  async sendInvoiceSystem(invoiceId: string, clinicId: string) {
    if (!(await this.isWhatsappEnabled(clinicId))) {
      this.logger.log(
        `WhatsApp disabled for clinic ${clinicId}; skipping invoice notification`,
      );
      return;
    }

    const invoice = await this.prisma.invoice.findUnique({
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
      clinicName: invoice.appointment?.clinic?.name || 'Clinic',
      amount: `₹${invoice.total}`,
      link: `https://docita.work/i/${invoiceId}`,
    };

    const resolved = await this.templatesService.resolveTemplate(
      'invoice_created',
      variables,
      clinicId,
    );

    if (resolved) {
      const message = this.templatesService.getMessageForMode(resolved);
      await this.whatsappClient.sendMessage({
        to: invoice.patient.phoneNumber,
        message,
      });
    }
  }

  /**
   * Send appointment confirmation (system event)
   */
  async sendAppointmentConfirmation(appointmentId: string, clinicId: string) {
    if (!(await this.isWhatsappEnabled(clinicId))) {
      this.logger.log(
        `WhatsApp disabled for clinic ${clinicId}; skipping appointment confirmation`,
      );
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        doctor: { select: { name: true } },
        clinic: { select: { name: true } },
      },
    });

    if (!appointment || !appointment.patient.phoneNumber) return;

    const variables = {
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicName: appointment.clinic?.name || 'Clinic',
      doctorName: appointment.doctor.name,
      date: appointment.startTime.toLocaleDateString(),
      time: appointment.startTime.toLocaleTimeString(),
    };

    const resolved = await this.templatesService.resolveTemplate(
      'appointment_confirmation',
      variables,
      clinicId,
    );

    if (resolved) {
      const message = this.templatesService.getMessageForMode(resolved);
      await this.whatsappClient.sendMessage({
        to: appointment.patient.phoneNumber,
        message,
      });
    }
  }

  /**
   * Send appointment update (cancelled or rescheduled)
   */
  async sendAppointmentUpdate(
    appointmentId: string,
    clinicId: string,
    type: 'CANCELLED' | 'RESCHEDULED',
  ) {
    if (!(await this.isWhatsappEnabled(clinicId))) {
      this.logger.log(
        `WhatsApp disabled for clinic ${clinicId}; skipping appointment update`,
      );
      return;
    }

    const appointment = await this.prisma.appointment.findUnique({
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
      clinicName: appointment.clinic?.name || 'Clinic',
      date: appointment.startTime.toLocaleDateString(),
      time: appointment.startTime.toLocaleTimeString(),
    };

    const resolved = await this.templatesService.resolveTemplate(
      templateName,
      variables,
      clinicId,
    );

    if (resolved) {
      const message = this.templatesService.getMessageForMode(resolved);
      await this.whatsappClient.sendMessage({
        to: appointment.patient.phoneNumber,
        message,
      });
    }
  }
}

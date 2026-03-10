import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';

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
      clinicName: prescription.appointment?.clinic?.name ?? '',
      doctorName: prescription.doctor.name,
      link: `https://docita.com/prescription/${prescription.id}`,
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
      clinicName: invoice.appointment?.clinic?.name ?? '',
      amount: `${invoice.total}`,
      link: `https://docita.com/invoice/${invoice.id}`,
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
      clinicName: appointment.clinic?.name ?? '',
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
      clinicName: appointment.clinic?.name ?? '',
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

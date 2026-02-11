import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappTemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { SendTemplateDto } from './dto/send-template.dto';
import {
  WhatsappLogStatus,
  AppointmentStatus,
  InvoiceStatus,
  ApprovalStatus,
  PaymentSessionStatus,
} from '@workspace/db';

/**
 * WhatsApp Service
 * Orchestrates business logic for WhatsApp messaging
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: WhatsappTemplatesService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly whatsappWebhook: WhatsappWebhookService,
  ) {}

  /**
   * Handle sending a template message (Business Logic)
   */
  async handleSendTemplate(
    clinicId: string,
    userId: string,
    dto: SendTemplateDto,
  ) {
    // Get clinic info for the template
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Add clinic name to variables
    const variables = {
      ...dto.variables,
      clinicName: clinic.name,
    };

    // Resolve template with variables
    const resolved = await this.templatesService.resolveTemplate(
      dto.templateId,
      variables,
      clinicId,
    );

    if (!resolved) {
      throw new BadRequestException(`Template not found: ${dto.templateId}`);
    }

    // Get the message to send based on mode (sandbox vs production)
    const message = this.templatesService.getMessageForMode(resolved);

    // Send via WhatsApp Client
    const result = await this.whatsappClient.sendMessage({
      to: dto.phoneNumber,
      message,
    });

    // Log the message
    await this.prisma.whatsappLog.create({
      data: {
        clinicId: clinicId,
        patientId: dto.patientId,
        prescriptionId: dto.prescriptionId,
        invoiceId: dto.invoiceId,
        type: dto.templateId,
        phoneNumber: dto.phoneNumber,
        message,
        status: WhatsappLogStatus.SENT,
        providerMessageId: result.messageId,
        requestBody: dto as any,
      },
    });

    return {
      success: true,
      messageId: result.messageId,
      templateId: dto.templateId,
    };
  }

  /**
   * Resend prescription via WhatsApp (Business Logic)
   */
  async resendPrescription(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        doctor: { select: { name: true } },
        medications: true,
        appointment: { include: { clinic: { select: { name: true } } } },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (!prescription.patient.phoneNumber) {
      throw new BadRequestException('Patient does not have a phone number');
    }

    // Check approval status
    const isAuthorized = ['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
    if (
      !isAuthorized &&
      prescription.approvalStatus !== ApprovalStatus.APPROVED
    ) {
      throw new BadRequestException('Prescription not approved for sharing');
    }

    // Format medications list
    const medicationsList = prescription.medications
      .map((m) => `• ${m.name} - ${m.dosage} - ${m.frequency} (${m.duration})`)
      .join('\n');

    const variables = {
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      clinicName: prescription.appointment?.clinic?.name || 'Clinic',
      medications: medicationsList,
      instructions: prescription.instructions || 'Follow as prescribed',
      doctorName: prescription.doctor.name,
    };

    const resolved = await this.templatesService.resolveTemplate(
      'prescription_ready',
      variables,
      clinicId,
    );

    if (!resolved) {
      throw new BadRequestException('Prescription template not found');
    }

    const message = this.templatesService.getMessageForMode(resolved);

    const result = await this.whatsappClient.sendMessage({
      to: prescription.patient.phoneNumber,
      message,
    });

    // Update prescription status
    await this.prisma.prescription.update({
      where: { id },
      data: {
        whatsappSentAt: new Date(),
        whatsappMessageId: result.messageId,
        whatsappStatus: WhatsappLogStatus.SENT,
        approvalStatus: isAuthorized
          ? ApprovalStatus.AUTO_APPROVED
          : prescription.approvalStatus,
        approvedById: isAuthorized ? userId : prescription.approvedById,
        approvedAt: isAuthorized ? new Date() : prescription.approvedAt,
      },
    });

    // Log the message
    await this.prisma.whatsappLog.create({
      data: {
        clinicId,
        patientId: prescription.patient.id,
        prescriptionId: id,
        type: 'prescription',
        phoneNumber: prescription.patient.phoneNumber,
        message,
        status: WhatsappLogStatus.SENT,
        providerMessageId: result.messageId,
      },
    });

    return { success: true, messageId: result.messageId };
  }

  /**
   * Resend invoice via WhatsApp (Business Logic)
   */
  async resendInvoice(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        appointment: { include: { clinic: { select: { name: true } } } },
        paymentSessions: {
          where: { status: PaymentSessionStatus.CREATED },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.patient.phoneNumber) {
      throw new BadRequestException('Patient does not have a phone number');
    }

    // Check approval
    const isAuthorized = ['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
    if (!isAuthorized && invoice.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Invoice not approved for sharing');
    }

    const paymentLink =
      invoice.paymentSessions[0]?.shortUrl ||
      invoice.paymentSessions[0]?.paymentLink;

    const variables = {
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      clinicName: invoice.appointment?.clinic?.name || 'Clinic',
      amount: `₹${invoice.total.toLocaleString('en-IN')}`,
      invoiceNumber: id.slice(-8).toUpperCase(),
      date: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
      paymentLink: paymentLink || '',
    };

    const resolved = await this.templatesService.resolveTemplate(
      'invoice_ready',
      variables,
      clinicId,
    );

    if (!resolved) {
      throw new BadRequestException('Invoice template not found');
    }

    const message = this.templatesService.getMessageForMode(resolved);

    const result = await this.whatsappClient.sendMessage({
      to: invoice.patient.phoneNumber,
      message,
    });

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id },
      data: {
        whatsappSentAt: new Date(),
        whatsappMessageId: result.messageId,
        whatsappStatus: WhatsappLogStatus.SENT,
        approvalStatus: isAuthorized
          ? ApprovalStatus.AUTO_APPROVED
          : invoice.approvalStatus,
        approvedById: isAuthorized ? userId : invoice.approvedById,
        approvedAt: isAuthorized ? new Date() : invoice.approvedAt,
      },
    });

    // Log message
    await this.prisma.whatsappLog.create({
      data: {
        clinicId,
        patientId: invoice.patient.id,
        invoiceId: id,
        type: 'invoice',
        phoneNumber: invoice.patient.phoneNumber,
        message,
        status: WhatsappLogStatus.SENT,
        providerMessageId: result.messageId,
      },
    });

    return { success: true, messageId: result.messageId };
  }

  /**
   * Proxy methods for Templates Service
   */
  async listTemplates(clinicId: string) {
    return this.templatesService.listTemplates(clinicId);
  }

  getDefaultTemplateNames() {
    return this.templatesService.getDefaultTemplateNames();
  }

  async seedDefaultTemplates(clinicId: string) {
    return this.templatesService.seedDefaultTemplates(clinicId);
  }

  // ==========================================================================
  // Message Logs
  // ==========================================================================

  // ==========================================================================
  // System Event Methods (called by listeners)
  // ==========================================================================

  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
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
      link: `https://docita.com/p/${prescriptionId}`, // TODO: Real link
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
      link: `https://docita.com/i/${invoiceId}`, // TODO: Real link
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

  async sendAppointmentUpdate(
    appointmentId: string,
    clinicId: string,
    type: 'CANCELLED' | 'RESCHEDULED',
  ) {
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

  async getLogs(
    clinicId: string,
    options: { limit?: number; patientId?: string; type?: string },
  ) {
    return this.prisma.whatsappLog.findMany({
      where: {
        clinicId,
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.type && { type: options.type }),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
    });
  }

  // ==========================================================================
  // Approval Workflow
  // ==========================================================================

  async approvePrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, prescription };
  }

  async approveInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, invoice };
  }

  /**
   * Get WhatsApp statistics for the clinic
   */
  async getWhatsappStats(clinicId: string) {
    const totalPatients = await this.prisma.patient.count({
      where: { clinicId },
    });

    const subscribers = await this.prisma.patient.count({
      where: {
        clinicId,
        phoneNumber: { not: '' },
      },
    });

    return {
      totalPatients,
      subscribers,
      deliveryRate: 98.5, // Mock data for now
      responseRate: 12.4, // Mock data for now
    };
  }
}

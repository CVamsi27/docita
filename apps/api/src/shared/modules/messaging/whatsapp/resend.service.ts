import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import {
  WhatsappLogStatus,
  ApprovalStatus,
  PaymentSessionStatus,
} from '@workspace/db';
import { formatCurrency } from '@workspace/utils';

@Injectable()
export class WhatsappResendService {
  private readonly logger = new Logger(WhatsappResendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
    private readonly whatsappClient: WhatsappClientService,
  ) {}

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
        appointment: {
          include: { clinic: { select: { name: true, currency: true } } },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (!prescription.patient.phoneNumber) {
      throw new BadRequestException('Patient does not have a phone number');
    }

    const isAuthorized = ['DOCTOR', 'ADMIN', 'INTERNAL'].includes(role);
    if (
      !isAuthorized &&
      prescription.approvalStatus !== ApprovalStatus.APPROVED
    ) {
      throw new BadRequestException('Prescription not approved for sharing');
    }

    const medicationsList = prescription.medications
      .map((m) => `• ${m.name} - ${m.dosage} - ${m.frequency} (${m.duration})`)
      .join('\n');

    const variables = {
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      clinicName: prescription.appointment?.clinic?.name ?? '',
      medications: medicationsList,
      instructions: prescription.instructions ?? '',
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
        appointment: {
          include: { clinic: { select: { name: true, currency: true } } },
        },
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

    const isAuthorized = ['DOCTOR', 'ADMIN', 'INTERNAL'].includes(role);
    if (!isAuthorized && invoice.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Invoice not approved for sharing');
    }

    const paymentLink =
      invoice.paymentSessions[0]?.shortUrl ||
      invoice.paymentSessions[0]?.paymentLink;

    const variables = {
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      clinicName: invoice.appointment?.clinic?.name ?? '',
      amount: formatCurrency(invoice.total, {
        currency: invoice.currency ?? invoice.appointment?.clinic?.currency,
      }),
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
}

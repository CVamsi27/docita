import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import {
  WhatsappLogStatus,
  ApprovalStatus,
  PaymentSessionStatus,
} from '@workspace/db';
import { DATE_FORMATS, formatDate, getPatientFullName } from '@workspace/utils';
import {
  buildInvoiceReadyVariables,
  buildPrescriptionCreatedVariables,
} from '@/shared/whatsapp/patient-whatsapp-template-variables';
import { NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT } from './whatsapp-notification-query.helpers';

// AuditLogged: outbound WhatsApp resend delegates to SendMessageUseCase audit trail

function toTemplateVariables(
  record: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k, v == null ? '' : String(v)]),
  );
}

@Injectable()
export class WhatsappResendService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly templatesService: TemplatesService,
    private readonly sendMessage: SendMessageUseCase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async resendPrescription(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const prescription = await this.persistence.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          select: NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT,
        },
        doctor: { select: { name: true } },
        medications: true,
        appointment: {
          include: { clinic: { select: { name: true, currency: true } } },
        },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (!prescription.patient.phoneNumber)
      throw new BadRequestException('Patient does not have a phone number');

    const isAuthorized = ['DOCTOR', 'ADMIN', 'INTERNAL'].includes(role);
    if (
      !isAuthorized &&
      prescription.approvalStatus !== ApprovalStatus.APPROVED
    )
      throw new BadRequestException('Prescription not approved for sharing');

    const variables = toTemplateVariables(
      buildPrescriptionCreatedVariables({
        prescriptionId: id,
        patientName: getPatientFullName(prescription.patient),
        clinicName: prescription.appointment?.clinic?.name ?? '',
        doctorName: prescription.doctor.name,
      }),
    );

    const resolved = await this.templatesService.resolveTemplate(
      'prescription_created',
      variables,
      clinicId,
    );
    if (!resolved)
      throw new BadRequestException('Prescription template not found');
    const messagePreview = this.templatesService.getMessageForMode(resolved);

    const sendResult = await this.sendMessage.execute({
      clinicId,
      recipientPhone: prescription.patient.phoneNumber,
      templateName: 'prescription_created',
      variables,
    });
    const messageId = sendResult.providerMessageId || sendResult.messageId;

    await this.persistence.prescription.update({
      where: { id },
      data: {
        whatsappSentAt: this.clock.now(),
        whatsappMessageId: messageId,
        whatsappStatus: WhatsappLogStatus.SENT,
        approvalStatus: isAuthorized
          ? ApprovalStatus.AUTO_APPROVED
          : prescription.approvalStatus,
        approvedById: isAuthorized ? userId : prescription.approvedById,
        approvedAt: isAuthorized ? this.clock.now() : prescription.approvedAt,
        version: { increment: 1 },
      },
    });

    await this.persistence.whatsappLog.create({
      data: {
        clinicId,
        patientId: prescription.patient.id,
        prescriptionId: id,
        type: 'prescription',
        phoneNumber: prescription.patient.phoneNumber,
        message: messagePreview,
        status: WhatsappLogStatus.SENT,
        providerMessageId: messageId,
      },
    });

    return { success: true, messageId };
  }

  async resendInvoice(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    const invoice = await this.persistence.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT,
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
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.patient.phoneNumber)
      throw new BadRequestException('Patient does not have a phone number');

    const isAuthorized = ['DOCTOR', 'ADMIN', 'INTERNAL'].includes(role);
    if (!isAuthorized && invoice.approvalStatus !== ApprovalStatus.APPROVED)
      throw new BadRequestException('Invoice not approved for sharing');

    const paymentSession = invoice.paymentSessions[0];
    if (!paymentSession)
      throw new BadRequestException(
        'Create an online payment link for this invoice before sending on WhatsApp',
      );

    const variables = toTemplateVariables(
      buildInvoiceReadyVariables({
        invoiceId: id,
        patientName: getPatientFullName(invoice.patient),
        clinicName: invoice.appointment?.clinic?.name ?? '',
        amount: invoice.total,
        currency: invoice.currency ?? invoice.appointment?.clinic?.currency,
        invoiceNumber: id.slice(-8).toUpperCase(),
        date: formatDate(invoice.createdAt, DATE_FORMATS.DATE_SHORT),
        paymentSessionId: paymentSession.id,
      }),
    );

    const resolved = await this.templatesService.resolveTemplate(
      'invoice_ready',
      variables,
      clinicId,
    );
    if (!resolved) throw new BadRequestException('Invoice template not found');
    const messagePreview = this.templatesService.getMessageForMode(resolved);

    const sendResult = await this.sendMessage.execute({
      clinicId,
      recipientPhone: invoice.patient.phoneNumber,
      templateName: 'invoice_ready',
      variables,
    });
    const messageId = sendResult.providerMessageId || sendResult.messageId;

    await this.persistence.invoice.update({
      where: { id },
      data: {
        whatsappSentAt: this.clock.now(),
        whatsappMessageId: messageId,
        whatsappStatus: WhatsappLogStatus.SENT,
        approvalStatus: isAuthorized
          ? ApprovalStatus.AUTO_APPROVED
          : invoice.approvalStatus,
        approvedById: isAuthorized ? userId : invoice.approvedById,
        approvedAt: isAuthorized ? this.clock.now() : invoice.approvedAt,
      },
    });

    await this.persistence.whatsappLog.create({
      data: {
        clinicId,
        patientId: invoice.patient.id,
        invoiceId: id,
        type: 'invoice',
        phoneNumber: invoice.patient.phoneNumber,
        message: messagePreview,
        status: WhatsappLogStatus.SENT,
        providerMessageId: messageId,
      },
    });

    return { success: true, messageId };
  }
}

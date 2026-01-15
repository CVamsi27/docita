import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappTemplatesService } from './templates.service';
import { ResponseHandlerService } from './response-handler.service';
import { StaffNotificationService } from './staff-notification.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { MetaWebhookPayload } from './types/webhook.types';

/**
 * WhatsApp Cloud API Service
 * Sends messages via Meta's Graph API directly
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: WhatsappTemplatesService,
    @Inject(forwardRef(() => ResponseHandlerService))
    private readonly responseHandler: ResponseHandlerService,
    @Inject(forwardRef(() => StaffNotificationService))
    private readonly staffNotification: StaffNotificationService,
  ) {
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.appSecret = process.env.META_APP_SECRET || '';
    this.verifyToken = process.env.META_VERIFY_TOKEN || '';

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'META_PHONE_NUMBER_ID or META_ACCESS_TOKEN not configured. WhatsApp messaging will fail.',
      );
    }
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendMessage({ to, message }: { to: string; message: string }) {
    const cleanPhone = this.normalizePhoneNumber(to);

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: message },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send message';
        this.logger.error(`WhatsApp API error: ${errorMsg}`, data);
        throw new Error(errorMsg);
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${cleanPhone}: ${messageId}`);

      return { success: true, messageId: messageId as string };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}`, error);
      throw error;
    }
  }

  /**
   * Send a template message via WhatsApp Cloud API
   */
  async sendTemplate({
    to,
    templateName,
    languageCode = 'en',
    components,
  }: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters?: Array<{
        type:
          | 'text'
          | 'currency'
          | 'date_time'
          | 'image'
          | 'document'
          | 'video';
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
        date_time?: { fallback_value: string };
      }>;
      sub_type?: 'quick_reply' | 'url';
      index?: number;
    }>;
  }) {
    const cleanPhone = this.normalizePhoneNumber(to);

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      };

      if (components && components.length > 0) {
        (payload.template as Record<string, unknown>).components = components;
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Failed to send template';
        this.logger.error(`WhatsApp template API error: ${errorMsg}`, data);
        throw new Error(errorMsg);
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp template '${templateName}' sent to ${cleanPhone}: ${messageId}`,
      );

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template to ${to}`, error);
      throw error;
    }
  }

  /**
   * Send an interactive message with buttons
   */
  async sendInteractiveButtons({
    to,
    bodyText,
    buttons,
    headerText,
    footerText,
  }: {
    to: string;
    bodyText: string;
    buttons: Array<{ id: string; title: string }>;
    headerText?: string;
    footerText?: string;
  }) {
    const cleanPhone = this.normalizePhoneNumber(to);

    // WhatsApp allows max 3 buttons
    const limitedButtons = buttons.slice(0, 3);

    try {
      const interactive: Record<string, unknown> = {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: limitedButtons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20), // Max 20 chars
            },
          })),
        },
      };

      if (headerText) {
        interactive.header = { type: 'text', text: headerText };
      }
      if (footerText) {
        interactive.footer = { text: footerText };
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'interactive',
            interactive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.error?.message || 'Failed to send interactive message';
        this.logger.error(`WhatsApp interactive API error: ${errorMsg}`, data);
        throw new Error(errorMsg);
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp interactive message sent to ${cleanPhone}: ${messageId}`,
      );

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp interactive message to ${to}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validate incoming webhook signature from Meta
   */
  validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!signature || !this.appSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    return `sha256=${expectedSignature}` === signature;
  }

  /**
   * Get the webhook verification token
   */
  getVerifyToken(): string {
    return this.verifyToken;
  }

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

    // Send via WhatsApp
    const result = await this.sendMessage({
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
        status: 'sent',
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
    if (!isAuthorized && prescription.approvalStatus !== 'APPROVED') {
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

    const result = await this.sendMessage({
      to: prescription.patient.phoneNumber,
      message,
    });

    // Update prescription status
    await this.prisma.prescription.update({
      where: { id },
      data: {
        whatsappSentAt: new Date(),
        whatsappMessageId: result.messageId,
        whatsappStatus: 'sent',
        approvalStatus: isAuthorized
          ? 'AUTO_APPROVED'
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
        status: 'sent',
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
          where: { status: 'created' },
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
    if (!isAuthorized && invoice.approvalStatus !== 'APPROVED') {
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

    const result = await this.sendMessage({
      to: invoice.patient.phoneNumber,
      message,
    });

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id },
      data: {
        whatsappSentAt: new Date(),
        whatsappMessageId: result.messageId,
        whatsappStatus: 'sent',
        approvalStatus: isAuthorized ? 'AUTO_APPROVED' : invoice.approvalStatus,
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
        status: 'sent',
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

  /**
   * Process incoming messages from Meta webhook
   */
  async processIncomingMessages(
    value: MetaWebhookPayload['entry'][0]['changes'][0]['value'],
  ) {
    for (const message of value.messages || []) {
      const contact = value.contacts?.[0];
      const phoneNumber = message.from;
      const profileName = contact?.profile?.name;

      this.logger.log(
        `Incoming WhatsApp from ${phoneNumber} (${profileName}): type=${message.type}`,
      );

      let responseText = '';
      let buttonId = '';

      if (message.type === 'text' && message.text) {
        responseText = message.text.body;
      } else if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.button_reply) {
          buttonId = message.interactive.button_reply.id;
          responseText = message.interactive.button_reply.title;
        } else if (message.interactive.list_reply) {
          buttonId = message.interactive.list_reply.id;
          responseText = message.interactive.list_reply.title;
        }
      } else if (message.type === 'button' && message.button) {
        buttonId = message.button.payload;
        responseText = message.button.text;
      }

      const response = buttonId || responseText;

      if (response) {
        const recentAppointment =
          await this.findRecentAppointmentByPhone(phoneNumber);
        if (recentAppointment) {
          await this.responseHandler.handlePatientResponse(
            recentAppointment.id,
            response,
            phoneNumber,
            message.id,
          );
        } else {
          this.logger.warn(
            `No recent appointment found for phone: ${phoneNumber}`,
          );
        }
      }
    }
  }

  /**
   * Process status updates from Meta webhook
   */
  async processStatusUpdates(
    value: MetaWebhookPayload['entry'][0]['changes'][0]['value'],
  ) {
    for (const status of value.statuses || []) {
      this.logger.log(`Status update for ${status.id}: ${status.status}`);

      try {
        const log = await this.prisma.whatsappLog.findFirst({
          where: { providerMessageId: status.id },
        });

        if (log) {
          const updateData: Record<string, any> = {
            status: status.status,
            responseBody: status as any,
          };

          if (status.status === 'delivered' || status.status === 'read') {
            updateData.deliveredAt = new Date(
              parseInt(status.timestamp, 10) * 1000,
            );
          }

          if (status.status === 'failed' && status.errors?.length) {
            updateData.errorMessage = status.errors
              .map((e) => `${e.code}: ${e.title}`)
              .join('; ');
          }

          await this.prisma.whatsappLog.update({
            where: { id: log.id },
            data: updateData,
          });
        }
      } catch (error) {
        this.logger.error('Error processing status update:', error);
      }
    }
  }

  /**
   * Find the most recent appointment for a phone number
   */
  private async findRecentAppointmentByPhone(phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const phoneVariants = [
      phoneNumber,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.slice(-10),
    ];

    const patient = await this.prisma.patient.findFirst({
      where: {
        phoneNumber: { in: phoneVariants },
      },
      select: { id: true },
    });

    if (!patient) return null;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    return this.prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        startTime: { gte: twoHoursAgo },
        status: { in: ['scheduled', 'confirmed', 'in-progress'] },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
    });
  }

  /**
   * Normalize phone number to E.164 format without + prefix
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/^whatsapp:/, '');
    cleaned = cleaned.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/^\+/, '');
    return cleaned;
  }

  // ==========================================================================
  // Message Logs
  // ==========================================================================

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
    };
  }
}

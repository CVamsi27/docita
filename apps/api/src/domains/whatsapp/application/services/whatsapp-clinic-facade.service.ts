import { Injectable } from '@nestjs/common';
import { TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import { WhatsappResendService } from '@/domains/whatsapp/application/services/resend.service';
import { SystemEventsService } from '@/domains/whatsapp/application/services/system-events.service';
import { ApprovalService } from '@/domains/whatsapp/application/services/approval.service';
import { MessagingService } from '@/domains/whatsapp/application/services/messaging.service';
import { TemplateMessageService } from '@/domains/whatsapp/application/services/template-message.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { SendTemplateDto } from '@/domains/whatsapp/presentation/dto/send-template.dto';

/** Facade — legacy clinic WhatsApp routes; delegates to shared messaging services until full domain migration. */
@Injectable()
export class WhatsappService {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly resendService: WhatsappResendService,
    private readonly systemEventsService: SystemEventsService,
    private readonly approvalService: ApprovalService,
    private readonly messagingService: MessagingService,
    private readonly templateMessageService: TemplateMessageService,
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  async listTemplates(clinicId: string) {
    return this.templatesService.listTemplates(clinicId);
  }

  getDefaultTemplateNames() {
    return this.templatesService.getDefaultTemplateNames();
  }

  async seedDefaultTemplates(clinicId: string) {
    return this.templatesService.seedDefaultTemplates(clinicId);
  }

  async handleSendTemplate(
    clinicId: string,
    userId: string,
    dto: SendTemplateDto,
  ) {
    return this.templateMessageService.handleSendTemplate(
      clinicId,
      userId,
      dto,
    );
  }

  async resendPrescription(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    return this.resendService.resendPrescription(clinicId, userId, role, id);
  }

  async resendInvoice(
    clinicId: string,
    userId: string,
    role: string,
    id: string,
  ) {
    return this.resendService.resendInvoice(clinicId, userId, role, id);
  }

  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
    return this.systemEventsService.sendPrescriptionSystem(
      prescriptionId,
      clinicId,
    );
  }

  async sendInvoiceSystem(invoiceId: string, clinicId: string) {
    return this.systemEventsService.sendInvoiceSystem(invoiceId, clinicId);
  }

  async sendPaymentConfirmation(invoiceId: string, clinicId: string) {
    return this.systemEventsService.sendPaymentConfirmation(
      invoiceId,
      clinicId,
    );
  }

  async sendAppointmentConfirmation(appointmentId: string, clinicId: string) {
    return this.systemEventsService.sendAppointmentConfirmation(
      appointmentId,
      clinicId,
    );
  }

  async sendAppointmentUpdate(
    appointmentId: string,
    clinicId: string,
    type: 'CANCELLED' | 'RESCHEDULED',
  ) {
    return this.systemEventsService.sendAppointmentUpdate(
      appointmentId,
      clinicId,
      type,
    );
  }

  async sendAppointmentDelayNotification(
    appointmentId: string,
    clinicId: string,
    delayMinutes: number,
  ) {
    return this.systemEventsService.sendAppointmentDelayNotification(
      appointmentId,
      clinicId,
      delayMinutes,
    );
  }

  async getLogs(
    clinicId: string,
    options: { limit?: number; patientId?: string; type?: string },
  ) {
    return this.messagingService.getLogs(clinicId, options);
  }

  async getWhatsappStats(clinicId: string) {
    return this.messagingService.getWhatsappStats(clinicId);
  }

  async getUnreadNotificationCount(userId: string) {
    return this.staffNotificationService.getUnreadCount(userId);
  }

  async getUnreadNotifications(userId: string, limit?: number) {
    return this.staffNotificationService.getUnreadNotifications(userId, limit);
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.staffNotificationService.deleteNotification(
      notificationId,
      userId,
    );
  }

  async deleteAllNotifications(userId: string, clinicId: string) {
    return this.staffNotificationService.deleteAllNotifications(
      userId,
      clinicId,
    );
  }

  async approvePrescription(id: string, userId: string, clinicId: string) {
    return this.approvalService.approvePrescription(id, userId, clinicId);
  }

  async approveInvoice(id: string, userId: string, clinicId: string) {
    return this.approvalService.approveInvoice(id, userId, clinicId);
  }
}

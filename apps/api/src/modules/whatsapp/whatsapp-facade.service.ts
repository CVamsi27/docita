import { Injectable } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { ResendService } from './resend.service';
import { SystemEventsService } from './system-events.service';
import { ApprovalService } from './approval.service';
import { MessagingService } from './messaging.service';
import { TemplateMessageService } from './template-message.service';
import { StaffNotificationService } from './staff-notification.service';
import { SendTemplateDto } from './dto/send-template.dto';

/**
 * WhatsApp Service Facade
 * Orchestrates all WhatsApp messaging services (client, webhooks, templates, events, etc.)
 * Maintains identical public API to original WhatsappService for backward compatibility
 */
@Injectable()
export class WhatsappService {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly resendService: ResendService,
    private readonly systemEventsService: SystemEventsService,
    private readonly approvalService: ApprovalService,
    private readonly messagingService: MessagingService,
    private readonly templateMessageService: TemplateMessageService,
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  // ==========================================================================
  // Template Management (delegated to TemplatesService)
  // ==========================================================================

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
  // Template Message Sending
  // ==========================================================================

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

  // ==========================================================================
  // Manual Resend Operations
  // ==========================================================================

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

  // ==========================================================================
  // System Event Methods (called by listeners/triggers)
  // ==========================================================================

  async sendPrescriptionSystem(prescriptionId: string, clinicId: string) {
    return this.systemEventsService.sendPrescriptionSystem(
      prescriptionId,
      clinicId,
    );
  }

  async sendInvoiceSystem(invoiceId: string, clinicId: string) {
    return this.systemEventsService.sendInvoiceSystem(invoiceId, clinicId);
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

  // ==========================================================================
  // Message Logs and Analytics
  // ==========================================================================

  async getLogs(
    clinicId: string,
    options: { limit?: number; patientId?: string; type?: string },
  ) {
    return this.messagingService.getLogs(clinicId, options);
  }

  async getWhatsappStats(clinicId: string) {
    return this.messagingService.getWhatsappStats(clinicId);
  }

  // ==========================================================================
  // In-App Staff Notifications
  // ==========================================================================

  async getUnreadNotificationCount(userId: string) {
    return this.staffNotificationService.getUnreadCount(userId);
  }

  async getUnreadNotifications(userId: string, limit?: number) {
    return this.staffNotificationService.getUnreadNotifications(userId, limit);
  }

  async markNotificationsAsRead(notificationIds: string[], userId: string) {
    return this.staffNotificationService.markAsRead(notificationIds, userId);
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.staffNotificationService.markAllAsRead(userId);
  }

  // ==========================================================================
  // Approval Workflow
  // ==========================================================================

  async approvePrescription(id: string, userId: string, clinicId: string) {
    return this.approvalService.approvePrescription(id, userId, clinicId);
  }

  async approveInvoice(id: string, userId: string, clinicId: string) {
    return this.approvalService.approveInvoice(id, userId, clinicId);
  }
}

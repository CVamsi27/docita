import { Provider } from '@nestjs/common';
import { SystemEventsService } from '@/domains/whatsapp/application/services/system-events.service';
import { MessagingService } from '@/domains/whatsapp/application/services/messaging.service';
import { ApprovalService } from '@/domains/whatsapp/application/services/approval.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { TemplateMessageService } from '@/domains/whatsapp/application/services/template-message.service';

export const mockSystemEventsService = {
  sendPrescriptionSystem: jest.fn().mockResolvedValue(undefined),
  sendInvoiceSystem: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendAppointmentUpdate: jest.fn().mockResolvedValue(undefined),
  sendAppointmentDelayNotification: jest.fn().mockResolvedValue(undefined),
};

export const mockMessagingService = {
  getLogs: jest.fn().mockResolvedValue([]),
  getWhatsappStats: jest.fn().mockResolvedValue({}),
};

export const mockApprovalService = {
  approvePrescription: jest.fn().mockResolvedValue({ success: true }),
  approveInvoice: jest.fn().mockResolvedValue({ success: true }),
};

export const mockStaffNotificationService = {
  getUnreadCount: jest.fn().mockResolvedValue(0),
  getUnreadNotifications: jest.fn().mockResolvedValue([]),
  deleteNotification: jest.fn().mockResolvedValue(undefined),
  deleteAllNotifications: jest.fn().mockResolvedValue(undefined),
  notifyStaff: jest.fn().mockResolvedValue(undefined),
};

export const mockTemplateMessageService = {
  handleSendCustomMessage: jest.fn().mockResolvedValue({ success: true }),
};

/**
 * Backward-compatible mock that combines all facade methods.
 * Existing e2e tests import this as `mockWhatsappService` and override
 * a single provider token. The facade was deleted — this shim preserves
 * the import path until those tests are migrated to mock individual services.
 */
export const mockWhatsappService = {
  // SystemEventsService methods
  sendPrescriptionSystem: mockSystemEventsService.sendPrescriptionSystem,
  sendInvoiceSystem: mockSystemEventsService.sendInvoiceSystem,
  sendPaymentConfirmation: mockSystemEventsService.sendPaymentConfirmation,
  sendAppointmentConfirmation:
    mockSystemEventsService.sendAppointmentConfirmation,
  sendAppointmentUpdate: mockSystemEventsService.sendAppointmentUpdate,
  sendAppointmentDelayNotification:
    mockSystemEventsService.sendAppointmentDelayNotification,
  // MessagingService methods
  getLogs: mockMessagingService.getLogs,
  getWhatsappStats: mockMessagingService.getWhatsappStats,
  // ApprovalService methods
  approvePrescription: mockApprovalService.approvePrescription,
  approveInvoice: mockApprovalService.approveInvoice,
  // StaffNotificationService methods
  getUnreadNotificationCount: mockStaffNotificationService.getUnreadCount,
  getUnreadNotifications: mockStaffNotificationService.getUnreadNotifications,
  deleteNotification: mockStaffNotificationService.deleteNotification,
  deleteAllNotifications: mockStaffNotificationService.deleteAllNotifications,
  // TemplateMessageService methods
  handleSendCustomMessage: mockTemplateMessageService.handleSendCustomMessage,
  // Legacy methods (kept for backward compatibility)
  sendMessage: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
  sendTemplate: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
  sendInteractiveButtons: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid.HBgLMTIzNDU2Nzg5MFUGAhEJAgQ=',
  }),
};

/** @deprecated Use specific service providers instead */
export const SystemEventsServiceProvider: Provider = {
  provide: SystemEventsService,
  useValue: mockSystemEventsService,
};

/** @deprecated Use specific service providers instead */
export const MessagingServiceProvider: Provider = {
  provide: MessagingService,
  useValue: mockMessagingService,
};

/** @deprecated Use specific service providers instead */
export const ApprovalServiceProvider: Provider = {
  provide: ApprovalService,
  useValue: mockApprovalService,
};

/** @deprecated Use specific service providers instead */
export const StaffNotificationServiceProvider: Provider = {
  provide: StaffNotificationService,
  useValue: mockStaffNotificationService,
};

/** @deprecated Use specific service providers instead */
export const TemplateMessageServiceProvider: Provider = {
  provide: TemplateMessageService,
  useValue: mockTemplateMessageService,
};

/** @deprecated Use mockWhatsappService directly */
export const WhatsappServiceProvider: Provider = {
  provide: 'WHATSAPP_MOCK',
  useValue: mockWhatsappService,
};

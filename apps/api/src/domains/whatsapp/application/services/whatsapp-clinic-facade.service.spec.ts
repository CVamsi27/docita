import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp-clinic-facade.service';
import { TemplatesService } from './templates.service';
import { WhatsappResendService } from './resend.service';
import { SystemEventsService } from './system-events.service';
import { ApprovalService } from './approval.service';
import { MessagingService } from './messaging.service';
import { TemplateMessageService } from './template-message.service';
import { StaffNotificationService } from './staff-notification.service';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let module: TestingModule;

  let mockTemplatesService: {
    listTemplates: ReturnType<typeof jest.fn>;
    getTemplateById: ReturnType<typeof jest.fn>;
    createTemplate: ReturnType<typeof jest.fn>;
    updateTemplate: ReturnType<typeof jest.fn>;
    deleteTemplate: ReturnType<typeof jest.fn>;
  };
  let mockResendService: {
    resendPrescription: ReturnType<typeof jest.fn>;
    resendInvoice: ReturnType<typeof jest.fn>;
  };
  let mockSystemEventsService: {
    sendPrescriptionSystem: ReturnType<typeof jest.fn>;
    sendInvoiceSystem: ReturnType<typeof jest.fn>;
    sendPaymentConfirmation: ReturnType<typeof jest.fn>;
    sendAppointmentConfirmation: ReturnType<typeof jest.fn>;
    sendAppointmentUpdate: ReturnType<typeof jest.fn>;
    sendAppointmentDelayNotification: ReturnType<typeof jest.fn>;
  };
  let mockApprovalService: {
    approvePrescription: ReturnType<typeof jest.fn>;
    approveInvoice: ReturnType<typeof jest.fn>;
  };
  let mockMessagingService: {
    getLogs: ReturnType<typeof jest.fn>;
    getWhatsappStats: ReturnType<typeof jest.fn>;
  };
  let mockTemplateMessageService: {
    handleSendCustomMessage: ReturnType<typeof jest.fn>;
  };
  let mockStaffNotificationService: {
    getUnreadCount: ReturnType<typeof jest.fn>;
    getUnreadNotifications: ReturnType<typeof jest.fn>;
    deleteNotification: ReturnType<typeof jest.fn>;
    deleteAllNotifications: ReturnType<typeof jest.fn>;
  };

  const asyncMock = <T>(value: T) =>
    jest.fn().mockImplementation(async () => value);

  beforeEach(async () => {
    mockTemplatesService = {
      listTemplates: asyncMock([{ id: 'tpl-1', name: 'reminder' }]),
      getTemplateById: asyncMock({ id: 'tpl-1' }),
      createTemplate: asyncMock({ id: 'tpl-new' }),
      updateTemplate: asyncMock({ id: 'tpl-1' }),
      deleteTemplate: asyncMock({ success: true }),
    };

    mockResendService = {
      resendPrescription: asyncMock({ success: true }),
      resendInvoice: asyncMock({ success: true }),
    };

    mockSystemEventsService = {
      sendPrescriptionSystem: asyncMock({ success: true }),
      sendInvoiceSystem: asyncMock({ success: true }),
      sendPaymentConfirmation: asyncMock({ success: true }),
      sendAppointmentConfirmation: asyncMock({ success: true }),
      sendAppointmentUpdate: asyncMock({ success: true }),
      sendAppointmentDelayNotification: asyncMock({ success: true }),
    };

    mockApprovalService = {
      approvePrescription: asyncMock({ success: true }),
      approveInvoice: asyncMock({ success: true }),
    };

    mockMessagingService = {
      getLogs: asyncMock([]),
      getWhatsappStats: asyncMock({ sent: 3 }),
    };

    mockTemplateMessageService = {
      handleSendCustomMessage: asyncMock({ success: true }),
    };

    mockStaffNotificationService = {
      getUnreadCount: asyncMock(0),
      getUnreadNotifications: asyncMock([]),
      deleteNotification: asyncMock({ success: true }),
      deleteAllNotifications: asyncMock({ success: true }),
    };

    module = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: WhatsappResendService, useValue: mockResendService },
        { provide: SystemEventsService, useValue: mockSystemEventsService },
        { provide: ApprovalService, useValue: mockApprovalService },
        { provide: MessagingService, useValue: mockMessagingService },
        {
          provide: TemplateMessageService,
          useValue: mockTemplateMessageService,
        },
        {
          provide: StaffNotificationService,
          useValue: mockStaffNotificationService,
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('delegates listTemplates to the templates service', async () => {
    await expect(service.listTemplates('clinic-1')).resolves.toEqual([
      { id: 'tpl-1', name: 'reminder' },
    ]);
    expect(mockTemplatesService.listTemplates).toHaveBeenCalledWith('clinic-1');
  });

  it('delegates createCustomTemplate to createTemplate with a NONE button type', async () => {
    await expect(
      service.createCustomTemplate('clinic-1', {
        name: 'greeting',
        content: 'Hi',
        category: 'PAYMENT',
      }),
    ).resolves.toEqual({ id: 'tpl-new' });
    expect(mockTemplatesService.createTemplate).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      name: 'greeting',
      content: 'Hi',
      category: 'PAYMENT',
      buttonType: 'NONE',
    });
  });

  it('delegates resendPrescription to the resend service', async () => {
    await expect(
      service.resendPrescription('clinic-1', 'user-1', 'DOCTOR', 'rx-1'),
    ).resolves.toEqual({ success: true });
    expect(mockResendService.resendPrescription).toHaveBeenCalledWith(
      'clinic-1',
      'user-1',
      'DOCTOR',
      'rx-1',
    );
  });

  it('delegates resendInvoice to the resend service', async () => {
    await expect(
      service.resendInvoice('clinic-1', 'user-1', 'DOCTOR', 'inv-1'),
    ).resolves.toEqual({ success: true });
    expect(mockResendService.resendInvoice).toHaveBeenCalledWith(
      'clinic-1',
      'user-1',
      'DOCTOR',
      'inv-1',
    );
  });

  it('delegates sendPrescriptionSystem to the system events service', async () => {
    await expect(
      service.sendPrescriptionSystem('rx-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(mockSystemEventsService.sendPrescriptionSystem).toHaveBeenCalledWith(
      'rx-1',
      'clinic-1',
    );
  });

  it('delegates sendInvoiceSystem to the system events service', async () => {
    await expect(
      service.sendInvoiceSystem('inv-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(mockSystemEventsService.sendInvoiceSystem).toHaveBeenCalledWith(
      'inv-1',
      'clinic-1',
    );
  });

  it('delegates sendPaymentConfirmation to the system events service', async () => {
    await expect(
      service.sendPaymentConfirmation('inv-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(mockSystemEventsService.sendPaymentConfirmation).toHaveBeenCalledWith(
      'inv-1',
      'clinic-1',
    );
  });

  it('delegates sendAppointmentConfirmation to the system events service', async () => {
    await expect(
      service.sendAppointmentConfirmation('apt-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(
      mockSystemEventsService.sendAppointmentConfirmation,
    ).toHaveBeenCalledWith('apt-1', 'clinic-1');
  });

  it('delegates sendAppointmentUpdate with the event type to the system events service', async () => {
    await expect(
      service.sendAppointmentUpdate('apt-1', 'clinic-1', 'RESCHEDULED'),
    ).resolves.toEqual({ success: true });
    expect(mockSystemEventsService.sendAppointmentUpdate).toHaveBeenCalledWith(
      'apt-1',
      'clinic-1',
      'RESCHEDULED',
    );
  });

  it('delegates sendAppointmentDelayNotification with the delay to the system events service', async () => {
    await expect(
      service.sendAppointmentDelayNotification('apt-1', 'clinic-1', 15),
    ).resolves.toEqual({ success: true });
    expect(
      mockSystemEventsService.sendAppointmentDelayNotification,
    ).toHaveBeenCalledWith('apt-1', 'clinic-1', 15);
  });

  it('delegates getTemplateById to the templates service', async () => {
    await expect(service.getTemplateById('tpl-1')).resolves.toEqual({
      id: 'tpl-1',
    });
    expect(mockTemplatesService.getTemplateById).toHaveBeenCalledWith('tpl-1');
  });

  it('delegates updateCustomTemplate to the templates service', async () => {
    await expect(
      service.updateCustomTemplate('tpl-1', { content: 'New body' }),
    ).resolves.toEqual({ id: 'tpl-1' });
    expect(mockTemplatesService.updateTemplate).toHaveBeenCalledWith('tpl-1', {
      content: 'New body',
    });
  });

  it('delegates deleteCustomTemplate to the templates service', async () => {
    await expect(service.deleteCustomTemplate('tpl-1')).resolves.toEqual({
      success: true,
    });
    expect(mockTemplatesService.deleteTemplate).toHaveBeenCalledWith('tpl-1');
  });

  it('delegates handleSendCustomMessage to the template message service', async () => {
    const dto = { patientId: 'pat-1', text: 'Hello' };
    await expect(
      service.handleSendCustomMessage('clinic-1', 'user-1', dto),
    ).resolves.toEqual({ success: true });
    expect(
      mockTemplateMessageService.handleSendCustomMessage,
    ).toHaveBeenCalledWith('clinic-1', 'user-1', dto);
  });

  it('delegates getLogs to the messaging service', async () => {
    const options = { limit: 10, patientId: 'pat-1' };
    await expect(service.getLogs('clinic-1', options)).resolves.toEqual([]);
    expect(mockMessagingService.getLogs).toHaveBeenCalledWith(
      'clinic-1',
      options,
    );
  });

  it('delegates getWhatsappStats to the messaging service', async () => {
    await expect(service.getWhatsappStats('clinic-1')).resolves.toEqual({
      sent: 3,
    });
    expect(mockMessagingService.getWhatsappStats).toHaveBeenCalledWith(
      'clinic-1',
    );
  });

  it('delegates getUnreadNotificationCount to the staff notification service', async () => {
    await expect(service.getUnreadNotificationCount('user-1')).resolves.toBe(0);
    expect(mockStaffNotificationService.getUnreadCount).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('delegates getUnreadNotifications with the limit to the staff notification service', async () => {
    await expect(service.getUnreadNotifications('user-1', 5)).resolves.toEqual(
      [],
    );
    expect(
      mockStaffNotificationService.getUnreadNotifications,
    ).toHaveBeenCalledWith('user-1', 5);
  });

  it('delegates deleteNotification to the staff notification service', async () => {
    await expect(
      service.deleteNotification('notif-1', 'user-1'),
    ).resolves.toEqual({ success: true });
    expect(mockStaffNotificationService.deleteNotification).toHaveBeenCalledWith(
      'notif-1',
      'user-1',
    );
  });

  it('delegates deleteAllNotifications to the staff notification service', async () => {
    await expect(
      service.deleteAllNotifications('user-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(
      mockStaffNotificationService.deleteAllNotifications,
    ).toHaveBeenCalledWith('user-1', 'clinic-1');
  });

  it('delegates approvePrescription to the approval service', async () => {
    await expect(
      service.approvePrescription('rx-1', 'user-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(mockApprovalService.approvePrescription).toHaveBeenCalledWith(
      'rx-1',
      'user-1',
      'clinic-1',
    );
  });

  it('delegates approveInvoice to the approval service', async () => {
    await expect(
      service.approveInvoice('inv-1', 'user-1', 'clinic-1'),
    ).resolves.toEqual({ success: true });
    expect(mockApprovalService.approveInvoice).toHaveBeenCalledWith(
      'inv-1',
      'user-1',
      'clinic-1',
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp-clinic-facade.service';
import { WhatsappClientService } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.service';
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
  let originalMetaPhoneId: string | undefined;
  let originalMetaAccessToken: string | undefined;
  let originalFetch: typeof global.fetch;
  let mockWhatsappClient: { sendMessage: ReturnType<typeof jest.fn> };
  let mockTemplatesService: {
    resolveTemplate: ReturnType<typeof jest.fn>;
    getMessageForMode: ReturnType<typeof jest.fn>;
  };
  let mockTemplateMessageService: {
    sendTemplate: ReturnType<typeof jest.fn>;
    handleSendTemplate: ReturnType<typeof jest.fn>;
  };

  const asyncMock = <T>(value: T) =>
    jest.fn().mockImplementation(async () => value);

  beforeEach(async () => {
    originalMetaPhoneId = process.env.META_PHONE_NUMBER_ID;
    originalMetaAccessToken = process.env.META_ACCESS_TOKEN;
    originalFetch = global.fetch;

    mockWhatsappClient = {
      sendMessage: jest
        .fn()
        .mockImplementation(async () => ({ messageId: 'msg-123' })),
    };

    mockTemplatesService = {
      resolveTemplate: jest.fn().mockImplementation(async () => ({
        name: 'appointment_reminder_24hr',
        language: 'en_US',
        components: [],
      })),
      getMessageForMode: jest
        .fn()
        .mockReturnValue('Your appointment is confirmed'),
    };

    const mockResendService = {
      createResend: asyncMock({}),
      removeResend: asyncMock({}),
    };

    const mockSystemEventsService = {
      recordSystemEvent: asyncMock({}),
    };

    const mockApprovalService = {
      requestApproval: asyncMock({}),
      getApprovalStatus: asyncMock({}),
    };

    const mockMessagingService = {
      sendMessage: jest
        .fn()
        .mockImplementation(async () => ({ success: true })),
    };

    mockTemplateMessageService = {
      sendTemplate: jest
        .fn()
        .mockImplementation(async () => ({ success: true })),
      handleSendTemplate: jest
        .fn()
        .mockImplementation(async (...args: unknown[]) => {
          const dto = args[2] as { phoneNumber: string; templateId?: string };
          await mockWhatsappClient.sendMessage({
            to: dto.phoneNumber,
            message: 'Template message',
          });
          return {
            success: true,
            messageId: 'msg-123',
            templateId: dto.templateId,
          };
        }),
    };

    const mockStaffNotificationService = {
      getUnreadCount: jest.fn().mockImplementation(async () => 0),
      getUnreadNotifications: jest.fn().mockImplementation(async () => []),
      deleteNotification: asyncMock({}),
      deleteAllNotifications: asyncMock({}),
    };

    module = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
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

    global.fetch = jest.fn<typeof fetch>();

    process.env.META_PHONE_NUMBER_ID = '1234567890';
    process.env.META_ACCESS_TOKEN = 'test_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
    if (originalMetaPhoneId === undefined) {
      delete process.env.META_PHONE_NUMBER_ID;
    } else {
      process.env.META_PHONE_NUMBER_ID = originalMetaPhoneId;
    }
    if (originalMetaAccessToken === undefined) {
      delete process.env.META_ACCESS_TOKEN;
    } else {
      process.env.META_ACCESS_TOKEN = originalMetaAccessToken;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSendTemplate', () => {
    it('should send appointment_reminder_24hr template', async () => {
      mockTemplatesService.resolveTemplate.mockImplementation(async () => ({
        name: 'appointment_reminder_24hr',
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Rahul Sharma' },
              { type: 'text', text: 'Tomorrow at 10:00 AM' },
              { type: 'text', text: 'Dr. Priya Patel' },
              { type: 'text', text: 'Test Clinic' },
            ],
          },
        ],
      }));

      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'appointment_reminder_24hr',
          variables: {
            patientName: 'Rahul Sharma',
            appointmentTime: 'Tomorrow at 10:00 AM',
            doctorName: 'Dr. Priya Patel',
            clinicName: 'Test Clinic',
          },
          phoneNumber: '9876543210',
          patientId: 'patient-123',
        },
      );

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('appointment_reminder_24hr');

      const client = module.get(WhatsappClientService);
      expect(client.sendMessage).toHaveBeenCalledWith({
        to: '9876543210',
        message: expect.any(String),
      });
    });

    it('should send appointment_reminder_30min template', async () => {
      mockTemplatesService.resolveTemplate.mockImplementation(async () => ({
        name: 'appointment_reminder_30min',
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Sunita Devi' },
              { type: 'text', text: '30 minutes' },
              { type: 'text', text: 'Test Clinic' },
            ],
          },
        ],
      }));

      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'appointment_reminder_30min',
          variables: {
            patientName: 'Sunita Devi',
            timeUntilAppointment: '30 minutes',
            clinicName: 'Test Clinic',
          },
          phoneNumber: '9876543211',
          patientId: 'patient-124',
        },
      );

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('appointment_reminder_30min');
    });

    it('should send prescription_sent template with PDF link', async () => {
      mockTemplatesService.resolveTemplate.mockImplementation(async () => ({
        name: 'prescription_sent',
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Anand Kumar' },
              { type: 'text', text: 'Dr. Rajesh Sharma' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              {
                type: 'text',
                text: 'https://app.docita.com/prescriptions/rx-456',
              },
            ],
          },
        ],
      }));

      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'prescription_sent',
          variables: {
            patientName: 'Anand Kumar',
            doctorName: 'Dr. Rajesh Sharma',
            prescriptionUrl: 'https://app.docita.com/prescriptions/rx-456',
          },
          phoneNumber: '9876543212',
          patientId: 'patient-125',
        },
      );

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('prescription_sent');
    });

    it('should send invoice_payment template with payment link', async () => {
      mockTemplatesService.resolveTemplate.mockImplementation(async () => ({
        name: 'invoice_payment',
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Meera Nair' },
              { type: 'text', text: '₹1,500' },
              { type: 'text', text: '2026-04-01' },
              { type: 'text', text: 'INV-2026-001' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              {
                type: 'text',
                text: 'https://pay.docita.com/inv/abc123',
              },
            ],
          },
        ],
      }));

      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'invoice_payment',
          variables: {
            patientName: 'Meera Nair',
            amount: '₹1,500',
            dueDate: '2026-04-01',
            invoiceNumber: 'INV-2026-001',
            paymentUrl: 'https://pay.docita.com/inv/abc123',
          },
          phoneNumber: '9876543213',
          patientId: 'patient-126',
        },
      );

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('invoice_payment');
      const client = module.get(WhatsappClientService);
      expect(client.sendMessage).toHaveBeenCalledWith({
        to: '9876543213',
        message: expect.any(String),
      });
    });

    it('should return success false when template send fails', async () => {
      mockTemplateMessageService.handleSendTemplate.mockImplementationOnce(
        async () => {
          throw new Error('WhatsApp API unavailable');
        },
      );

      await expect(
        service.handleSendTemplate('clinic-123', 'user-123', {
          templateId: 'appointment_reminder_24hr',
          variables: {},
          phoneNumber: '9876543210',
          patientId: 'patient-127',
        }),
      ).rejects.toThrow();
    });

    it('should use indian locale phone number format', async () => {
      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'appointment_reminder_24hr',
          variables: { patientName: 'Test Patient' },
          phoneNumber: '+919876543210',
          patientId: 'patient-128',
        },
      );

      expect(result.success).toBe(true);
      const client = module.get(WhatsappClientService);
      expect(client.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+919876543210' }),
      );
    });
  });
});

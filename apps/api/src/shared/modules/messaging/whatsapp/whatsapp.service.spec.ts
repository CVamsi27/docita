import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { ResendService } from './resend.service';
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

  const asyncMock = <T>(value: T) =>
    jest.fn().mockImplementation(async () => value);

  const mockPrismaService = {
    whatsappLog: {
      create: asyncMock({}),
    },
    clinic: {
      findUnique: jest.fn().mockImplementation(async () => ({
        id: 'clinic-123',
        name: 'Test Clinic',
      })),
    },
  };

  const mockTemplatesService = {
    resolveTemplate: jest.fn().mockImplementation(async () => ({
      name: 'hello_world',
      language: 'en_US',
      components: [],
    })),
    getMessageForMode: jest
      .fn()
      .mockReturnValue('Hello World Template Message'),
  };

  beforeEach(async () => {
    const mockWhatsappClient = {
      sendMessage: jest
        .fn()
        .mockImplementation(async () => ({ messageId: 'msg-123' })),
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

    const mockTemplateMessageService = {
      sendTemplate: jest
        .fn()
        .mockImplementation(async () => ({ success: true })),
      handleSendTemplate: jest
        .fn<
          (
            clinicId: string,
            userId: string,
            dto: { phoneNumber: string; templateId: string },
          ) => Promise<{
            success: boolean;
            messageId: string;
            templateId: string;
          }>
        >()
        .mockImplementation(async (_clinicId, _userId, dto) => {
          await mockWhatsappClient.sendMessage({
            to: dto.phoneNumber,
            message: 'Hello World Template Message',
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
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        { provide: TemplatesService, useValue: mockTemplatesService },
        { provide: ResendService, useValue: mockResendService },
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

    global.fetch = jest.fn() as unknown as typeof fetch;

    process.env.META_PHONE_NUMBER_ID = '1234567890';
    process.env.META_ACCESS_TOKEN = 'test_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSendTemplate', () => {
    it('should send a template message', async () => {
      mockTemplatesService.resolveTemplate.mockImplementation(async () => ({
        name: 'hello_world',
        language: 'en_US',
        components: [],
      }));
      mockTemplatesService.getMessageForMode.mockReturnValue(
        'Hello World Template Message',
      );

      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'hello_world',
          variables: {},
          phoneNumber: '9876543410',
          patientId: 'patient-123',
        },
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-123',
        templateId: 'hello_world',
      });

      const client = module.get(WhatsappClientService);
      expect(client.sendMessage).toHaveBeenCalledWith({
        to: '9876543410',
        message: 'Hello World Template Message',
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { ResendService } from './resend.service';
import { SystemEventsService } from './system-events.service';
import { ApprovalService } from './approval.service';
import { MessagingService } from './messaging.service';
import { TemplateMessageService } from './template-message.service';

describe.skip('WhatsappService', () => {
  let service: WhatsappService;
  let module: TestingModule;

  const mockPrismaService = {
    whatsappLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    clinic: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'clinic-123', name: 'Test Clinic' }),
    },
  };

  const mockTemplatesService = {
    resolveTemplate: jest.fn().mockResolvedValue({
      name: 'hello_world',
      language: 'en_US',
      components: [],
    }),
    getMessageForMode: jest
      .fn()
      .mockReturnValue('Hello World Template Message'),
  };

  beforeEach(async () => {
    const mockWhatsappClient = {
      sendMessage: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    const mockResendService = {
      createResend: jest.fn().mockResolvedValue({}),
      removeResend: jest.fn().mockResolvedValue({}),
    };

    const mockSystemEventsService = {
      recordSystemEvent: jest.fn().mockResolvedValue({}),
    };

    const mockApprovalService = {
      requestApproval: jest.fn().mockResolvedValue({}),
      getApprovalStatus: jest.fn().mockResolvedValue({}),
    };

    const mockMessagingService = {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockTemplateMessageService = {
      sendTemplate: jest.fn().mockResolvedValue({ success: true }),
      handleSendTemplate: jest
        .fn()
        .mockImplementation(async (clinicId, userId, dto) => {
          // Call WhatsappClientService to simulate real behavior
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
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);

    // Mock global fetch
    global.fetch = jest.fn();

    // Mock env vars
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
      // Mock template resolution
      mockTemplatesService.resolveTemplate.mockResolvedValue({
        name: 'hello_world',
        language: 'en_US',
        components: [],
      });
      mockTemplatesService.getMessageForMode.mockReturnValue(
        'Hello World Template Message',
      );

      // Call handleSendTemplate directly as it's the new method
      const result = await service.handleSendTemplate(
        'clinic-123',
        'user-123',
        {
          templateId: 'hello_world',
          variables: {},
          phoneNumber: '9876543210',
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
        to: '9876543210',
        message: 'Hello World Template Message',
      });
    });
  });
});

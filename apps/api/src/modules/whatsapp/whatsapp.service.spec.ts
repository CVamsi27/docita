import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappTemplatesService } from './templates.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { ResponseHandlerService } from './response-handler.service';
import { StaffNotificationService } from './staff-notification.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let module: TestingModule;

  const mockPrismaService = {
    whatsappLog: {
      create: jest.fn(),
    },
    clinic: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'clinic-123', name: 'Test Clinic' }),
    },
  };

  const mockTemplatesService = {
    resolveTemplate: jest.fn(),
    getMessageForMode: jest.fn(),
  };

  const mockResponseHandler = {};
  const mockStaffNotification = {};

  beforeEach(async () => {
    const mockWhatsappClient = {
      sendMessage: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    const mockWhatsappWebhook = {};

    module = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappTemplatesService, useValue: mockTemplatesService },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        { provide: WhatsappWebhookService, useValue: mockWhatsappWebhook },
        { provide: ResponseHandlerService, useValue: mockResponseHandler },
        { provide: StaffNotificationService, useValue: mockStaffNotification },
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

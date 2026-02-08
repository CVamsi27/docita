import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappTemplatesService } from './templates.service';
import { ResponseHandlerService } from './response-handler.service';
import { StaffNotificationService } from './staff-notification.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const mockPrismaService = {
    whatsappLog: {
      create: jest.fn(),
    },
    clinic: {
      findUnique: jest.fn(),
    },
  };

  const mockTemplatesService = {
    resolveTemplate: jest.fn(),
    getMessageForMode: jest.fn(),
  };

  const mockResponseHandler = {};
  const mockStaffNotification = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappTemplatesService, useValue: mockTemplatesService },
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

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid.123' }] }),
      });

      const result = await service.sendMessage({
        to: '+919876543210',
        message: 'Hello World',
      });

      expect(result).toEqual({ success: true, messageId: 'wamid.123' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"to":"919876543210"'),
        }),
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: { message: 'Invalid phone number' } }),
      });

      await expect(
        service.sendMessage({ to: '123', message: 'Hi' }),
      ).rejects.toThrow('Invalid phone number');
    });
  });

  describe('sendTemplate', () => {
    it('should send a template message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid.template' }] }),
      });

      const result = await service.sendTemplate({
        to: '9876543210',
        templateName: 'hello_world',
      });

      expect(result).toEqual({ success: true, messageId: 'wamid.template' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"template"'),
        }),
      );
    });
  });
});

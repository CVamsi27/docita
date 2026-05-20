import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { WhatsappClientService } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.service';
import { ResponseHandlerService } from '@/domains/whatsapp/application/services/response-handler.service';
import { WhatsAppWebhookIngressService } from '@/domains/whatsapp/application/services/whatsapp-webhook-ingress.service';
import { WHATSAPP_REPOSITORY_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { SupportWhatsAppInboxService } from '@/shared/modules/support-whatsapp';
import { Logger } from '@nestjs/common';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import {
  createWebhookPayload,
  createStatusPayload,
  createValidSignature,
} from '@/../test/mocks/whatsapp.mock';

describe('WhatsappWebhookService', () => {
  let service: WhatsappWebhookService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;
  let mockWhatsappClient: { AppSecret: string; VerifyToken: string };
  let mockSupportInboxService: {
    recordIncomingMessages: ReturnType<typeof jest.fn>;
    updateMessageStatus: ReturnType<typeof jest.fn>;
  };
  let mockResponseHandler: {
    handlePatientResponse: ReturnType<typeof jest.fn>;
  };

  function buildMockPrisma() {
    return {
      whatsappLog: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => ({ id: 'log-123' })),
      },
      patient: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => null),
      },
      appointment: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockImplementation(async () => null),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();
    mockWhatsappClient = {
      AppSecret: 'test-app-secret',
      VerifyToken: 'test-verify-token',
    };
    mockSupportInboxService = {
      recordIncomingMessages: jest
        .fn()
        .mockImplementation(async () => undefined),
      updateMessageStatus: jest.fn().mockImplementation(async () => undefined),
    };
    mockResponseHandler = {
      handlePatientResponse: jest
        .fn()
        .mockImplementation(async () => undefined),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappWebhookService,
        WhatsAppWebhookIngressService,
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPrisma },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        {
          provide: SupportWhatsAppInboxService,
          useValue: mockSupportInboxService,
        },
        { provide: ResponseHandlerService, useValue: mockResponseHandler },
        {
          provide: WHATSAPP_REPOSITORY_TOKEN,
          useValue: {
            findMessageByExternalId: jest
              .fn<() => Promise<null>>()
              .mockResolvedValue(null),
            saveMessage: jest.fn<() => Promise<void>>().mockResolvedValue(),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappWebhookService>(WhatsappWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateWebhookSignature', () => {
    it('should return true for a valid HMAC-SHA256 signature', () => {
      const body = Buffer.from('{"test":"payload"}');
      const signature = createValidSignature(
        body.toString(),
        'test-app-secret',
      );

      expect(service.validateWebhookSignature(body, signature)).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const body = Buffer.from('{"test":"payload"}');
      expect(
        service.validateWebhookSignature(body, 'sha256=invalidsignature'),
      ).toBe(false);
    });

    it('should return false when signature is empty', () => {
      const body = Buffer.from('{"test":"payload"}');
      expect(service.validateWebhookSignature(body, '')).toBe(false);
    });

    it('should return false when appSecret is empty', () => {
      mockWhatsappClient.AppSecret = '';
      const body = Buffer.from('{"test":"payload"}');
      expect(service.validateWebhookSignature(body, 'sha256=anything')).toBe(
        false,
      );
    });
  });

  describe('getVerifyToken', () => {
    it('should return the verify token from WhatsappClientService', () => {
      expect(service.getVerifyToken()).toBe('test-verify-token');
    });
  });

  describe('processIncomingMessages', () => {
    it('should process a text message and call responseHandler when appointment found', async () => {
      const patient = { id: 'patient-123' };
      const appointment = {
        id: 'appt-123',
        patient: {
          firstName: 'Rahul',
          lastName: 'Sharma',
          phoneNumber: '919876543210',
        },
        doctor: { name: 'Dr. Patel' },
        clinic: { id: 'clinic-123', name: 'Test Clinic' },
      };
      mockPrisma.patient.findFirst.mockResolvedValue(patient);
      mockPrisma.appointment.findFirst.mockResolvedValue(appointment);

      const payload = createWebhookPayload('text', {
        from: '919876543210',
        messageId: 'wamid.msg123',
        body: 'yes',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockSupportInboxService.recordIncomingMessages).toHaveBeenCalled();
      expect(mockResponseHandler.handlePatientResponse).toHaveBeenCalledWith(
        'appt-123',
        'yes',
        '919876543210',
        'wamid.msg123',
      );
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should process interactive button_reply message', async () => {
      const patient = { id: 'patient-123' };
      const appointment = { id: 'appt-456' };
      mockPrisma.patient.findFirst.mockResolvedValue(patient);
      mockPrisma.appointment.findFirst.mockResolvedValue(appointment);

      const payload = createWebhookPayload('interactive_button_reply', {
        from: '919876543210',
        messageId: 'wamid.btn123',
        buttonId: 'btn_confirm',
        buttonTitle: 'Confirm',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockSupportInboxService.recordIncomingMessages).toHaveBeenCalled();
      expect(mockResponseHandler.handlePatientResponse).toHaveBeenCalledWith(
        'appt-456',
        'btn_confirm',
        '919876543210',
        'wamid.btn123',
      );
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should process interactive list_reply message', async () => {
      const patient = { id: 'patient-123' };
      const appointment = { id: 'appt-789' };
      mockPrisma.patient.findFirst.mockResolvedValue(patient);
      mockPrisma.appointment.findFirst.mockResolvedValue(appointment);

      const payload = createWebhookPayload('interactive_list_reply', {
        from: '919876543210',
        buttonId: 'option_2',
        buttonTitle: 'Option 2',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockResponseHandler.handlePatientResponse).toHaveBeenCalledWith(
        'appt-789',
        'option_2',
        expect.any(String),
        expect.any(String),
      );
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should process button message type', async () => {
      const patient = { id: 'patient-123' };
      const appointment = { id: 'appt-btn1' };
      mockPrisma.patient.findFirst.mockResolvedValue(patient);
      mockPrisma.appointment.findFirst.mockResolvedValue(appointment);

      const payload = createWebhookPayload('button', {
        from: '919876543210',
        buttonId: 'btn_cancel',
        buttonTitle: 'Cancel',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockResponseHandler.handlePatientResponse).toHaveBeenCalledWith(
        'appt-btn1',
        'btn_cancel',
        expect.any(String),
        expect.any(String),
      );
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should not call responseHandler for media messages (no text/button response)', async () => {
      const payload = createWebhookPayload('image', { from: '919876543210' });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockResponseHandler.handlePatientResponse).not.toHaveBeenCalled();
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should log warning and not call responseHandler when no appointment found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-123' });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const payload = createWebhookPayload('text', {
        from: '919876543210',
        body: 'yes',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockResponseHandler.handlePatientResponse).not.toHaveBeenCalled();
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should not call responseHandler when patient is not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      const payload = createWebhookPayload('text', {
        from: '919876543210',
        body: 'yes',
      });

      await service.processIncomingMessages(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processIncomingMessages
        >[0],
      );

      expect(mockResponseHandler.handlePatientResponse).not.toHaveBeenCalled();
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should catch and not rethrow errors from responseHandler', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-123' });
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'appt-123' });
      mockResponseHandler.handlePatientResponse.mockRejectedValue(
        new Error('Handler failed'),
      );

      const payload = createWebhookPayload('text', {
        from: '919876543210',
        body: 'yes',
      });

      await expect(
        service.processIncomingMessages(
          payload.entry[0].changes[0].value as Parameters<
            typeof service.processIncomingMessages
          >[0],
        ),
      ).resolves.not.toThrow();
    });

    it('should handle empty messages array gracefully', async () => {
      await service.processIncomingMessages({
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '15551234567',
          phone_number_id: 'test',
        },
        messages: [],
      } as Parameters<typeof service.processIncomingMessages>[0]);

      expect(mockResponseHandler.handlePatientResponse).not.toHaveBeenCalled();
    });
  });

  describe('processStatusUpdates', () => {
    it('should update WhatsappLog status to DELIVERED with deliveredAt timestamp', async () => {
      const existingLog = { id: 'log-123' };
      mockPrisma.whatsappLog.findFirst.mockResolvedValue(existingLog);

      const payload = createStatusPayload('delivered', {
        messageId: 'wamid.delivered123',
      });

      await service.processStatusUpdates(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processStatusUpdates
        >[0],
      );

      expect(mockPrisma.whatsappLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
      expect(mockSupportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'wamid.delivered123',
        'delivered',
        undefined,
      );
    });

    it('should update WhatsappLog status to READ with deliveredAt timestamp', async () => {
      const existingLog = { id: 'log-456' };
      mockPrisma.whatsappLog.findFirst.mockResolvedValue(existingLog);

      const payload = createStatusPayload('read', {
        messageId: 'wamid.read123',
      });

      await service.processStatusUpdates(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processStatusUpdates
        >[0],
      );

      expect(mockPrisma.whatsappLog.update).toHaveBeenCalledWith({
        where: { id: 'log-456' },
        data: expect.objectContaining({
          status: 'READ',
          deliveredAt: expect.any(Date),
        }),
      });
      expect(mockSupportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'wamid.read123',
        'read',
        undefined,
      );
    });

    it('should update WhatsappLog with FAILED status and errorMessage', async () => {
      const existingLog = { id: 'log-789' };
      mockPrisma.whatsappLog.findFirst.mockResolvedValue(existingLog);

      const payload = createStatusPayload('failed', {
        messageId: 'wamid.failed123',
        errorCode: 131030,
        errorTitle: 'Recipient phone number not in allowed list',
      });

      await service.processStatusUpdates(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processStatusUpdates
        >[0],
      );

      expect(mockPrisma.whatsappLog.update).toHaveBeenCalledWith({
        where: { id: 'log-789' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: expect.stringContaining('131030'),
        }),
      });
      expect(mockSupportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'wamid.failed123',
        'failed',
        {
          code: 131030,
          title: 'Recipient phone number not in allowed list',
        },
      );
    });

    it('should not call update when no matching log record found', async () => {
      mockPrisma.whatsappLog.findFirst.mockResolvedValue(null);

      const payload = createStatusPayload('delivered', {
        messageId: 'wamid.unknown',
      });

      await service.processStatusUpdates(
        payload.entry[0].changes[0].value as Parameters<
          typeof service.processStatusUpdates
        >[0],
      );

      expect(mockPrisma.whatsappLog.update).not.toHaveBeenCalled();
      expect(mockSupportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'wamid.unknown',
        'delivered',
        undefined,
      );
    });

    it('should handle empty statuses array gracefully', async () => {
      await service.processStatusUpdates({
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '15551234567',
          phone_number_id: 'test',
        },
        statuses: [],
      } as Parameters<typeof service.processStatusUpdates>[0]);

      expect(mockPrisma.whatsappLog.update).not.toHaveBeenCalled();
      expect(
        mockSupportInboxService.updateMessageStatus,
      ).not.toHaveBeenCalled();
    });

    it('should catch and not rethrow errors during status update processing', async () => {
      mockPrisma.whatsappLog.findFirst.mockRejectedValue(
        new Error('DB connection error'),
      );

      const payload = createStatusPayload('delivered', {
        messageId: 'wamid.dberr',
      });

      await expect(
        service.processStatusUpdates(
          payload.entry[0].changes[0].value as Parameters<
            typeof service.processStatusUpdates
          >[0],
        ),
      ).resolves.not.toThrow();
      expect(mockSupportInboxService.updateMessageStatus).toHaveBeenCalledWith(
        'wamid.dberr',
        'delivered',
        undefined,
      );
    });
  });
});

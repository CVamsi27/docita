import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service';
import { WhatsappTemplatesService } from '../whatsapp/templates.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { IPaymentProvider } from './providers/payment.provider.interface';

// Mock Razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    paymentLink: {
      create: jest.fn().mockResolvedValue({
        id: 'plink_test123',
        short_url: 'https://rzp.io/test123',
      }),
    },
  }));
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let whatsappService: jest.Mocked<WhatsappService>;
  let whatsappClient: jest.Mocked<WhatsappClientService>;
  let whatsappTemplates: jest.Mocked<WhatsappTemplatesService>;
  let pushNotifications: jest.Mocked<PushNotificationService>;
  let paymentGateway: jest.Mocked<PaymentWebSocketGateway>;
  let paymentProvider: jest.Mocked<IPaymentProvider>;

  const mockPatient = {
    id: 'patient-1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+919876543210',
    email: 'john@example.com',
  };

  const mockInvoice = {
    id: 'invoice-123456789',
    total: 1000,
    status: 'pending',
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    phone: '+911234567890',
  };

  const mockPaymentSession = {
    id: 'session-1',
    clinicId: 'clinic-1',
    invoiceId: 'invoice-123456789',
    patientId: 'patient-1',
    provider: 'razorpay',
    providerSessionId: 'plink_test123',
    paymentLink: 'https://rzp.io/test123',
    shortUrl: 'https://rzp.io/test123',
    amount: 100000,
    currency: 'INR',
    status: 'created',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      patient: {
        findUnique: jest.fn().mockResolvedValue(mockPatient),
      },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
        update: jest.fn().mockResolvedValue({ ...mockInvoice, status: 'paid' }),
      },
      paymentSession: {
        create: jest.fn().mockResolvedValue(mockPaymentSession),
        findFirst: jest.fn().mockResolvedValue(mockPaymentSession),
        findUnique: jest.fn().mockResolvedValue(mockPaymentSession),
        update: jest
          .fn()
          .mockResolvedValue({ ...mockPaymentSession, status: 'paid' }),
      },
      whatsappLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((input) => {
        if (Array.isArray(input)) {
          return Promise.all(input);
        }
        if (typeof input === 'function') {
          return input(mockPrismaService);
        }
        return Promise.resolve(input);
      }),
    };

    const mockWhatsappService = {
      sendMessage: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    const mockWhatsappClient = {
      sendMessage: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    const mockWhatsappTemplates = {
      resolveTemplate: jest.fn().mockResolvedValue({
        content: 'Test message',
        textFallback: 'Test message fallback',
        buttonType: 'NONE',
      }),
      getMessageForMode: jest.fn().mockReturnValue('Test message fallback'),
    };

    const mockPushNotifications = {
      sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
      sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
    };

    const mockPaymentGateway = {
      emitPaymentUpdate: jest.fn(),
    };

    const mockPaymentProvider = {
      createPaymentLink: jest.fn().mockResolvedValue({
        id: 'plink_test123',
        short_url: 'https://rzp.io/test123',
        status: 'created',
      }),
      verifySignature: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: WhatsappClientService, useValue: mockWhatsappClient },
        { provide: WhatsappTemplatesService, useValue: mockWhatsappTemplates },
        { provide: PushNotificationService, useValue: mockPushNotifications },
        { provide: PaymentWebSocketGateway, useValue: mockPaymentGateway },
        { provide: 'IPaymentProvider', useValue: mockPaymentProvider },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    whatsappService = module.get(WhatsappService);
    whatsappClient = module.get(WhatsappClientService);
    whatsappTemplates = module.get(WhatsappTemplatesService);
    pushNotifications = module.get(PushNotificationService);
    paymentGateway = module.get(PaymentWebSocketGateway);
    paymentProvider = module.get('IPaymentProvider');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentSession', () => {
    it('should create a Razorpay payment session', async () => {
      const result = await service.createPaymentSession({
        invoiceId: mockInvoice.id,
        amount: 1000,
        currency: 'INR',
        patientId: mockPatient.id,
        clinicId: mockClinic.id,
        description: 'Test payment',
      });

      expect(result).toBeDefined();
      expect(result.shortUrl).toBe('https://rzp.io/test123');
      expect(prismaService.paymentSession.create).toHaveBeenCalled();
    });

    it('should create a CASH payment session', async () => {
      const result = await service.createPaymentSession({
        invoiceId: mockInvoice.id,
        amount: 1000,
        currency: 'INR',
        patientId: mockPatient.id,
        clinicId: mockClinic.id,
        paymentMode: 'CASH',
      });

      expect(result).toBeDefined();
      expect(prismaService.paymentSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'cash',
            status: 'pending',
          }),
        }),
      );
    });

    it('should throw error if patient not found', async () => {
      (prismaService.patient.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPaymentSession({
          invoiceId: mockInvoice.id,
          amount: 1000,
          currency: 'INR',
          patientId: 'non-existent',
          clinicId: mockClinic.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if invoice not found', async () => {
      (prismaService.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPaymentSession({
          invoiceId: 'non-existent',
          amount: 1000,
          currency: 'INR',
          patientId: mockPatient.id,
          clinicId: mockClinic.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should convert amount to paise for Razorpay', async () => {
      await service.createPaymentSession({
        invoiceId: mockInvoice.id,
        amount: 500.5,
        currency: 'INR',
        patientId: mockPatient.id,
        clinicId: mockClinic.id,
      });

      expect(prismaService.paymentSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 50050, // 500.50 * 100
          }),
        }),
      );
    });
  });

  describe('sendPaymentLinkWhatsApp', () => {
    it('should send payment link via WhatsApp', async () => {
      (prismaService.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockPaymentSession,
        patient: mockPatient,
        invoice: mockInvoice,
        clinic: mockClinic,
      });

      const result = await service.sendPaymentLinkWhatsApp('session-1');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(whatsappClient.sendMessage).toHaveBeenCalledWith({
        to: mockPatient.phoneNumber,
        message: expect.any(String),
      });
    });

    it('should throw error if session not found', async () => {
      (prismaService.paymentSession.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.sendPaymentLinkWhatsApp('non-existent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update session with WhatsApp message details', async () => {
      (prismaService.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockPaymentSession,
        patient: mockPatient,
        invoice: mockInvoice,
        clinic: mockClinic,
      });

      await service.sendPaymentLinkWhatsApp('session-1');

      expect(prismaService.paymentSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          whatsappSentAt: expect.any(Date),
          whatsappMessageId: 'msg-123',
          whatsappStatus: 'sent',
        }),
      });
    });

    it('should log WhatsApp message', async () => {
      (prismaService.paymentSession.findUnique as jest.Mock).mockResolvedValue({
        ...mockPaymentSession,
        patient: mockPatient,
        invoice: mockInvoice,
        clinic: mockClinic,
      });

      await service.sendPaymentLinkWhatsApp('session-1');

      expect(prismaService.whatsappLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicId: mockClinic.id,
          patientId: mockPatient.id,
          paymentSessionId: 'session-1',
          type: 'payment-link',
        }),
      });
    });
  });

  describe('handleRazorpayWebhook', () => {
    const validPayload = {
      event: 'payment_link.paid',
      payload: {
        payment_link: {
          entity: {
            id: 'plink_test123',
            amount: 100000,
            currency: 'INR',
            status: 'paid',
            short_url: 'https://rzp.io/test123',
          },
        },
      },
    };

    beforeEach(() => {
      // Mock the session with full relations for webhook handler
      (prismaService.paymentSession.findFirst as jest.Mock).mockResolvedValue({
        ...mockPaymentSession,
        patient: mockPatient,
        clinic: mockClinic,
      });
    });

    it('should process payment_link.paid event', async () => {
      await service.handleRazorpayWebhook(validPayload, '');

      expect(prismaService.paymentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'paid',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should update invoice status to paid', async () => {
      await service.handleRazorpayWebhook(validPayload, '');

      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: mockPaymentSession.invoiceId },
        data: { status: 'paid' },
      });
    });

    it('should emit WebSocket event on payment', async () => {
      await service.handleRazorpayWebhook(validPayload, '');

      expect(paymentGateway.emitPaymentUpdate).toHaveBeenCalledWith(
        mockClinic.id,
        mockPaymentSession.id,
        expect.objectContaining({
          status: 'paid',
          paidAt: expect.any(Date),
        }),
      );
    });

    it('should send push notification on successful payment', async () => {
      await service.handleRazorpayWebhook(validPayload, '');

      expect(pushNotifications.sendPaymentConfirmation).toHaveBeenCalledWith(
        mockPatient.id,
        1000, // amount in rupees
        expect.stringMatching(/^INVOICE-/), // invoice number (first 8 chars uppercase)
        mockClinic.name,
      );
    });

    it('should send WhatsApp confirmation on successful payment', async () => {
      await service.handleRazorpayWebhook(validPayload, '');

      expect(whatsappTemplates.resolveTemplate).toHaveBeenCalledWith(
        'payment_confirmation',
        expect.objectContaining({
          patientName: mockPatient.firstName,
          clinicName: mockClinic.name,
        }),
        mockClinic.id,
      );
      expect(whatsappClient.sendMessage).toHaveBeenCalled();
    });

    it('should handle payment_link.expired event', async () => {
      const expiredPayload = {
        ...validPayload,
        event: 'payment_link.expired',
      };

      await service.handleRazorpayWebhook(expiredPayload, '');

      expect(prismaService.paymentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'expired',
          }),
        }),
      );
    });

    it('should handle payment_link.cancelled event', async () => {
      const cancelledPayload = {
        ...validPayload,
        event: 'payment_link.cancelled',
      };

      await service.handleRazorpayWebhook(cancelledPayload, '');

      expect(prismaService.paymentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'cancelled',
          }),
        }),
      );
    });

    it('should skip if session not found', async () => {
      (prismaService.paymentSession.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await service.handleRazorpayWebhook(validPayload, '');

      expect(prismaService.paymentSession.update).not.toHaveBeenCalled();
      expect(paymentGateway.emitPaymentUpdate).not.toHaveBeenCalled();
    });

    it('should not send notifications if patient is null', async () => {
      (prismaService.paymentSession.findFirst as jest.Mock).mockResolvedValue({
        ...mockPaymentSession,
        patient: null,
        clinic: mockClinic,
      });

      await service.handleRazorpayWebhook(validPayload, '');

      expect(pushNotifications.sendPaymentConfirmation).not.toHaveBeenCalled();
      expect(whatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentSession', () => {
    it('should return payment session with relations', async () => {
      const sessionWithRelations = {
        ...mockPaymentSession,
        patient: mockPatient,
        invoice: mockInvoice,
      };
      (prismaService.paymentSession.findUnique as jest.Mock).mockResolvedValue(
        sessionWithRelations,
      );

      const result = await service.getPaymentSession('session-1');

      expect(result).toEqual(sessionWithRelations);
      expect(prismaService.paymentSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        select: expect.objectContaining({
          id: true,
          patient: expect.any(Object),
          invoice: expect.any(Object),
        }),
      });
    });
  });
});

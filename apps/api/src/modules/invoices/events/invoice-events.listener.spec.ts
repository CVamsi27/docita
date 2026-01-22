import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceEventsListener } from './invoice-events.listener';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppNotificationService } from '../../../common/services/whatsapp-notification.service';
import { PaymentsService } from '../../payments/payments.service';
import { InvoiceGeneratedEvent } from './invoice-generated.event';

describe('InvoiceEventsListener', () => {
  let listener: InvoiceEventsListener;
  let prismaService: PrismaService;
  let whatsappNotificationService: WhatsAppNotificationService;
  let paymentsService: PaymentsService;

  const mockInvoice = {
    id: 'invoice-1',
    patientId: 'patient-1',
    clinicId: 'clinic-1',
    total: 1000,
    currrency: 'INR',
    createdAt: new Date(),
    patient: {
      id: 'patient-1',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    },
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
  };

  const mockPaymentSession = {
    id: 'session-1',
    paymentLink: 'https://pay.ment/link',
    shortUrl: 'https://short.url/pay',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceEventsListener,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              findUnique: jest.fn(),
            },
            clinic: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: WhatsAppNotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({ sent: true }),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            createPaymentSession: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<InvoiceEventsListener>(InvoiceEventsListener);
    prismaService = module.get<PrismaService>(PrismaService);
    whatsappNotificationService = module.get<WhatsAppNotificationService>(
      WhatsAppNotificationService,
    );
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should handle invoice.generated event successfully', async () => {
    (prismaService.invoice.findUnique as jest.Mock).mockResolvedValue(
      mockInvoice,
    );
    (prismaService.clinic.findUnique as jest.Mock).mockResolvedValue(
      mockClinic,
    );
    (paymentsService.createPaymentSession as jest.Mock).mockResolvedValue(
      mockPaymentSession,
    );

    const event = new InvoiceGeneratedEvent('invoice-1', 'clinic-1');
    await listener.handleInvoiceGeneratedEvent(event);

    expect(prismaService.invoice.findUnique).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      include: { patient: true },
    });

    expect(paymentsService.createPaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'invoice-1',
        amount: 1000,
        patientId: 'patient-1',
        clinicId: 'clinic-1',
      }),
    );

    expect(whatsappNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invoice',
        clinicId: 'clinic-1',
        phoneNumber: '1234567890',
        message: expect.stringContaining('https://short.url/pay'),
      }),
    );
  });

  it('should skip if invoice or phone number is missing', async () => {
    (prismaService.invoice.findUnique as jest.Mock).mockResolvedValue(null);

    const event = new InvoiceGeneratedEvent('invoice-1', 'clinic-1');
    await listener.handleInvoiceGeneratedEvent(event);

    expect(paymentsService.createPaymentSession).not.toHaveBeenCalled();
    expect(whatsappNotificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('should continue if payment link creation fails', async () => {
    (prismaService.invoice.findUnique as jest.Mock).mockResolvedValue(
      mockInvoice,
    );
    (prismaService.clinic.findUnique as jest.Mock).mockResolvedValue(
      mockClinic,
    );
    (paymentsService.createPaymentSession as jest.Mock).mockRejectedValue(
      new Error('Payment error'),
    );

    const event = new InvoiceGeneratedEvent('invoice-1', 'clinic-1');
    await listener.handleInvoiceGeneratedEvent(event);

    expect(whatsappNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invoice',
        clinicId: 'clinic-1',
        // Message should be sent even without payment link
        message: expect.any(String),
      }),
    );
  });
});

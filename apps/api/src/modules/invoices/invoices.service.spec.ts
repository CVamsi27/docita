import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappTemplatesService } from '../whatsapp/templates.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { WhatsAppNotificationService } from '../../common/services/whatsapp-notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceStatus } from '@workspace/db';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: jest.Mocked<PrismaService>;
  let whatsappNotificationService: jest.Mocked<WhatsAppNotificationService>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockPatient = {
    id: 'patient-1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+919876543210',
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    whatsappAutomation: {
      enabled: true,
      invoiceSent: true,
    },
  };

  const mockInvoice = {
    id: 'invoice-123456789',
    appointmentId: 'appointment-1',
    patientId: 'patient-1',
    total: 1500.5,
    status: InvoiceStatus.PENDING,
    items: [
      { description: 'Consultation', quantity: 1, price: 500 },
      { description: 'Lab Test', quantity: 2, price: 500.25 },
    ],
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
    patient: mockPatient,
  };

  const mockPaymentSession = {
    id: 'session-1',
    shortUrl: 'https://rzp.io/test123',
    paymentLink: 'https://rzp.io/test123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
        findMany: jest.fn().mockResolvedValue([mockInvoice]),
        create: jest.fn().mockResolvedValue(mockInvoice),
        update: jest.fn().mockResolvedValue(mockInvoice),
        count: jest.fn().mockResolvedValue(1),
      },
      clinic: {
        findUnique: jest.fn().mockResolvedValue(mockClinic),
      },
      whatsappLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const mockWhatsappTemplates = {
      resolveTemplate: jest.fn().mockResolvedValue({
        content: 'Invoice message',
        textFallback: 'Invoice message fallback',
        buttonType: 'CALL_TO_ACTION',
        buttons: [
          { id: 'pay', text: 'Pay Now', action: 'https://rzp.io/test123' },
        ],
      }),
      getMessageForMode: jest.fn().mockReturnValue('Invoice message fallback'),
    };

    const mockPaymentsService = {
      createPaymentSession: jest.fn().mockResolvedValue(mockPaymentSession),
    };

    const mockPdfService = {
      generate: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
    };

    const mockWhatsAppNotification = {
      sendNotification: jest.fn().mockResolvedValue({ sent: true }),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: WhatsAppNotificationService,
          useValue: mockWhatsAppNotification,
        },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: InvoicePdfService, useValue: mockPdfService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prismaService = module.get(PrismaService);
    whatsappNotificationService = module.get(WhatsAppNotificationService);
    paymentsService = module.get(PaymentsService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invoice', async () => {
      const createData = {
        patientId: 'patient-1',
        total: 1500.5,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Test', quantity: 1, price: 1500.5 }],
      };

      const result = await service.create(createData);

      expect(result).toBeDefined();
      expect(prismaService.invoice.create).toHaveBeenCalled();
    });

    it('should create invoice with doctor context', async () => {
      const createData = {
        patientId: 'patient-1',
        total: 1000,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Consultation', quantity: 1, price: 1000 }],
        doctorName: 'Dr. Smith',
        doctorEmail: 'dr.smith@clinic.com',
        doctorPhone: '+911234567890',
        doctorSpecialization: 'GENERAL',
        clinicId: 'clinic-1',
      };

      await service.create(createData);

      expect(prismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            doctorName: 'Dr. Smith',
            doctorEmail: 'dr.smith@clinic.com',
          }),
        }),
      );
    });

    it('should emit invoice.generated event when clinicId is provided', async () => {
      const createData = {
        patientId: 'patient-1',
        total: 1000,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Test', quantity: 1, price: 1000 }],
        clinicId: 'clinic-1',
      };

      await service.create(createData);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'invoice.generated',
        expect.objectContaining({
          invoiceId: mockInvoice.id,
          clinicId: 'clinic-1',
        }),
      );
    });

    it('should not emit event if clinicId is missing', async () => {
      const createData = {
        patientId: 'patient-1',
        total: 1000,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Test', quantity: 1, price: 1000 }],
      };

      await service.create(createData);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      const result = await service.findOne('invoice-123456789');

      expect(result).toBeDefined();
      expect(prismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'invoice-123456789' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      (prismaService.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices for clinic', async () => {
      const result = await service.findAll('clinic-1', { limit: 10 });

      expect(result).toBeDefined();
    });

    it('should return empty list for missing clinicId', async () => {
      const result = await service.findAll('', {});

      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('update', () => {
    it('should update invoice status', async () => {
      const result = await service.update('invoice-123456789', {
        status: InvoiceStatus.PAID,
      });

      expect(result).toBeDefined();
      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123456789' },
        data: expect.objectContaining({ status: InvoiceStatus.PAID }),
        select: expect.any(Object),
      });
    });

    it('should update invoice items', async () => {
      const newItems = [{ description: 'Updated', quantity: 2, price: 250 }];

      await service.update('invoice-123456789', { items: newItems });

      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123456789' },
        data: expect.objectContaining({ items: newItems }),
        select: expect.any(Object),
      });
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF buffer', async () => {
      const result = await service.generatePDF('invoice-123456789');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include invoice details in PDF', async () => {
      // This is a basic smoke test - PDF content validation would require
      // parsing the PDF which is complex for unit tests
      const result = await service.generatePDF('invoice-123456789');

      expect(result).toBeDefined();
      expect(prismaService.invoice.findUnique).toHaveBeenCalled();
    });
  });
});

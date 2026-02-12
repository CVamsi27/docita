import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappTemplatesService } from './templates.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WhatsappTemplatesService', () => {
  let service: WhatsappTemplatesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    whatsappTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappTemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WhatsappTemplatesService>(WhatsappTemplatesService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDefaultTemplateNames', () => {
    it('should return all default template names', () => {
      const names = service.getDefaultTemplateNames();

      expect(names).toContain('appointment_scheduled');
      expect(names).toContain('appointment_reminder_30min');
      expect(names).toContain('appointment_reminder_24hr');
      expect(names).toContain('invoice_ready');
      expect(names).toContain('payment_link');
      expect(names).toContain('payment_confirmation');
      expect(names).toContain('payment_failed');
      expect(names).toContain('prescription_ready');
      expect(names).toContain('staff_notification');
    });
  });

  describe('getTemplate', () => {
    it('should return default template when no custom template exists', async () => {
      mockPrismaService.whatsappTemplate.findFirst.mockResolvedValue(null);

      const template = await service.getTemplate('invoice_ready', 'clinic-1');

      expect(template).toBeDefined();
      expect(template?.name).toBe('invoice_ready');
      expect(template?.category).toBe('INVOICE');
    });

    it('should return custom template when it exists', async () => {
      const customTemplate = {
        name: 'invoice_ready',
        category: 'INVOICE',
        content: 'Custom invoice content',
        variables: [{ name: 'patientName', required: true }],
        buttonType: 'NONE',
        buttons: null,
      };
      mockPrismaService.whatsappTemplate.findFirst.mockResolvedValue(
        customTemplate,
      );

      const template = await service.getTemplate('invoice_ready', 'clinic-1');

      expect(template?.content).toBe('Custom invoice content');
    });

    it('should return null for non-existent template', async () => {
      mockPrismaService.whatsappTemplate.findFirst.mockResolvedValue(null);

      const template = await service.getTemplate('non_existent_template');

      expect(template).toBeNull();
    });
  });

  describe('resolveTemplate', () => {
    beforeEach(() => {
      mockPrismaService.whatsappTemplate.findFirst.mockResolvedValue(null);
    });

    it('should resolve invoice_ready template with all variables', async () => {
      const resolved = await service.resolveTemplate('invoice_ready', {
        patientName: 'John',
        clinicName: 'Test Clinic',
        amount: '₹500.00',
        invoiceNumber: 'INV12345',
        date: 'Jan 5, 2026',
        paymentLink: 'https://pay.example.com/abc123',
      });

      expect(resolved).toBeDefined();
      expect(resolved?.content).toContain('John');
      expect(resolved?.content).toContain('Test Clinic');
      expect(resolved?.content).toContain('₹500.00');
      expect(resolved?.content).toContain('INV12345');
      expect(resolved?.content).toContain('https://pay.example.com/abc123');
    });

    it('should resolve payment_confirmation template', async () => {
      const resolved = await service.resolveTemplate('payment_confirmation', {
        patientName: 'Jane',
        clinicName: 'Health Clinic',
        amount: '₹1000.00',
        invoiceNumber: 'INV67890',
        date: 'Jan 5, 2026',
        paymentId: 'pay_xyz123',
      });

      expect(resolved).toBeDefined();
      expect(resolved?.content).toContain('Payment Received');
      expect(resolved?.content).toContain('Jane');
      expect(resolved?.content).toContain('₹1000.00');
      expect(resolved?.buttonType).toBe('NONE');
    });

    it('should resolve payment_failed template with retry button', async () => {
      const resolved = await service.resolveTemplate('payment_failed', {
        patientName: 'Bob',
        clinicName: 'Medical Center',
        amount: '₹750.00',
        invoiceNumber: 'INV11111',
        paymentLink: 'https://pay.example.com/retry',
      });

      expect(resolved).toBeDefined();
      expect(resolved?.content).toContain('Payment Failed');
      expect(resolved?.buttonType).toBe('CALL_TO_ACTION');
      expect(resolved?.buttons?.[0]?.action).toBe(
        'https://pay.example.com/retry',
      );
    });

    it('should resolve appointment_scheduled template with quick reply buttons', async () => {
      const resolved = await service.resolveTemplate('appointment_scheduled', {
        patientName: 'Alice',
        clinicName: 'Family Clinic',
        date: 'Jan 10, 2026',
        time: '10:30 AM',
        doctorName: 'Dr. Smith',
      });

      expect(resolved).toBeDefined();
      expect(resolved?.buttonType).toBe('QUICK_REPLY');
      expect(resolved?.buttons).toHaveLength(3);
      expect(resolved?.buttons?.map((b) => b.id)).toEqual([
        'confirm',
        'reschedule',
        'cancel',
      ]);
    });

    it('should return null for missing required variables', async () => {
      const resolved = await service.resolveTemplate('invoice_ready', {
        patientName: 'John',
        // Missing required: clinicName, amount, invoiceNumber, date
      });

      expect(resolved).toBeNull();
    });

    it('should use default value for optional variables', async () => {
      const resolved = await service.resolveTemplate('payment_link', {
        patientName: 'Test',
        clinicName: 'Clinic',
        amount: '₹100',
        paymentLink: 'https://pay.example.com',
        // description is optional with default 'Consultation'
      });

      expect(resolved).toBeDefined();
      // Default value is applied but template replaces {{description}} with the value
      // The "For:" field will show the default
      expect(resolved?.content).toContain('For:');
    });

    it('should handle conditional content ({{#if}})', async () => {
      // invoice_ready has conditional: {{#if paymentLink}}
      const withLink = await service.resolveTemplate('invoice_ready', {
        patientName: 'John',
        clinicName: 'Test Clinic',
        amount: '₹500',
        invoiceNumber: 'INV123',
        date: 'Jan 5',
        paymentLink: 'https://pay.example.com',
      });

      const withoutLink = await service.resolveTemplate('invoice_ready', {
        patientName: 'John',
        clinicName: 'Test Clinic',
        amount: '₹500',
        invoiceNumber: 'INV123',
        date: 'Jan 5',
        paymentLink: '',
      });

      expect(withLink?.content).toContain('https://pay.example.com');
      expect(withoutLink?.content).not.toContain('Pay online:');
    });
  });

  describe('getMessageForMode', () => {
    it('should return textFallback in sandbox mode', async () => {
      mockPrismaService.whatsappTemplate.findFirst.mockResolvedValue(null);

      const resolved = await service.resolveTemplate('appointment_scheduled', {
        patientName: 'Test',
        clinicName: 'Clinic',
        date: 'Jan 5',
        time: '10:00 AM',
        doctorName: 'Dr. Test',
      });

      const message = service.getMessageForMode(resolved);

      // Sandbox mode should include numbered reply options
      expect(message).toContain('1️⃣');
      expect(message).toContain('2️⃣');
      expect(message).toContain('3️⃣');
    });
  });

  describe('seedDefaultTemplates', () => {
    it('should seed templates for new clinic', async () => {
      mockPrismaService.whatsappTemplate.findMany.mockResolvedValue([]);
      mockPrismaService.whatsappTemplate.create.mockResolvedValue({});

      await service.seedDefaultTemplates('clinic-new');

      expect(mockPrismaService.whatsappTemplate.create).toHaveBeenCalled();
      // Should create all default templates
      const createCalls = mockPrismaService.whatsappTemplate.create.mock.calls;
      expect(createCalls.length).toBeGreaterThan(5);
    });

    it('should skip seeding if clinic already has templates', async () => {
      mockPrismaService.whatsappTemplate.findMany.mockResolvedValue([
        { id: 'existing-template' },
      ]);

      await service.seedDefaultTemplates('clinic-existing');

      expect(mockPrismaService.whatsappTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('listTemplates', () => {
    it('should return all templates for a clinic', async () => {
      const templates = [
        { id: '1', name: 'template1', category: 'APPOINTMENT' },
        { id: '2', name: 'template2', category: 'INVOICE' },
      ];
      mockPrismaService.whatsappTemplate.findMany.mockResolvedValue(templates);

      const result = await service.listTemplates('clinic-1');

      expect(result).toEqual(templates);
      expect(mockPrismaService.whatsappTemplate.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        orderBy: expect.any(Array),
      });
    });
  });

  describe('updateTemplateStatus', () => {
    it('should update template status', async () => {
      mockPrismaService.whatsappTemplate.update.mockResolvedValue({
        id: 'template-1',
        status: 'APPROVED',
      });

      await service.updateTemplateStatus(
        'template-1',
        'APPROVED',
        'meta-template-id',
      );

      expect(mockPrismaService.whatsappTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          status: 'APPROVED',
          metaTemplateId: 'meta-template-id',
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});

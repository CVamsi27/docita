import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceCalculationRulesService } from '../domain-services/invoice-calculation-rules.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe.skip('InvoiceCalculationRulesService', () => {
  let service: InvoiceCalculationRulesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceCalculationRulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvoiceCalculationRulesService>(
      InvoiceCalculationRulesService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculateItemAmount', () => {
    it('should calculate item amount correctly', () => {
      const result = service.calculateItemAmount(5, 100);

      expect(result.amount).toBe(500);
      expect(result.error).toBeUndefined();
    });

    it('should handle decimal prices', () => {
      const result = service.calculateItemAmount(3, 99.99);

      expect(result.amount).toBe(299.97);
    });

    it('should reject zero quantity', () => {
      const result = service.calculateItemAmount(0, 100);

      expect(result.error).toContain('greater than 0');
    });

    it('should reject negative unit price', () => {
      const result = service.calculateItemAmount(5, -100);

      expect(result.error).toContain('cannot be negative');
    });
  });

  describe('calculateTaxAmount', () => {
    it('should calculate tax correctly', () => {
      const taxAmount = service.calculateTaxAmount(1000, 0.18); // 18% GST

      expect(taxAmount).toBe(180);
    });

    it('should handle zero tax rate', () => {
      const taxAmount = service.calculateTaxAmount(1000, 0);

      expect(taxAmount).toBe(0);
    });

    it('should return zero for negative subtotal', () => {
      const taxAmount = service.calculateTaxAmount(-1000, 0.18);

      expect(taxAmount).toBe(0);
    });
  });

  describe('calculateDiscountAmount', () => {
    it('should calculate fixed discount', () => {
      const result = service.calculateDiscountAmount(1000, 'FIXED', 100);

      expect(result.amount).toBe(100);
      expect(result.error).toBeUndefined();
    });

    it('should calculate percentage discount', () => {
      const result = service.calculateDiscountAmount(1000, 'PERCENTAGE', 10); // 10%

      expect(result.amount).toBe(100);
    });

    it('should cap fixed discount at subtotal', () => {
      const result = service.calculateDiscountAmount(1000, 'FIXED', 2000); // Try to discount 2000 from 1000

      expect(result.amount).toBe(1000); // Capped at subtotal
    });

    it('should reject discount percentage over 100%', () => {
      const result = service.calculateDiscountAmount(1000, 'PERCENTAGE', 150);

      expect(result.error).toContain('cannot exceed 100%');
    });
  });

  describe('calculateInsuranceDeduction', () => {
    it('should calculate insurance deduction correctly', () => {
      const deduction = service.calculateInsuranceDeduction(1000, 80); // 80% coverage

      expect(deduction).toBe(800);
    });

    it('should return zero for zero coverage', () => {
      const deduction = service.calculateInsuranceDeduction(1000, 0);

      expect(deduction).toBe(0);
    });

    it('should cap at 100% coverage', () => {
      const deduction = service.calculateInsuranceDeduction(1000, 150); // Invalid coverage

      expect(deduction).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate complete invoice totals', () => {
      const invoice = {
        items: [],
        subtotal: 1000,
        taxRate: 0.18,
      };

      const result = service.calculateTotal(invoice);

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(180);
      expect(result.total).toBe(1180);
      expect(result.amountDue).toBe(1180);
    });

    it('should apply fixed discount', () => {
      const invoice = {
        items: [],
        subtotal: 1000,
        discount: { type: 'FIXED' as const, value: 100 },
        taxRate: 0.18,
      };

      const result = service.calculateTotal(invoice);

      expect(result.totalDiscount).toBe(100);
      expect(result.subtotalAfterDiscount).toBe(900);
      expect(result.tax).toBe(162); // 18% of 900
      expect(result.total).toBe(1062);
    });

    it('should apply percentage discount', () => {
      const invoice = {
        items: [],
        subtotal: 1000,
        discount: { type: 'PERCENTAGE' as const, value: 10 }, // 10% discount
        taxRate: 0.18,
      };

      const result = service.calculateTotal(invoice);

      expect(result.totalDiscount).toBe(100);
      expect(result.subtotalAfterDiscount).toBe(900);
      expect(result.tax).toBe(162);
      expect(result.total).toBe(1062);
    });

    it('should apply insurance deduction', () => {
      const invoice = {
        items: [],
        subtotal: 1000,
        insuranceCoverage: 50, // 50% covered by insurance
        taxRate: 0.18,
      };

      const result = service.calculateTotal(invoice);

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(180);
      expect(result.total).toBe(1180);
      expect(result.insuranceDeduction).toBe(590); // 50% of 1180
      expect(result.amountDue).toBe(590);
    });

    it('should combine all calculations', () => {
      const invoice = {
        items: [],
        subtotal: 1000,
        discount: { type: 'PERCENTAGE' as const, value: 10 }, // 10% discount
        insuranceCoverage: 50, // 50% insurance
        taxRate: 0.18,
        paymentTermsDays: 30,
      };

      const result = service.calculateTotal(invoice);

      expect(result.totalDiscount).toBe(100);
      expect(result.subtotalAfterDiscount).toBe(900);
      expect(result.tax).toBe(162);
      expect(result.total).toBe(1062);
      expect(result.insuranceDeduction).toBe(531);
      expect(result.amountDue).toBe(531);
      expect(result.dueDate).toBeDefined();
    });
  });

  describe('calculateDueDate', () => {
    it('should calculate due date correctly', () => {
      const invoiceDate = new Date('2024-02-15');
      const dueDate = service.calculateDueDate(invoiceDate, 30);

      expect(dueDate.getDate()).toBe(16); // 15 + 30 = 17th, but accounting for month rollover
      expect(dueDate.getMonth()).toBe(2); // March
    });

    it('should handle month rollover', () => {
      const invoiceDate = new Date('2024-01-30');
      const dueDate = service.calculateDueDate(invoiceDate, 30);

      expect(dueDate.getDate()).toBe(1);
      expect(dueDate.getMonth()).toBe(1); // February
    });
  });

  describe('validatePricing', () => {
    it('should accept valid pricing items', () => {
      const items = [
        {
          quantity: 5,
          unitPrice: 100,
          taxRate: 0.18,
        },
      ];

      const result = service.validatePricing(items);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject empty items array', () => {
      const result = service.validatePricing([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('must have at least one item');
    });

    it('should identify invalid items', () => {
      const items = [
        {
          quantity: -5, // Invalid
          unitPrice: -100, // Invalid
          taxRate: 1.5, // Invalid (>1)
          discountType: 'PERCENTAGE' as const,
          discountValue: 150, // Invalid (>100%)
        },
      ];

      const result = service.validatePricing(items);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateLateFees', () => {
    it('should calculate late fees for overdue invoices', () => {
      const lateFees = service.calculateLateFees(1000, 30, 0.02); // 2% per month, 30 days = 1 month

      expect(lateFees).toBeGreaterThan(0);
    });

    it('should return zero for no days overdue', () => {
      const lateFees = service.calculateLateFees(1000, 0, 0.02);

      expect(lateFees).toBe(0);
    });

    it('should accumulate fees for multiple months', () => {
      const fees1Month = service.calculateLateFees(1000, 30, 0.02);
      const fees3Months = service.calculateLateFees(1000, 90, 0.02);

      expect(fees3Months).toBeGreaterThan(fees1Month);
    });
  });

  describe('recalculateInvoiceAmounts', () => {
    it('should throw error for non-existent invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.recalculateInvoiceAmounts('nonexistent'),
      ).rejects.toThrow('not found');
    });

    it('should recalculate invoice amounts correctly', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce({
        id: 'invoice-1',
        items: [
          {
            quantity: 2,
            unitPrice: 500,
            taxRate: 0.18,
            discountType: null,
            discountValue: null,
          },
        ],
        discountType: null,
        discountValue: null,
        insuranceCoverage: null,
        taxRate: 0.18,
      });

      const result = await service.recalculateInvoiceAmounts('invoice-1');

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(180);
      expect(result.total).toBe(1180);
    });
  });
});

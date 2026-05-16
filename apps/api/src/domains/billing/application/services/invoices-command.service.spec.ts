import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { InvoicesCommandService } from './invoices-command.service';
import { InvoicesQueryService } from './invoices-query.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { InvoiceStatus } from '@workspace/db';

describe('InvoicesCommandService', () => {
  let service: InvoicesCommandService;
  let repository: { findPatientContext: jest.Mock; nextInvoiceNumber: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let taxCalculator: jest.Mocked<TaxCalculatorService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let usageTracking: jest.Mocked<UsageTrackingService>;
  let storageProvider: jest.Mocked<StorageProvider>;
  let claimValidationService: jest.Mocked<ClaimValidationService>;
  let queryService: jest.Mocked<InvoicesQueryService>;

  const mockPatient = {
    id: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
    address: null,
    clinic: { id: 'clinic-1', name: 'Test Clinic', currency: 'INR', address: null, settings: {} },
  };

  const mockCalculation = {
    invoiceType: 'TAX_INVOICE',
    grandTotal: 1000,
    subtotal: 900,
    discountTotal: 0,
    taxTotal: 100,
    summary: { currency: 'INR', placeOfSupply: null, reverseCharge: false, eInvoice: null },
    items: [],
  };

  beforeEach(() => {
    repository = {
      findPatientContext: jest.fn(),
      nextInvoiceNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    taxCalculator = Object.create(TaxCalculatorService.prototype) as jest.Mocked<TaxCalculatorService>;
    taxCalculator.calculateInvoice = jest.fn();

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    usageTracking = Object.create(UsageTrackingService.prototype) as jest.Mocked<UsageTrackingService>;
    usageTracking.trackInvoice = jest.fn();

    storageProvider = { uploadBuffer: jest.fn(), supportsSignedUrls: false } as unknown as jest.Mocked<StorageProvider>;

    claimValidationService = Object.create(ClaimValidationService.prototype) as jest.Mocked<ClaimValidationService>;
    claimValidationService.assertClaimReady = jest.fn();

    queryService = Object.create(InvoicesQueryService.prototype) as jest.Mocked<InvoicesQueryService>;
    queryService.findOne = jest.fn();

    service = new InvoicesCommandService(
      repository as never,
      taxCalculator,
      eventEmitter,
      usageTracking,
      storageProvider,
      claimValidationService,
      queryService,
    );
  });

  describe('create', () => {
    it('should create an invoice and emit event', async () => {
      repository.findPatientContext.mockResolvedValueOnce(mockPatient as never);
      repository.nextInvoiceNumber.mockResolvedValueOnce('INV-001' as never);
      (taxCalculator.calculateInvoice as jest.Mock).mockReturnValueOnce(mockCalculation);
      const created = { id: 'inv-1', invoiceNumber: 'INV-001', status: InvoiceStatus.PENDING };
      repository.create.mockResolvedValueOnce(created as never);
      (usageTracking.trackInvoice as jest.Mock).mockResolvedValueOnce(undefined as never);

      const result = await service.create({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        total: 1000,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Consultation', quantity: 1, price: 1000 }],
      });

      expect(result).toEqual(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith('invoice.generated', expect.objectContaining({ invoiceId: 'inv-1' }));
    });

    it('should throw NotFoundException when patient is not found', async () => {
      repository.findPatientContext.mockResolvedValueOnce(null as never);

      await expect(
        service.create({ patientId: 'missing', clinicId: 'clinic-1', total: 0, status: InvoiceStatus.PENDING, items: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the invoice', async () => {
      repository.delete.mockResolvedValueOnce(undefined as never);

      await service.remove('inv-1', 'clinic-1');

      expect(repository.delete).toHaveBeenCalledWith('inv-1', 'clinic-1');
    });
  });

  describe('submitClaim', () => {
    it('should submit claim after validating readiness', async () => {
      (claimValidationService.assertClaimReady as jest.Mock).mockResolvedValueOnce(undefined as never);
      const invoice = { id: 'inv-1', status: InvoiceStatus.PAID };
      (queryService.findOne as jest.Mock).mockResolvedValueOnce(invoice as never);

      const result = await service.submitClaim('inv-1', 'clinic-1');

      expect(result.invoiceId).toBe('inv-1');
      expect(result.claimReady).toBe(true);
    });
  });
});

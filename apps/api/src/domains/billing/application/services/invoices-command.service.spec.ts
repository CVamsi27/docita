import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { InvoicesCommandService } from './invoices-command.service';
import { InvoicesQueryService } from './invoices-query.service';
import { PaymentsCommandService } from './payments-command.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { InvoiceStatus } from '@workspace/db';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('InvoicesCommandService', () => {
  let service: InvoicesCommandService;
  let repository: {
    findPatientContext: jest.Mock;
    nextInvoiceNumber: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let taxCalculator: jest.Mocked<TaxCalculatorService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let usageTracking: jest.Mocked<UsageTrackingService>;
  let storageProvider: jest.Mocked<StorageProvider>;
  let claimValidationService: jest.Mocked<ClaimValidationService>;
  let queryService: jest.Mocked<InvoicesQueryService>;
  let clock: IClock;

  const mockPatient = {
    id: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
    address: null,
    clinic: {
      id: 'clinic-1',
      name: 'Test Clinic',
      currency: 'INR',
      address: null,
      settings: {},
    },
  };

  const mockCalculation = {
    invoiceType: 'TAX_INVOICE',
    grandTotal: 1000,
    subtotal: 900,
    discountTotal: 0,
    taxTotal: 100,
    summary: {
      currency: 'INR',
      placeOfSupply: null,
      reverseCharge: false,
      eInvoice: null,
    },
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

    taxCalculator = Object.create(
      TaxCalculatorService.prototype,
    ) as jest.Mocked<TaxCalculatorService>;
    taxCalculator.calculateInvoice = jest.fn();

    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    usageTracking = Object.create(
      UsageTrackingService.prototype,
    ) as jest.Mocked<UsageTrackingService>;
    usageTracking.trackInvoice = jest.fn();

    storageProvider = {
      uploadBuffer: jest.fn(),
      supportsSignedUrls: false,
    } as unknown as jest.Mocked<StorageProvider>;

    claimValidationService = Object.create(
      ClaimValidationService.prototype,
    ) as jest.Mocked<ClaimValidationService>;
    claimValidationService.assertClaimReady = jest.fn();

    queryService = Object.create(
      InvoicesQueryService.prototype,
    ) as jest.Mocked<InvoicesQueryService>;
    queryService.findOne = jest.fn();

    clock = { now: () => new Date('2026-05-19T12:00:00.000Z') };

    const paymentsCommand = {
      applyAppointmentAdvance: jest
        .fn<PaymentsCommandService['applyAppointmentAdvance']>()
        .mockResolvedValue(undefined),
    } as unknown as PaymentsCommandService;

    service = new InvoicesCommandService(
      repository as never,
      taxCalculator,
      eventEmitter,
      usageTracking,
      storageProvider,
      claimValidationService,
      queryService,
      paymentsCommand,
      clock,
    );
  });

  describe('create', () => {
    it('should create an invoice and emit event', async () => {
      repository.findPatientContext.mockResolvedValueOnce(mockPatient as never);
      repository.nextInvoiceNumber.mockResolvedValueOnce('INV-001' as never);
      (taxCalculator.calculateInvoice as jest.Mock).mockReturnValueOnce(
        mockCalculation,
      );
      const created = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        status: InvoiceStatus.PENDING,
      };
      repository.create.mockResolvedValueOnce(created as never);
      (usageTracking.trackInvoice as jest.Mock).mockResolvedValueOnce(
        undefined as never,
      );

      const result = await service.create({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        total: 1000,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Consultation', quantity: 1, price: 1000 }],
      });

      expect(result).toEqual(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ApplicationEvents.INVOICE_GENERATED,
        expect.objectContaining({ invoiceId: 'inv-1' }),
      );
    });

    it('should throw NotFoundException when patient is not found', async () => {
      repository.findPatientContext.mockResolvedValueOnce(null as never);

      await expect(
        service.create({
          patientId: 'missing',
          clinicId: 'clinic-1',
          total: 0,
          status: InvoiceStatus.PENDING,
          items: [],
        }),
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

  describe('update money-mutation guards', () => {
    it.each([InvoiceStatus.PAID, InvoiceStatus.CANCELLED])(
      'rejects an items-only PATCH on a %s invoice (no status in payload)',
      async (settledStatus) => {
        (queryService.findOne as jest.Mock).mockResolvedValueOnce({
          id: 'inv-1',
          status: settledStatus,
          currency: 'INR',
        } as never);

        await expect(
          service.update('inv-1', { items: [] }, 'clinic-1'),
        ).rejects.toThrow(BadRequestException);
        expect(repository.update).not.toHaveBeenCalled();
      },
    );

    it('still allows a status-only transition on a pending invoice', async () => {
      (queryService.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'inv-1',
        status: InvoiceStatus.PENDING,
      } as never);
      repository.update.mockResolvedValueOnce({ id: 'inv-1' } as never);

      await service.update('inv-1', { status: InvoiceStatus.PAID }, 'clinic-1');

      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('submitClaim', () => {
    it('should submit claim after validating readiness', async () => {
      (
        claimValidationService.assertClaimReady as jest.Mock
      ).mockResolvedValueOnce(undefined as never);
      const invoice = { id: 'inv-1', status: InvoiceStatus.PAID };
      (queryService.findOne as jest.Mock).mockResolvedValueOnce(
        invoice as never,
      );

      const result = await service.submitClaim('inv-1', 'clinic-1');

      expect(result.invoiceId).toBe('inv-1');
      expect(result.claimReady).toBe(true);
    });
  });
});

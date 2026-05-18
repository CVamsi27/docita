import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { InvoicesQueryService } from './invoices-query.service';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PDFService } from './pdf.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import { InvoiceStatus } from '@workspace/db';

describe('InvoicesQueryService', () => {
  let service: InvoicesQueryService;
  let repository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    findPatientContext: jest.Mock;
    findClinicFeatureContext: jest.Mock;
  };
  let paymentSessionRepository: { findByInvoiceId: jest.Mock };
  let claimValidationService: jest.Mocked<ClaimValidationService>;
  let storageProvider: jest.Mocked<StorageProvider>;
  let storedFileUrlResolver: jest.Mocked<
    Pick<StoredFileUrlResolverService, 'resolveWithStoredUrl'>
  >;
  let pdfJobService: jest.Mocked<PdfJobService>;
  let pdfService: jest.Mocked<PDFService>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findPatientContext: jest.fn(),
      findClinicFeatureContext: jest.fn(),
    };

    paymentSessionRepository = { findByInvoiceId: jest.fn() };

    claimValidationService = Object.create(
      ClaimValidationService.prototype,
    ) as jest.Mocked<ClaimValidationService>;
    claimValidationService.evaluateClaimReadiness = jest.fn();

    storageProvider = {
      supportsSignedUrls: false,
      generateSignedUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageProvider>;

    storedFileUrlResolver = {
      resolveWithStoredUrl: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<StoredFileUrlResolverService, 'resolveWithStoredUrl'>
    >;

    pdfJobService = Object.create(
      PdfJobService.prototype,
    ) as jest.Mocked<PdfJobService>;
    pdfJobService.enqueue = jest.fn();

    pdfService = Object.create(PDFService.prototype) as jest.Mocked<PDFService>;
    pdfService.generate = jest.fn();

    service = new InvoicesQueryService(
      repository as never,
      paymentSessionRepository as never,
      pdfService,
      claimValidationService,
      storageProvider,
      storedFileUrlResolver as never,
      pdfJobService,
    );
  });

  describe('findOne', () => {
    it('should return invoice when found', async () => {
      const invoice = {
        id: 'inv-1',
        clinicId: 'clinic-1',
        status: InvoiceStatus.PENDING,
      };
      repository.findById.mockResolvedValueOnce(invoice as never);

      const result = await service.findOne('inv-1', 'clinic-1');

      expect(result).toEqual(invoice);
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      repository.findById.mockResolvedValueOnce(null as never);

      await expect(service.findOne('missing', 'clinic-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should list invoices for a clinic with invoicing feature', async () => {
      (repository.findClinicFeatureContext as jest.Mock).mockResolvedValueOnce({
        tier: 'PRO',
        intelligenceAddon: false,
        features: ['INVOICING'],
      } as never);
      const invoices = [{ id: 'inv-1' }, { id: 'inv-2' }];
      repository.findAll.mockResolvedValueOnce(invoices as never);

      const result = await service.findAll('clinic-1');

      expect(result).toEqual(invoices);
    });

    it('should throw NotFoundException when clinic does not exist', async () => {
      (repository.findClinicFeatureContext as jest.Mock).mockResolvedValueOnce(
        null as never,
      );

      await expect(service.findAll('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by patientId when provided', async () => {
      repository.findPatientContext.mockResolvedValueOnce({
        id: 'patient-1',
      } as never);
      repository.findAll.mockResolvedValueOnce([
        { id: 'inv-1', patientId: 'patient-1' },
      ] as never);

      const result = await service.findAll('clinic-1', {
        patientId: 'patient-1',
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-1' }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('listPaymentActivity', () => {
    it('should return payment sessions for an invoice', async () => {
      const invoice = { id: 'inv-1' };
      repository.findById.mockResolvedValueOnce(invoice as never);
      paymentSessionRepository.findByInvoiceId.mockResolvedValueOnce([
        {
          id: 'sess-1',
          provider: 'RAZORPAY',
          status: 'COMPLETED',
          amount: 100000,
          currency: 'INR',
          createdAt: new Date(),
          updatedAt: new Date(),
          shortUrl: null,
          paymentLink: null,
          meta: null,
        },
      ] as never);

      const result = await service.listPaymentActivity('inv-1', 'clinic-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('sess-1');
    });
  });
});

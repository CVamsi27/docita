import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { InvoicesQueryService } from './invoices-query.service';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PDFService } from './pdf.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import {
  InvoiceStatus,
  PaymentSessionStatus,
  type PaymentSession,
} from '@workspace/db';
import { collectionsByModeResponseSchema, type Clinic } from '@workspace/types';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';

function createSettledSession(
  overrides: Partial<PaymentSession> = {},
): PaymentSession {
  return {
    id: 'session-1',
    clinicId: 'clinic-1',
    invoiceId: null,
    patientId: null,
    provider: 'manual',
    providerSessionId: null,
    providerPaymentId: null,
    paymentLink: null,
    shortUrl: null,
    amount: 5000,
    currency: 'INR',
    status: PaymentSessionStatus.PAID,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    paidAt: null,
    failedAt: null,
    expiresAt: null,
    webhookPayload: null,
    meta: { channel: 'CASH' },
    whatsappSentAt: null,
    whatsappMessageId: null,
    whatsappStatus: null,
    ...overrides,
  };
}

describe('InvoicesQueryService', () => {
  let service: InvoicesQueryService;
  let repository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    findPatientContext: jest.Mock;
    findClinicFeatureContext: jest.Mock;
    findClinicReportContext: jest.Mock<
      () => Promise<Pick<Clinic, 'timezone' | 'currency'> | null>
    >;
  };
  let paymentSessionRepository: {
    findByInvoiceId: jest.Mock;
    findSettledByClinicInRange: jest.Mock<
      IPaymentSessionRepository['findSettledByClinicInRange']
    >;
  };
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
      findClinicReportContext: jest
        .fn<() => Promise<Pick<Clinic, 'timezone' | 'currency'> | null>>()
        .mockResolvedValue({ timezone: 'Asia/Kolkata', currency: 'INR' }),
    };

    paymentSessionRepository = {
      findByInvoiceId: jest.fn(),
      findSettledByClinicInRange:
        jest.fn<IPaymentSessionRepository['findSettledByClinicInRange']>(),
    };

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
        tier: 'ESSENTIAL',
        intelligenceAddon: false,
        features: {},
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

  describe('getCollectionsByMode', () => {
    it('rejects unlike currency amounts instead of returning a false total', async () => {
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [
          createSettledSession({ amount: 5000, currency: 'INR' }),
          createSettledSession({ amount: 2000, currency: 'USD' }),
        ],
      );

      await expect(
        service.getCollectionsByMode('clinic-1', {
          from: '2026-06-01',
          to: '2026-06-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('preserves one payment currency even if the clinic currency changed', async () => {
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [
          createSettledSession({ amount: 1250, currency: 'USD' }),
          createSettledSession({ amount: 2500, currency: 'USD' }),
        ],
      );

      const result = await service.getCollectionsByMode('clinic-1', {
        from: '2026-06-01',
        to: '2026-06-01',
      });

      expect(collectionsByModeResponseSchema.parse(result)).toEqual({
        from: '2026-06-01',
        to: '2026-06-01',
        currency: 'USD',
        count: 2,
        totalCents: 3750,
        byMode: [{ mode: 'CASH', label: 'Cash', count: 2, amountCents: 3750 }],
      });
    });

    it('labels an empty report with the canonical clinic currency', async () => {
      repository.findClinicReportContext.mockResolvedValueOnce({
        timezone: 'UTC',
        currency: 'USD',
      });
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [],
      );

      const result = await service.getCollectionsByMode('clinic-1', {
        from: '2026-06-01',
        to: '2026-06-01',
      });

      expect(collectionsByModeResponseSchema.parse(result)).toEqual({
        from: '2026-06-01',
        to: '2026-06-01',
        currency: 'USD',
        count: 0,
        totalCents: 0,
        byMode: [],
      });
    });

    it.each([
      {
        timezone: 'Asia/Kolkata',
        day: '2026-06-01',
        beforeStart: '2026-05-31T18:29:59.999Z',
        start: '2026-05-31T18:30:00.000Z',
        beforeEnd: '2026-06-01T18:29:59.999Z',
        end: '2026-06-01T18:30:00.000Z',
      },
      {
        timezone: 'America/New_York',
        day: '2026-03-08',
        beforeStart: '2026-03-08T04:59:59.999Z',
        start: '2026-03-08T05:00:00.000Z',
        beforeEnd: '2026-03-09T03:59:59.999Z',
        end: '2026-03-09T04:00:00.000Z',
      },
      {
        timezone: 'America/New_York',
        day: '2026-11-01',
        beforeStart: '2026-11-01T03:59:59.999Z',
        start: '2026-11-01T04:00:00.000Z',
        beforeEnd: '2026-11-02T04:59:59.999Z',
        end: '2026-11-02T05:00:00.000Z',
      },
    ])(
      'includes only the clinic calendar day in $timezone on $day',
      async (bounds) => {
        repository.findClinicReportContext.mockResolvedValueOnce({
          timezone: bounds.timezone,
          currency: 'INR',
        });
        const sessions = [
          createSettledSession({
            amount: 100,
            createdAt: new Date(bounds.beforeStart),
          }),
          createSettledSession({
            amount: 200,
            createdAt: new Date(bounds.start),
          }),
          createSettledSession({
            amount: 400,
            createdAt: new Date(bounds.beforeEnd),
          }),
          createSettledSession({
            amount: 800,
            createdAt: new Date(bounds.end),
          }),
        ];
        paymentSessionRepository.findSettledByClinicInRange.mockImplementationOnce(
          async (clinicId, from, to) =>
            sessions.filter(
              (session) =>
                session.clinicId === clinicId &&
                session.createdAt >= from &&
                session.createdAt < to,
            ),
        );

        const result = await service.getCollectionsByMode('clinic-1', {
          from: bounds.day,
          to: bounds.day,
        });

        expect(result.totalCents).toBe(600);
        expect(result.count).toBe(2);
      },
    );

    it('rejects an impossible calendar date instead of normalizing it to March', async () => {
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [],
      );

      await expect(
        service.getCollectionsByMode('clinic-1', {
          from: '2026-02-30',
          to: '2026-02-30',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown clinic instead of returning an empty financial report', async () => {
      repository.findClinicReportContext.mockResolvedValueOnce(null);
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [],
      );

      await expect(
        service.getCollectionsByMode('missing-clinic', {
          from: '2026-06-01',
          to: '2026-06-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('groups settled payments by channel and totals them', async () => {
      paymentSessionRepository.findSettledByClinicInRange.mockResolvedValueOnce(
        [
          {
            provider: 'manual',
            amount: 5000,
            currency: 'INR',
            meta: { channel: 'CASH' },
          },
          {
            provider: 'manual',
            amount: 3000,
            currency: 'INR',
            meta: { channel: 'UPI_QR' },
          },
          {
            provider: 'manual',
            amount: 2000,
            currency: 'INR',
            meta: { channel: 'CASH' },
          },
          // Razorpay capture with no channel → bucketed as online
          {
            provider: 'razorpay',
            amount: 1000,
            currency: 'INR',
            meta: null,
          },
        ] as never,
      );

      const result = await service.getCollectionsByMode('clinic-1', {
        from: '2026-06-01',
        to: '2026-06-08',
      });

      expect(result.totalCents).toBe(11000);
      expect(result.count).toBe(4);
      // Sorted by amount desc: CASH 7000, UPI 3000, online 1000
      expect(result.byMode.map((row) => row.mode)).toEqual([
        'CASH',
        'UPI_QR',
        'OTHER_ONLINE',
      ]);
      const cash = result.byMode.find((row) => row.mode === 'CASH');
      expect(cash).toEqual({
        mode: 'CASH',
        label: 'Cash',
        count: 2,
        amountCents: 7000,
      });
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.getCollectionsByMode('clinic-1', {
          from: '2026-06-08',
          to: '2026-06-01',
        }),
      ).rejects.toThrow();
    });
  });
});

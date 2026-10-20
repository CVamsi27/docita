import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PublicPatientDocumentsService } from './public-patient-documents.service';
import { PublicDocumentTokenService } from './public-document-token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { getCurrentTenant } from '@/shared/common/middleware/tenant.middleware';
import { RlsService } from '@/shared/modules/rls/rls.service';
import { activeTxStorage } from '@/shared/modules/rls/active-tx.storage';

const TEST_SECRET = 'a-32-char-secret-for-testing-only!!';

function createTokenService(): PublicDocumentTokenService {
  return new PublicDocumentTokenService({
    getPublicDocumentSigningSecret: () => TEST_SECRET,
  } as never);
}

// Prisma queries start when their thenable is consumed, not when the delegate is called.
function deferredQuery<T>(query: () => T): PromiseLike<T> {
  return {
    then(onFulfilled, onRejected) {
      return Promise.resolve().then(query).then(onFulfilled, onRejected);
    },
  };
}

describe('PublicPatientDocumentsService', () => {
  const transaction = {};
  const prisma = {
    runUnrestricted: PrismaService.prototype.runUnrestricted,
    $transaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) =>
      fn(transaction),
    prescription: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn() },
    paymentSession: { findUnique: jest.fn() },
  };
  const tokenService = createTokenService();
  const rls = new RlsService(
    prisma as never,
    {
      isRlsEnabled: () => false,
    } as never,
  );
  const storageProvider = { getObject: jest.fn() };
  const prescriptionPdfOrchestrator = { generatePDF: jest.fn() };
  const invoicesService = {
    generatePDF: jest.fn(),
    findOne: jest.fn(),
    uploadAndPersist: jest.fn(),
  };

  let service: PublicPatientDocumentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PublicPatientDocumentsService(
      prisma as never,
      tokenService,
      storageProvider as never,
      prescriptionPdfOrchestrator as never,
      invoicesService as never,
      rls,
    );
  });

  describe('getPrescriptionPdf', () => {
    const ipAddress = '127.0.0.1';
    const userAgent = 'test-agent';

    it('returns buffer from R2 when pdfUrl exists', async () => {
      const token = tokenService.sign('prescription', 'rx-123');
      prisma.prescription.findUnique.mockResolvedValue({
        pdfUrl: 'pdfs/prescriptions/rx-123.pdf',
        clinicId: 'clinic-1',
        appointment: null,
      });
      storageProvider.getObject.mockResolvedValue({
        buffer: Buffer.from('pdf-data'),
        contentType: 'application/pdf',
      });

      const result = await service.getPrescriptionPdf(
        token,
        ipAddress,
        userAgent,
      );

      expect(storageProvider.getObject).toHaveBeenCalledWith(
        'pdfs/prescriptions/rx-123.pdf',
      );
      expect(result).toEqual({
        buffer: expect.any(Buffer),
        filename: 'prescription-rx-123.pdf',
        contentType: 'application/pdf',
      });
    });

    it('generates PDF on-demand when no pdfUrl exists', async () => {
      const token = tokenService.sign('prescription', 'rx-456');
      prisma.prescription.findUnique.mockResolvedValue({
        pdfUrl: null,
        clinicId: 'clinic-1',
        appointment: null,
      });
      prescriptionPdfOrchestrator.generatePDF.mockResolvedValue(
        Buffer.from('generated-pdf'),
      );

      const result = await service.getPrescriptionPdf(
        token,
        ipAddress,
        userAgent,
      );

      expect(prescriptionPdfOrchestrator.generatePDF).toHaveBeenCalledWith(
        'rx-456',
        'clinic-1',
      );
      expect(result).toEqual({
        buffer: expect.any(Buffer),
        filename: 'prescription-rx-456.pdf',
        contentType: 'application/pdf',
      });
    });

    it('resolves clinicId from appointment when prescription.clinicId is null', async () => {
      const token = tokenService.sign('prescription', 'rx-789');
      prisma.prescription.findUnique.mockResolvedValue({
        pdfUrl: 'pdfs/prescriptions/rx-789.pdf',
        clinicId: null,
        appointment: { clinicId: 'appt-clinic' },
      });
      storageProvider.getObject.mockResolvedValue({
        buffer: Buffer.from('pdf-data'),
        contentType: 'application/pdf',
      });

      await service.getPrescriptionPdf(token, ipAddress, userAgent);

      expect(storageProvider.getObject).toHaveBeenCalledWith(
        'pdfs/prescriptions/rx-789.pdf',
      );
    });

    it('throws when HMAC token is invalid', async () => {
      await expect(
        service.getPrescriptionPdf('invalid-token', ipAddress, userAgent),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.prescription.findUnique).not.toHaveBeenCalled();
      expect(storageProvider.getObject).not.toHaveBeenCalled();
    });

    it('throws when token type is wrong', async () => {
      const token = tokenService.sign('invoice', 'inv-123');
      prisma.prescription.findUnique.mockResolvedValue(null);

      await expect(
        service.getPrescriptionPdf(token, ipAddress, userAgent),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.prescription.findUnique).not.toHaveBeenCalled();
    });

    it('throws when prescription is missing', async () => {
      const token = tokenService.sign('prescription', 'rx-missing');
      prisma.prescription.findUnique.mockResolvedValue(null);

      await expect(
        service.getPrescriptionPdf(token, ipAddress, userAgent),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getInvoicePdf', () => {
    const ipAddress = '10.0.0.1';
    const userAgent = 'invoice-test-agent';

    it('returns buffer from R2 when pdfUrl exists', async () => {
      const token = tokenService.sign('invoice', 'inv-123');
      prisma.invoice.findUnique.mockResolvedValue({
        pdfUrl: 'pdfs/invoices/inv-123.pdf',
        clinicId: 'clinic-1',
        appointment: null,
      });
      storageProvider.getObject.mockResolvedValue({
        buffer: Buffer.from('invoice-pdf'),
        contentType: 'application/pdf',
      });

      const result = await service.getInvoicePdf(token, ipAddress, userAgent);

      expect(storageProvider.getObject).toHaveBeenCalledWith(
        'pdfs/invoices/inv-123.pdf',
      );
      expect(result).toEqual({
        buffer: expect.any(Buffer),
        filename: 'invoice-inv-123.pdf',
        contentType: 'application/pdf',
      });
    });

    it('generates and uploads PDF on-demand when no pdfUrl exists', async () => {
      const token = tokenService.sign('invoice', 'inv-456');
      prisma.invoice.findUnique.mockResolvedValue({
        pdfUrl: null,
        clinicId: 'clinic-2',
        appointment: null,
      });
      invoicesService.generatePDF.mockResolvedValue(
        Buffer.from('generated-invoice'),
      );
      invoicesService.findOne.mockResolvedValue({ id: 'inv-456' });

      const result = await service.getInvoicePdf(token, ipAddress, userAgent);

      expect(invoicesService.generatePDF).toHaveBeenCalledWith(
        'inv-456',
        'clinic-2',
      );
      expect(invoicesService.uploadAndPersist).toHaveBeenCalledWith(
        'inv-456',
        'clinic-2',
        expect.any(Buffer),
        { id: 'inv-456' },
      );
      expect(result).toEqual({
        buffer: expect.any(Buffer),
        filename: 'invoice-inv-456.pdf',
        contentType: 'application/pdf',
      });
    });

    it('throws when token type is wrong', async () => {
      const token = tokenService.sign('prescription', 'rx-123');

      await expect(
        service.getInvoicePdf(token, ipAddress, userAgent),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
    });

    it('throws when invoice is missing', async () => {
      const token = tokenService.sign('invoice', 'inv-missing');
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.getInvoicePdf(token, ipAddress, userAgent),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolvePaymentRedirectUrl', () => {
    it('resolves an anonymous payment capability without leaking a tenant bypass to its caller', async () => {
      prisma.paymentSession.findUnique.mockImplementation(() =>
        deferredQuery(() => {
          if (!getCurrentTenant()?.bypassed) {
            throw new Error('PaymentSession requires a tenant context');
          }
          return {
            shortUrl: 'https://rzp.io/l/anonymous-capability',
            paymentLink: null,
            status: 'CREATED',
          };
        }),
      );

      await expect(service.resolvePaymentRedirectUrl('pay-1')).resolves.toBe(
        'https://rzp.io/l/anonymous-capability',
      );
      expect(getCurrentTenant()).toBeUndefined();
    });

    it('redirects to Razorpay when payment session is active', async () => {
      prisma.paymentSession.findUnique.mockResolvedValue({
        shortUrl: 'https://rzp.io/l/abc',
        paymentLink: null,
        status: 'CREATED',
      });

      await expect(service.resolvePaymentRedirectUrl('pay-1')).resolves.toBe(
        'https://rzp.io/l/abc',
      );
    });

    it('rejects captured payment sessions', async () => {
      prisma.paymentSession.findUnique.mockResolvedValue({
        shortUrl: 'https://rzp.io/l/abc',
        paymentLink: null,
        status: 'CAPTURED',
      });

      await expect(
        service.resolvePaymentRedirectUrl('pay-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects expired payment sessions', async () => {
      prisma.paymentSession.findUnique.mockResolvedValue({
        shortUrl: 'https://rzp.io/l/abc',
        paymentLink: null,
        status: 'EXPIRED',
      });

      await expect(
        service.resolvePaymentRedirectUrl('pay-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when session not found', async () => {
      prisma.paymentSession.findUnique.mockResolvedValue(null);

      await expect(
        service.resolvePaymentRedirectUrl('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when no redirect URL is available', async () => {
      prisma.paymentSession.findUnique.mockResolvedValue({
        shortUrl: null,
        paymentLink: null,
        status: 'CREATED',
      });

      await expect(
        service.resolvePaymentRedirectUrl('pay-2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('generates a signed prescription PDF within the resolved clinic, without retaining its lookup bypass', async () => {
    const token = tokenService.sign('prescription', 'rx-scoped');
    prisma.prescription.findUnique.mockImplementation(() =>
      deferredQuery(() => {
        if (!getCurrentTenant()?.bypassed) {
          throw new Error('Prescription requires a tenant context');
        }
        return { pdfUrl: null, clinicId: 'clinic-scoped', appointment: null };
      }),
    );
    prescriptionPdfOrchestrator.generatePDF.mockImplementation(async () => {
      const tenant = getCurrentTenant();
      if (tenant?.clinicId !== 'clinic-scoped' || tenant.bypassed) {
        throw new Error('PDF generation requires the resolved clinic');
      }
      expect(activeTxStorage.getStore()?.tx).toBe(transaction);
      return Buffer.from('scoped-prescription-pdf');
    });

    await expect(
      service.getPrescriptionPdf(token, '127.0.0.1', 'test-agent'),
    ).resolves.toMatchObject({
      buffer: Buffer.from('scoped-prescription-pdf'),
    });
    expect(getCurrentTenant()).toBeUndefined();
    expect(activeTxStorage.getStore()).toBeUndefined();
  });

  it('generates and persists a signed invoice PDF within the resolved clinic', async () => {
    const token = tokenService.sign('invoice', 'inv-scoped');
    prisma.invoice.findUnique.mockImplementation(() =>
      deferredQuery(() => {
        if (!getCurrentTenant()?.bypassed) {
          throw new Error('Invoice requires a tenant context');
        }
        return { pdfUrl: null, clinicId: 'clinic-scoped', appointment: null };
      }),
    );
    const ensureClinic = () => {
      const tenant = getCurrentTenant();
      if (tenant?.clinicId !== 'clinic-scoped' || tenant.bypassed) {
        throw new Error('Invoice PDF requires the resolved clinic');
      }
      expect(activeTxStorage.getStore()?.tx).toBe(transaction);
    };
    invoicesService.generatePDF.mockImplementation(async () => {
      ensureClinic();
      return Buffer.from('scoped-invoice-pdf');
    });
    invoicesService.findOne.mockImplementation(async () => {
      ensureClinic();
      return { id: 'inv-scoped' };
    });
    invoicesService.uploadAndPersist.mockImplementation(async () => {
      ensureClinic();
    });

    await expect(
      service.getInvoicePdf(token, '127.0.0.1', 'test-agent'),
    ).resolves.toMatchObject({ buffer: Buffer.from('scoped-invoice-pdf') });
    expect(getCurrentTenant()).toBeUndefined();
    expect(activeTxStorage.getStore()).toBeUndefined();
  });

  it.each(['prescription', 'invoice'] as const)(
    'retains the failed-access audit when scoped %s generation rejects',
    async (type) => {
      const token = tokenService.sign(type, 'document-failed');
      const failure = new Error('Synthetic renderer unavailable');
      prisma.prescription.findUnique.mockResolvedValue({
        pdfUrl: null,
        clinicId: 'clinic-scoped',
        appointment: null,
      });
      prisma.invoice.findUnique.mockResolvedValue({
        pdfUrl: null,
        clinicId: 'clinic-scoped',
        appointment: null,
      });
      prescriptionPdfOrchestrator.generatePDF.mockRejectedValue(failure);
      invoicesService.generatePDF.mockRejectedValue(failure);
      const log = jest.spyOn(Logger.prototype, 'log');

      try {
        const result =
          type === 'prescription'
            ? service.getPrescriptionPdf(token, '127.0.0.1', 'test-agent')
            : service.getInvoicePdf(token, '127.0.0.1', 'test-agent');
        await expect(result).rejects.toBe(failure);
        expect(log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'PUBLIC_DOCUMENT_ACCESS',
            type,
            documentId: 'document-failed',
            success: false,
          }),
        );
        expect(getCurrentTenant()).toBeUndefined();
        expect(activeTxStorage.getStore()).toBeUndefined();
      } finally {
        log.mockRestore();
      }
    },
  );
});

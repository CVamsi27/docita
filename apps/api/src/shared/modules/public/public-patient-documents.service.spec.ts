import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicPatientDocumentsService } from './public-patient-documents.service';
import { PublicDocumentTokenService } from './public-document-token.service';

const TEST_SECRET = 'a-32-char-secret-for-testing-only!!';

function createTokenService(): PublicDocumentTokenService {
  return new PublicDocumentTokenService({
    getPublicDocumentSigningSecret: () => TEST_SECRET,
  } as never);
}

describe('PublicPatientDocumentsService', () => {
  const prisma = {
    prescription: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn() },
    paymentSession: { findUnique: jest.fn() },
  };
  const tokenService = createTokenService();
  const storageProvider = { getObject: jest.fn() };
  const prescriptionPdfOrchestrator = { generatePDF: jest.fn() };
  const invoicesQueryService = {
    generatePDF: jest.fn(),
    findOne: jest.fn(),
  };
  const invoicesCommandService = { uploadAndPersist: jest.fn() };

  let service: PublicPatientDocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicPatientDocumentsService(
      prisma as never,
      tokenService,
      storageProvider as never,
      prescriptionPdfOrchestrator as never,
      invoicesQueryService as never,
      invoicesCommandService as never,
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
    });

    it('throws when token type is wrong', async () => {
      const token = tokenService.sign('invoice', 'inv-123');
      prisma.prescription.findUnique.mockResolvedValue(null);

      await expect(
        service.getPrescriptionPdf(token, ipAddress, userAgent),
      ).rejects.toBeInstanceOf(NotFoundException);
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
      invoicesQueryService.generatePDF.mockResolvedValue(
        Buffer.from('generated-invoice'),
      );
      invoicesQueryService.findOne.mockResolvedValue({ id: 'inv-456' });

      const result = await service.getInvoicePdf(token, ipAddress, userAgent);

      expect(invoicesQueryService.generatePDF).toHaveBeenCalledWith(
        'inv-456',
        'clinic-2',
      );
      expect(invoicesCommandService.uploadAndPersist).toHaveBeenCalledWith(
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
});

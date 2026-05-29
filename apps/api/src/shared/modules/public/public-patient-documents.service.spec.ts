import { NotFoundException } from '@nestjs/common';
import { PaymentSessionStatus } from '@workspace/db';
import { PublicPatientDocumentsService } from './public-patient-documents.service';

describe('PublicPatientDocumentsService', () => {
  const prisma = {
    prescription: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn() },
    paymentSession: { findUnique: jest.fn() },
  };
  const prescriptionsService = { getPdf: jest.fn() };
  const invoicesService = { getPdf: jest.fn() };

  let service: PublicPatientDocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicPatientDocumentsService(
      prisma as never,
      prescriptionsService as never,
      invoicesService as never,
    );
  });

  it('streams prescription PDF when clinic id is on the appointment', async () => {
    prisma.prescription.findUnique.mockResolvedValue({
      clinicId: null,
      appointment: { clinicId: 'clinic-1' },
    });
    prescriptionsService.getPdf.mockResolvedValue({
      type: 'buffer',
      buffer: Buffer.from('pdf'),
    });

    const result = await service.getPrescriptionPdf('rx-1');

    expect(prescriptionsService.getPdf).toHaveBeenCalledWith(
      'rx-1',
      'clinic-1',
    );
    expect(result).toEqual({
      type: 'buffer',
      buffer: expect.any(Buffer),
      filename: 'prescription-rx-1.pdf',
    });
  });

  it('throws when prescription is missing', async () => {
    prisma.prescription.findUnique.mockResolvedValue(null);

    await expect(service.getPrescriptionPdf('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('redirects to Razorpay when payment session is active', async () => {
    prisma.paymentSession.findUnique.mockResolvedValue({
      shortUrl: 'https://rzp.io/l/abc',
      paymentLink: null,
      status: PaymentSessionStatus.CREATED,
    });

    await expect(service.resolvePaymentRedirectUrl('pay-1')).resolves.toBe(
      'https://rzp.io/l/abc',
    );
  });

  it('rejects captured payment sessions', async () => {
    prisma.paymentSession.findUnique.mockResolvedValue({
      shortUrl: 'https://rzp.io/l/abc',
      paymentLink: null,
      status: PaymentSessionStatus.CAPTURED,
    });

    await expect(
      service.resolvePaymentRedirectUrl('pay-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

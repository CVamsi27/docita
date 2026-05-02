import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceStatus, Prisma } from '@workspace/db';
import {
  ClaimReadinessResult,
  ClaimValidationService,
} from '@/domains/billing/core/services/claim-validation.service';
import {
  IInvoiceRepository,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PDFService, InvoiceData } from './pdf.service';
import { InvoicesService } from './invoices.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';

describe('InvoicesService', () => {
  const baseDate = new Date('2026-01-01T00:00:00.000Z');

  const repository: jest.Mocked<IInvoiceRepository> = {
    findAll: jest.fn<IInvoiceRepository['findAll']>(),
    findById: jest.fn<IInvoiceRepository['findById']>(),
    create: jest.fn<IInvoiceRepository['create']>(),
    update: jest.fn<IInvoiceRepository['update']>(),
    delete: jest.fn<IInvoiceRepository['delete']>(),
    findPatientContext: jest.fn<IInvoiceRepository['findPatientContext']>(),
    nextInvoiceNumber: jest.fn<IInvoiceRepository['nextInvoiceNumber']>(),
  };

  const pdfService = Object.create(PDFService.prototype) as PDFService;
  const generatePdfMock = jest.fn<(data: InvoiceData) => Promise<Buffer>>();
  pdfService.generate = generatePdfMock;
  const taxCalculator = new TaxCalculatorService();

  const eventEmitter = new EventEmitter2();

  const usageTracking = Object.create(
    UsageTrackingService.prototype,
  ) as UsageTrackingService;
  usageTracking.trackInvoice = jest
    .fn<UsageTrackingService['trackInvoice']>()
    .mockResolvedValue(undefined);

  class MockStorageProvider extends StorageProvider {
    readonly supportsSignedUrls = false;
    upload = jest.fn<StorageProvider['upload']>();
    delete = jest.fn<StorageProvider['delete']>();
    uploadBuffer = jest.fn<StorageProvider['uploadBuffer']>();
    generateSignedUrl = jest.fn<StorageProvider['generateSignedUrl']>();
  }

  const storageProvider = new MockStorageProvider();

  const storedFileUrlResolver: Pick<
    StoredFileUrlResolverService,
    'resolveWithStoredUrl'
  > = {
    resolveWithStoredUrl: jest
      .fn<StoredFileUrlResolverService['resolveWithStoredUrl']>()
      .mockImplementation(async (url) => ({
        url: url ?? null,
        storedUrl: url ?? null,
      })),
  };

  const claimValidationService = Object.create(
    ClaimValidationService.prototype,
  ) as ClaimValidationService;
  const assertClaimReadyMock =
    jest.fn<ClaimValidationService['assertClaimReady']>();
  const evaluateClaimReadinessMock =
    jest.fn<ClaimValidationService['evaluateClaimReadiness']>();
  claimValidationService.assertClaimReady = assertClaimReadyMock;
  claimValidationService.evaluateClaimReadiness = evaluateClaimReadinessMock;

  const buildClaimReadinessResult = (
    invoiceId: string,
    clinicReady: boolean,
  ): ClaimReadinessResult => ({
    invoiceId,
    appointmentId: null,
    requiresClinicalCoding: false,
    claimReady: clinicReady,
    issues: [],
    summary: {
      diagnoses: 0,
      procedures: 0,
      uncodedDiagnoses: 0,
      uncodedProcedures: 0,
    },
  });

  const buildInvoice = (
    id: string,
    overrides: Partial<InvoiceDetail> = {},
  ): InvoiceDetail => ({
    id,
    patientId: `patient-${id}`,
    clinicId: 'clinic-1',
    invoiceNumber: null,
    invoiceType: 'BILL_OF_SUPPLY',
    currency: 'INR',
    total: 100,
    subtotal: 100,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 100,
    taxSummary: null,
    sellerTaxSnapshot: null,
    buyerTaxSnapshot: null,
    placeOfSupplyStateCode: null,
    placeOfSupplyStateName: null,
    reverseCharge: false,
    issuedAt: baseDate,
    dueDate: null,
    eInvoiceRequired: false,
    eInvoiceIrn: null,
    eInvoiceQrCode: null,
    eInvoiceAcknowledgedAt: null,
    status: InvoiceStatus.PENDING,
    items: [] as Prisma.JsonValue,
    doctorName: null,
    doctorEmail: null,
    doctorPhone: null,
    doctorSpecialization: null,
    doctorRegistrationNumber: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    pdfUrl: null,
    pdfGeneratedAt: null,
    pdfTemplateVersion: 1,
    patient: {
      id: `patient-${id}`,
      firstName: 'Asha',
      lastName: 'Rao',
      phoneNumber: '9999999999',
      email: null,
      address: null,
      clinic: {
        id: 'clinic-1',
        name: 'Docita Clinic',
        address: 'Main Road',
        phone: '1234567890',
        email: 'clinic@test.com',
        logo: null,
        currency: 'INR',
        branding: null,
        slaSignatureUrl: null,
        settings: null,
      },
    },
    appointment: null,
    ...overrides,
  });

  let service: InvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();

    evaluateClaimReadinessMock.mockResolvedValue(
      buildClaimReadinessResult('invoice-default', true),
    );

    service = new InvoicesService(
      repository,
      pdfService,
      taxCalculator,
      eventEmitter,
      usageTracking,
      storageProvider,
      claimValidationService,
      storedFileUrlResolver,
      {
        enqueue: async () => ({
          jobId: 'job-1',
          status: 'PENDING' as const,
          pollUrl: '/api/v1/invoices/inv-1/pdf/status?jobId=job-1',
        }),
        getStatus: async () => ({
          jobId: 'job-1',
          status: 'PENDING' as const,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      } satisfies PdfJobServicePort,
    );
  });

  it('validates claim readiness before finalized status transitions', async () => {
    repository.findById.mockResolvedValue(buildInvoice('inv-1'));
    repository.update.mockResolvedValue(
      buildInvoice('inv-1', { status: InvoiceStatus.PAID }),
    );
    assertClaimReadyMock.mockResolvedValue();

    await service.update('inv-1', { status: InvoiceStatus.PAID }, 'clinic-1');

    expect(assertClaimReadyMock).toHaveBeenCalledWith('inv-1', 'clinic-1');
    expect(repository.update).toHaveBeenCalled();
  });

  it('does not validate claim readiness for non-finalized updates', async () => {
    repository.findById.mockResolvedValue(buildInvoice('inv-2'));
    repository.update.mockResolvedValue(
      buildInvoice('inv-2', { total: 150, status: InvoiceStatus.PENDING }),
    );

    await service.update('inv-2', { total: 150 }, 'clinic-1');

    expect(assertClaimReadyMock).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it('recalculates invoice totals server-side when creating GST invoices', async () => {
    repository.findPatientContext.mockResolvedValue({
      id: 'patient-1',
      firstName: 'Asha',
      lastName: 'Rao',
      phoneNumber: '9999999999',
      email: null,
      address: 'Bengaluru',
      clinicId: 'clinic-1',
      clinic: {
        id: 'clinic-1',
        name: 'Docita Clinic',
        address: 'Main Road',
        phone: '1234567890',
        email: 'clinic@test.com',
        currency: 'INR',
        settings: {
          gstin: '29ABCDE1234F1Z5',
          taxSettings: {
            countryCode: 'IN',
            regime: 'IN_GST',
            stateCode: '29',
          },
        } as Prisma.JsonObject,
      },
    });
    repository.nextInvoiceNumber.mockResolvedValue('DC2526-000001');
    repository.create.mockResolvedValue(
      buildInvoice('created', {
        invoiceNumber: 'DC2526-000001',
        invoiceType: 'TAX_INVOICE',
        total: 118,
        subtotal: 100,
        taxTotal: 18,
        grandTotal: 118,
      }),
    );

    await service.create({
      patientId: 'patient-1',
      clinicId: 'clinic-1',
      total: 1,
      status: InvoiceStatus.PENDING,
      items: [
        {
          description: 'Taxable device',
          quantity: 1,
          price: 100,
          taxTreatment: 'TAXABLE',
          taxRate: 18,
        },
      ],
    });

    const createData = repository.create.mock.calls[0][0];
    expect(createData.total).toBe(118);
    expect(createData.subtotal).toBe(100);
    expect(createData.taxTotal).toBe(18);
    expect(createData.grandTotal).toBe(118);
    expect(createData.totalCents).toBe(11800);
    expect(createData.subtotalCents).toBe(10000);
    expect(createData.taxTotalCents).toBe(1800);
    expect(createData.grandTotalCents).toBe(11800);
    expect(createData.invoiceType).toBe('TAX_INVOICE');
    expect(createData.lineItems).toEqual({
      create: [
        expect.objectContaining({
          description: 'Taxable device',
          quantity: 1,
          unitPriceCents: 10000,
          subtotalCents: 10000,
          taxRateBps: 1800,
          taxCents: 1800,
          totalCents: 11800,
          clinic: { connect: { id: 'clinic-1' } },
        }),
      ],
    });
    expect(repository.nextInvoiceNumber).toHaveBeenCalledWith(
      'clinic-1',
      expect.any(Date),
      'DC',
    );
  });

  it('submitClaim asserts readiness and returns submission payload', async () => {
    assertClaimReadyMock.mockResolvedValue();
    repository.findById.mockResolvedValue(buildInvoice('inv-3'));

    const result = await service.submitClaim('inv-3', 'clinic-1');

    expect(assertClaimReadyMock).toHaveBeenCalledWith('inv-3', 'clinic-1');
    expect(result.invoiceId).toBe('inv-3');
    expect(result.claimReady).toBe(true);
    expect(result.status).toBe(InvoiceStatus.PENDING);
  });

  it('includes clinic SLA signature in invoice PDF payload when present', async () => {
    repository.findById.mockResolvedValue(
      buildInvoice('inv-4', {
        doctorName: 'Dr. Asha',
        items: [
          {
            id: 'item-1',
            description: 'Consultation',
            quantity: 1,
            price: 100,
          },
        ] as Prisma.JsonValue,
        patient: {
          id: 'pat-4',
          firstName: 'Asha',
          lastName: 'Rao',
          phoneNumber: '9999999999',
          email: null,
          address: null,
          clinic: {
            id: 'clinic-1',
            name: 'Docita Clinic',
            address: 'Main Road',
            phone: '1234567890',
            email: 'clinic@test.com',
            logo: null,
            currency: 'INR',
            branding: null,
            slaSignatureUrl: 'https://example.com/admin-signature.png',
            settings: null,
          },
        },
      }),
    );

    generatePdfMock.mockResolvedValue(Buffer.from('pdf'));

    await service.generatePDF('inv-4', 'clinic-1');

    expect(generatePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSignatureUrl: 'https://example.com/admin-signature.png',
        authorizedSignatureLabel: 'Authorized Signature',
      }),
    );
  });

  it('keeps invoice PDF generation working when clinic SLA signature is missing', async () => {
    repository.findById.mockResolvedValue(
      buildInvoice('inv-5', {
        doctorName: 'Dr. Asha',
        items: [
          {
            id: 'item-2',
            description: 'Consultation',
            quantity: 1,
            price: 100,
          },
        ] as Prisma.JsonValue,
      }),
    );

    generatePdfMock.mockResolvedValue(Buffer.from('pdf'));

    await service.generatePDF('inv-5', 'clinic-1');

    expect(generatePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedSignatureUrl: undefined,
      }),
    );
  });
});

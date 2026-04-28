import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InvoicePdfProcessor } from './invoice-pdf.processor';
import {
  JobNames,
  QueueJob,
  QueueJobData,
  GeneratePdfJobData,
  QueueJobHandler,
  IQueueProvider,
} from '@/shared/modules/queue/queue.interface';
import type { InvoicePdfProcessorPort } from './invoice-pdf.processor';
import type { InvoicesService } from './invoices.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import type { PdfJobProcessorPrismaPort } from '@/shared/modules/queue/pdf-job.service';
import { InvoiceStatus } from '@workspace/db';
import type { InvoiceDetail } from '@/domains/billing/core/repositories/invoice.repository';

const makeJob = (
  overrides: Partial<GeneratePdfJobData> = {},
  jobOverrides: {
    attemptsMade?: number;
    maxAttempts?: number;
  } = {},
): QueueJob<GeneratePdfJobData> => ({
  id: 'job-1',
  name: JobNames.GENERATE_INVOICE_PDF,
  data: {
    documentId: 'inv-1',
    documentType: 'invoice',
    clinicId: 'clinic-1',
    pdfJobId: 'pdf-job-1',
    ...overrides,
  },
  progress: 0,
  attemptsMade: jobOverrides.attemptsMade ?? 0,
  maxAttempts: jobOverrides.maxAttempts ?? 1,
  timestamp: Date.now(),
});

const buildInvoiceDetail = (
  overrides: Partial<InvoiceDetail> = {},
): InvoiceDetail => ({
  id: 'inv-1',
  patientId: 'patient-1',
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
  issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  dueDate: null,
  eInvoiceRequired: false,
  eInvoiceIrn: null,
  eInvoiceQrCode: null,
  eInvoiceAcknowledgedAt: null,
  status: InvoiceStatus.PENDING,
  items: [],
  doctorName: 'Dr. Queue',
  doctorEmail: null,
  doctorPhone: null,
  doctorSpecialization: null,
  doctorRegistrationNumber: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  pdfUrl: null,
  pdfGeneratedAt: null,
  pdfTemplateVersion: 1,
  patient: null,
  appointment: null,
  ...overrides,
});

describe('InvoicePdfProcessor', () => {
  const findOneMock = jest.fn<InvoicesService['findOne']>();
  const generatePDFMock = jest.fn<InvoicesService['generatePDF']>();
  const uploadAndPersistMock = jest.fn<InvoicesService['uploadAndPersist']>();

  const invoicesService: InvoicePdfProcessorPort = {
    findOne: findOneMock,
    generatePDF: generatePDFMock,
    uploadAndPersist: uploadAndPersistMock,
  };

  const pdfJobUpdateMock =
    jest.fn<PdfJobProcessorPrismaPort['pdfJob']['update']>();
  const prisma: PdfJobProcessorPrismaPort = {
    runUnrestricted: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    pdfJob: { update: pdfJobUpdateMock },
  };

  const generateSignedUrlMock = jest.fn<StorageProvider['generateSignedUrl']>();

  class MockStorage extends StorageProvider {
    readonly supportsSignedUrls = true;
    upload = jest.fn<StorageProvider['upload']>();
    delete = jest.fn<StorageProvider['delete']>();
    uploadBuffer = jest.fn<StorageProvider['uploadBuffer']>();
    generateSignedUrl = generateSignedUrlMock;
  }

  const storageProvider = new MockStorage();

  const processMock = jest.fn(
    async <T extends QueueJobData>(
      _name: string,
      _handler: QueueJobHandler<T>,
    ): Promise<void> => undefined,
  );

  const queue: Pick<IQueueProvider, 'process'> = { process: processMock };

  let processor: InvoicePdfProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    pdfJobUpdateMock.mockResolvedValue(undefined);
    processor = new InvoicePdfProcessor(
      prisma,
      invoicesService,
      storageProvider,
      queue,
    );
  });

  it('registers a handler for GENERATE_INVOICE_PDF on init (memory queue / worker)', () => {
    delete process.env.QUEUE_BACKEND;
    delete process.env.ENABLE_SCHEDULERS;
    processor.onModuleInit();

    expect(processMock).toHaveBeenCalledWith(
      JobNames.GENERATE_INVOICE_PDF,
      expect.any(Function),
    );

    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));
  });

  it('registers a handler when QUEUE_BACKEND=postgres and WORKER_ENTRYPOINT=worker', () => {
    process.env.QUEUE_BACKEND = 'postgres';
    process.env.WORKER_ENTRYPOINT = 'worker';
    delete process.env.ENABLE_SCHEDULERS;
    processor.onModuleInit();

    expect(processMock).toHaveBeenCalledWith(
      JobNames.GENERATE_INVOICE_PDF,
      expect.any(Function),
    );

    delete process.env.QUEUE_BACKEND;
    delete process.env.WORKER_ENTRYPOINT;
  });

  it('skips handler registration when ENABLE_SCHEDULERS=false', () => {
    process.env.ENABLE_SCHEDULERS = 'false';
    processor.onModuleInit();

    expect(processMock).not.toHaveBeenCalled();

    delete process.env.ENABLE_SCHEDULERS;
  });

  it('skips handler registration on production API (postgres queue, no worker entrypoint)', () => {
    process.env.QUEUE_BACKEND = 'postgres';
    delete process.env.WORKER_ENTRYPOINT;
    delete process.env.ENABLE_SCHEDULERS;
    processor.onModuleInit();

    expect(processMock).not.toHaveBeenCalled();

    delete process.env.QUEUE_BACKEND;
  });

  it('updates PdfJob to PROCESSING then COMPLETED on success', async () => {
    const fakeInvoice = buildInvoiceDetail();
    findOneMock.mockResolvedValue(fakeInvoice);
    generatePDFMock.mockResolvedValue(Buffer.from('pdf'));
    uploadAndPersistMock.mockResolvedValue({
      storedKey: 'pdfs/invoices/inv-1.pdf',
      generatedAt: new Date(),
    });
    generateSignedUrlMock.mockResolvedValue(
      'https://cdn.example.com/inv-1.pdf',
    );

    processor.onModuleInit();
    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));
    await registeredHandler(makeJob());

    expect(pdfJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PROCESSING' } }),
    );
    expect(pdfJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          pdfUrl: 'https://cdn.example.com/inv-1.pdf',
        }),
      }),
    );
  });

  it('updates PdfJob to FAILED and rethrows when handler errors', async () => {
    findOneMock.mockResolvedValue(buildInvoiceDetail());
    generatePDFMock.mockRejectedValue(new Error('generation failed'));

    processor.onModuleInit();

    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));

    await expect(registeredHandler(makeJob())).rejects.toThrow(
      'generation failed',
    );

    expect(pdfJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failedReason: 'generation failed',
        }),
      }),
    );
  });

  it('keeps PdfJob out of FAILED while retries remain', async () => {
    findOneMock.mockResolvedValue(buildInvoiceDetail());
    generatePDFMock.mockRejectedValue(new Error('transient failure'));

    processor.onModuleInit();

    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));

    await expect(
      registeredHandler(makeJob({}, { maxAttempts: 3 })),
    ).rejects.toThrow('transient failure');

    expect(pdfJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSING',
        }),
      }),
    );
    expect(pdfJobUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    );
  });

  it('skips PdfJob updates when pdfJobId is absent', async () => {
    findOneMock.mockResolvedValue(buildInvoiceDetail());
    generatePDFMock.mockResolvedValue(Buffer.from('pdf'));
    uploadAndPersistMock.mockResolvedValue({
      storedKey: 'pdfs/invoices/inv-1.pdf',
      generatedAt: new Date(),
    });
    generateSignedUrlMock.mockResolvedValue(
      'https://cdn.example.com/inv-1.pdf',
    );

    processor.onModuleInit();
    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));
    await registeredHandler(makeJob({ pdfJobId: undefined }));

    expect(pdfJobUpdateMock).not.toHaveBeenCalled();
  });
});

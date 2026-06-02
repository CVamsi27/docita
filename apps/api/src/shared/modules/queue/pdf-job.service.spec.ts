import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PdfJobService, type PdfJobPrismaPort } from './pdf-job.service';
import {
  IQueueProvider,
  JobNames,
  QueueJob,
  type QueueJobData,
} from './queue.interface';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';

interface PdfJobRow {
  id: string;
  clinicId: string;
  documentId: string;
  documentType: string;
  status: string;
  pdfUrl: string | null;
  failedReason: string | null;
  attemptsMade: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

const makeQueueJob = (name: string): QueueJob<QueueJobData> => ({
  id: 'job-1',
  name,
  data: {},
  progress: 0,
  attemptsMade: 0,
  timestamp: Date.now(),
});

describe('PdfJobService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const basePdfJob: PdfJobRow = {
    id: 'pdf-job-1',
    clinicId: 'clinic-1',
    documentId: 'doc-1',
    documentType: 'invoice',
    status: 'PENDING',
    pdfUrl: null,
    failedReason: null,
    attemptsMade: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  const createMock = jest.fn<PdfJobPrismaPort['pdfJob']['create']>();
  const findFirstMock = jest.fn<PdfJobPrismaPort['pdfJob']['findFirst']>();

  const prisma: PdfJobPrismaPort = {
    runUnrestricted: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    pdfJob: {
      create: createMock,
      findFirst: findFirstMock,
    },
  };

  const enqueueImpl: IQueueProvider['enqueue'] = async <T extends QueueJobData>(
    name: string,
  ) => makeQueueJob(name) as QueueJob<T>;
  const enqueueMock = jest.fn(enqueueImpl);

  const queue: Pick<IQueueProvider, 'enqueue'> = {
    enqueue: enqueueMock,
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

  let service: PdfJobService;

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(basePdfJob);
    generateSignedUrlMock.mockResolvedValue(
      'https://cdn.example.com/fresh-invoice.pdf',
    );
    service = new PdfJobService(prisma, queue, storageProvider);
  });

  describe('enqueue', () => {
    it('creates a PdfJob row and enqueues a queue job', async () => {
      const result = await service.enqueue('doc-1', 'invoice', 'clinic-1');

      expect(createMock).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-1',
          documentType: 'invoice',
          clinicId: 'clinic-1',
        },
        select: {
          id: true,
          status: true,
          pdfUrl: true,
          createdAt: true,
        },
      });
      expect(enqueueMock).toHaveBeenCalledWith(
        JobNames.GENERATE_INVOICE_PDF,
        expect.objectContaining({ documentId: 'doc-1', pdfJobId: 'pdf-job-1' }),
      );
      expect(result.jobId).toBe('pdf-job-1');
      expect(result.status).toBe('PENDING');
      expect(result.pollUrl).toContain('pdf-job-1');
    });

    it('returns an existing PdfJob without enqueuing a duplicate job', async () => {
      createMock.mockRejectedValueOnce({ code: 'P2002' });
      findFirstMock.mockResolvedValueOnce(basePdfJob);

      const result = await service.enqueue('doc-1', 'invoice', 'clinic-1');

      expect(enqueueMock).not.toHaveBeenCalled();
      expect(result.jobId).toBe(basePdfJob.id);
      expect(result.status).toBe('PENDING');
    });

    it('uses GENERATE_PRESCRIPTION_PDF job name for prescriptions', async () => {
      await service.enqueue('rx-1', 'prescription', 'clinic-1');

      expect(enqueueMock).toHaveBeenCalledWith(
        JobNames.GENERATE_PRESCRIPTION_PDF,
        expect.objectContaining({ documentType: 'prescription' }),
      );
    });

    it('includes the invoices poll path in the pollUrl for invoices', async () => {
      const result = await service.enqueue('inv-1', 'invoice', 'clinic-1');
      expect(result.pollUrl).toContain('invoices/inv-1/pdf/status');
    });

    it('includes the prescriptions poll path in the pollUrl for prescriptions', async () => {
      const result = await service.enqueue('rx-1', 'prescription', 'clinic-1');
      expect(result.pollUrl).toContain('prescriptions/rx-1/pdf/status');
    });
  });

  describe('getStatus', () => {
    it('returns job status when found for the given clinicId', async () => {
      findFirstMock.mockResolvedValue(basePdfJob);

      const result = await service.getStatus('pdf-job-1', 'clinic-1');

      expect(findFirstMock).toHaveBeenCalledWith({
        where: { id: 'pdf-job-1', clinicId: 'clinic-1' },
      });
      expect(result.jobId).toBe('pdf-job-1');
      expect(result.status).toBe('PENDING');
      expect(result.pdfUrl).toBeUndefined();
    });

    it('returns pdfUrl when the job is COMPLETED', async () => {
      findFirstMock.mockResolvedValue({
        ...basePdfJob,
        status: 'COMPLETED',
        pdfUrl: 'pdfs/invoices/invoice.pdf',
      });

      const result = await service.getStatus('pdf-job-1', 'clinic-1');

      expect(result.status).toBe('COMPLETED');
      expect(generateSignedUrlMock).toHaveBeenCalledWith(
        'pdfs/invoices/invoice.pdf',
        15 * 60,
      );
      expect(result.pdfUrl).toBe('https://cdn.example.com/fresh-invoice.pdf');
    });

    it('does not return legacy persisted signed URLs', async () => {
      findFirstMock.mockResolvedValue({
        ...basePdfJob,
        status: 'COMPLETED',
        pdfUrl: 'https://cdn.example.com/expired-invoice.pdf',
      });

      const result = await service.getStatus('pdf-job-1', 'clinic-1');

      expect(generateSignedUrlMock).not.toHaveBeenCalled();
      expect(result.pdfUrl).toBeUndefined();
    });

    it('throws NotFoundException when job is not found', async () => {
      findFirstMock.mockResolvedValue(null);

      await expect(
        service.getStatus('missing-job', 'clinic-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces clinicId isolation — a different clinicId returns NotFoundException', async () => {
      findFirstMock.mockResolvedValue(null);

      await expect(
        service.getStatus('pdf-job-1', 'other-clinic'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PrescriptionPdfProcessor } from './prescription-pdf.processor';
import {
  JobNames,
  QueueJob,
  QueueJobData,
  GeneratePdfJobData,
  QueueJobHandler,
  IQueueProvider,
} from '@/shared/modules/queue/queue.interface';
import type { PrescriptionPdfProcessorPort } from './prescription-pdf.processor';
import type { PrescriptionsService } from './prescription.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import type { PdfJobProcessorPrismaPort } from '@/shared/modules/queue/pdf-job.service';
import type { PrescriptionDetail } from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { ApprovalStatus } from '@workspace/db';

const makeJob = (
  overrides: Partial<GeneratePdfJobData> = {},
  jobOverrides: {
    attemptsMade?: number;
    maxAttempts?: number;
  } = {},
): QueueJob<GeneratePdfJobData> => ({
  id: 'job-1',
  name: JobNames.GENERATE_PRESCRIPTION_PDF,
  data: {
    documentId: 'rx-1',
    documentType: 'prescription',
    clinicId: 'clinic-1',
    pdfJobId: 'pdf-job-1',
    ...overrides,
  },
  progress: 0,
  attemptsMade: jobOverrides.attemptsMade ?? 0,
  maxAttempts: jobOverrides.maxAttempts ?? 1,
  timestamp: Date.now(),
});

describe('PrescriptionPdfProcessor', () => {
  const findOneMock = jest.fn<PrescriptionsService['findOne']>();
  const generatePDFMock = jest.fn<PrescriptionsService['generatePDF']>();
  const uploadAndPersistMock =
    jest.fn<PrescriptionsService['uploadAndPersist']>();

  const prescriptionsService: PrescriptionPdfProcessorPort = {
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

  let processor: PrescriptionPdfProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    pdfJobUpdateMock.mockResolvedValue(undefined);
    processor = new PrescriptionPdfProcessor(
      prisma,
      prescriptionsService,
      storageProvider,
      queue,
    );
  });

  it('registers a handler for GENERATE_PRESCRIPTION_PDF on init (memory queue / worker)', () => {
    delete process.env.QUEUE_BACKEND;
    processor.onModuleInit();

    expect(processMock).toHaveBeenCalledWith(
      JobNames.GENERATE_PRESCRIPTION_PDF,
      expect.any(Function),
    );
  });

  it('registers a handler when QUEUE_BACKEND=postgres and WORKER_ENTRYPOINT=worker', () => {
    process.env.QUEUE_BACKEND = 'postgres';
    process.env.WORKER_ENTRYPOINT = 'worker';
    processor.onModuleInit();

    expect(processMock).toHaveBeenCalledWith(
      JobNames.GENERATE_PRESCRIPTION_PDF,
      expect.any(Function),
    );

    delete process.env.QUEUE_BACKEND;
    delete process.env.WORKER_ENTRYPOINT;
  });

  it('skips handler registration on production API (postgres queue, no worker entrypoint)', () => {
    process.env.QUEUE_BACKEND = 'postgres';
    delete process.env.WORKER_ENTRYPOINT;
    processor.onModuleInit();

    expect(processMock).not.toHaveBeenCalled();

    delete process.env.QUEUE_BACKEND;
  });

  it('updates PdfJob to PROCESSING then COMPLETED on success', async () => {
    const fakePrescription: PrescriptionDetail = {
      id: 'rx-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      instructions: 'Take after meals',
      date: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      whatsappSentAt: null,
      whatsappMessageId: null,
      whatsappStatus: null,
      doctorName: 'Dr. Queue',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRole: null,
      doctorRegistrationNumber: null,
      doctorLicenseNumber: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      medications: [],
      patient: {
        id: 'patient-1',
        mrn: 'MRN-1',
        firstName: 'Queue',
        lastName: 'Patient',
        phoneNumber: '9999999999',
        email: 'queue@example.com',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          email: 'clinic@test.com',
          phoneNumber: '1234567890',
          address: 'Main Road',
          logo: null,
          currency: 'INR',
          branding: null,
        },
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Queue',
        qualification: 'MBBS',
        registrationNumber: 'REG-1',
        signatureUrl: 'https://example.com/signature.png',
      },
    };
    findOneMock.mockResolvedValue(fakePrescription);
    generatePDFMock.mockResolvedValue(Buffer.from('pdf'));
    uploadAndPersistMock.mockResolvedValue({
      storedKey: 'pdfs/prescriptions/rx-1.pdf',
      generatedAt: new Date(),
    });
    generateSignedUrlMock.mockResolvedValue('https://cdn.example.com/rx-1.pdf');

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
          pdfUrl: 'https://cdn.example.com/rx-1.pdf',
        }),
      }),
    );
  });

  it('updates PdfJob to FAILED and rethrows when handler errors', async () => {
    findOneMock.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      instructions: 'Take after meals',
      date: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      whatsappSentAt: null,
      whatsappMessageId: null,
      whatsappStatus: null,
      doctorName: 'Dr. Queue',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRole: null,
      doctorRegistrationNumber: null,
      doctorLicenseNumber: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      medications: [],
      patient: {
        id: 'patient-1',
        mrn: 'MRN-1',
        firstName: 'Queue',
        lastName: 'Patient',
        phoneNumber: '9999999999',
        email: 'queue@example.com',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          email: 'clinic@test.com',
          phoneNumber: '1234567890',
          address: 'Main Road',
          logo: null,
          currency: 'INR',
          branding: null,
        },
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Queue',
        qualification: 'MBBS',
        registrationNumber: 'REG-1',
        signatureUrl: 'https://example.com/signature.png',
      },
    });
    generatePDFMock.mockRejectedValue(new Error('pdf generation error'));

    processor.onModuleInit();

    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));

    await expect(registeredHandler(makeJob())).rejects.toThrow(
      'pdf generation error',
    );

    expect(pdfJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failedReason: 'pdf generation error',
        }),
      }),
    );
  });

  it('keeps PdfJob out of FAILED while retries remain', async () => {
    findOneMock.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      instructions: 'Take after meals',
      date: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      whatsappSentAt: null,
      whatsappMessageId: null,
      whatsappStatus: null,
      doctorName: 'Dr. Queue',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRole: null,
      doctorRegistrationNumber: null,
      doctorLicenseNumber: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      medications: [],
      patient: {
        id: 'patient-1',
        mrn: 'MRN-1',
        firstName: 'Queue',
        lastName: 'Patient',
        phoneNumber: '9999999999',
        email: 'queue@example.com',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          email: 'clinic@test.com',
          phoneNumber: '1234567890',
          address: 'Main Road',
          logo: null,
          currency: 'INR',
          branding: null,
        },
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Queue',
        qualification: 'MBBS',
        registrationNumber: 'REG-1',
        signatureUrl: 'https://example.com/signature.png',
      },
    });
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
    findOneMock.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      instructions: 'Take after meals',
      date: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      whatsappSentAt: null,
      whatsappMessageId: null,
      whatsappStatus: null,
      doctorName: 'Dr. Queue',
      doctorEmail: null,
      doctorPhone: null,
      doctorSpecialization: null,
      doctorRole: null,
      doctorRegistrationNumber: null,
      doctorLicenseNumber: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      medications: [],
      patient: {
        id: 'patient-1',
        mrn: 'MRN-1',
        firstName: 'Queue',
        lastName: 'Patient',
        phoneNumber: '9999999999',
        email: 'queue@example.com',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          email: 'clinic@test.com',
          phoneNumber: '1234567890',
          address: 'Main Road',
          logo: null,
          currency: 'INR',
          branding: null,
        },
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Queue',
        qualification: 'MBBS',
        registrationNumber: 'REG-1',
        signatureUrl: 'https://example.com/signature.png',
      },
    });
    generatePDFMock.mockResolvedValue(Buffer.from('pdf'));
    uploadAndPersistMock.mockResolvedValue({
      storedKey: 'pdfs/prescriptions/rx-1.pdf',
      generatedAt: new Date(),
    });
    generateSignedUrlMock.mockResolvedValue('https://cdn.example.com/rx-1.pdf');

    processor.onModuleInit();
    const registeredHandler = processMock.mock.calls[0]?.[1];
    expect(registeredHandler).toEqual(expect.any(Function));
    await registeredHandler(makeJob({ pdfJobId: undefined }));

    expect(pdfJobUpdateMock).not.toHaveBeenCalled();
  });
});

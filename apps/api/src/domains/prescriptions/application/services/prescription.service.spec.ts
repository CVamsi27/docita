import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalStatus } from '@workspace/db';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  IPrescriptionRepository,
  PrescriptionDetail,
} from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import {
  PrescriptionData,
  PrescriptionPdfService,
} from './prescription-pdf.service';
import { PrescriptionsService } from './prescription.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';

describe('PrescriptionsService', () => {
  const findAllMock = jest.fn<IPrescriptionRepository['findAll']>();
  const findByIdMock = jest.fn<IPrescriptionRepository['findById']>();
  const createMock = jest.fn<IPrescriptionRepository['create']>();
  const updateMock = jest.fn<IPrescriptionRepository['update']>();
  const deleteMock = jest.fn<IPrescriptionRepository['delete']>();
  const findPatientWithAllergiesMock =
    jest.fn<IPrescriptionRepository['findPatientWithAllergies']>();
  const findDoctorComplianceMock =
    jest.fn<IPrescriptionRepository['findDoctorCompliance']>();

  const repository: IPrescriptionRepository = {
    findAll: findAllMock,
    findById: findByIdMock,
    create: createMock,
    update: updateMock,
    delete: deleteMock,
    findPatientWithAllergies: findPatientWithAllergiesMock,
    findDoctorCompliance: findDoctorComplianceMock,
  };

  const pdfService = Object.create(
    PrescriptionPdfService.prototype,
  ) as PrescriptionPdfService;
  const generatePdfMock =
    jest.fn<(data: PrescriptionData) => Promise<Buffer>>();
  pdfService.generate = generatePdfMock;

  const eventEmitter = new EventEmitter2();

  const usageTracking = Object.create(
    UsageTrackingService.prototype,
  ) as UsageTrackingService;
  usageTracking.trackPrescription =
    jest.fn<UsageTrackingService['trackPrescription']>();

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

  let service: PrescriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrescriptionsService(
      repository,
      pdfService,
      eventEmitter,
      usageTracking,
      storageProvider,
      storedFileUrlResolver,
      {
        enqueue: async () => ({
          jobId: 'job-1',
          status: 'PENDING' as const,
          pollUrl: '/api/v1/prescriptions/rx-1/pdf/status?jobId=job-1',
        }),
        getStatus: async () => ({
          jobId: 'job-1',
          status: 'PENDING' as const,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      } satisfies PdfJobServicePort,
    );
  });

  it('passes doctor signature URL to PDF payload when available', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const prescription: PrescriptionDetail = {
      id: 'rx-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      clinicId: 'clinic-1',
      instructions: 'Take after food',
      date: now,
      createdAt: now,
      updatedAt: now,
      approvalStatus: ApprovalStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      whatsappSentAt: null,
      whatsappMessageId: null,
      whatsappStatus: null,
      doctorName: 'Dr. Asha',
      doctorEmail: 'doctor@example.com',
      doctorPhone: '9999999999',
      doctorSpecialization: null,
      doctorRole: null,
      doctorRegistrationNumber: 'REG123',
      doctorLicenseNumber: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
      pdfTemplateVersion: 1,
      medications: [
        {
          id: 'med-1',
          name: 'Amoxicillin',
          dosage: '500mg',
          route: 'PO',
          frequency: 'BID',
          duration: '5 days',
        },
      ],
      patient: {
        id: 'pat-1',
        mrn: 'MRN-1',
        firstName: 'Asha',
        lastName: 'Rao',
        phoneNumber: '9999999999',
        email: 'asha@test.com',
        gender: 'FEMALE',
        dateOfBirth: new Date('1992-01-01T00:00:00.000Z'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          address: 'Main Road',
          phoneNumber: '1234567890',
          email: 'clinic@test.com',
          logo: null,
          currency: 'INR',
          branding: null,
        },
      },
      doctor: {
        id: 'doc-1',
        name: 'Dr. Asha',
        qualification: 'MBBS',
        registrationNumber: 'REG123',
        signatureUrl: 'https://example.com/doctor-signature.png',
      },
    };

    findByIdMock.mockResolvedValue(prescription);
    generatePdfMock.mockResolvedValue(Buffer.from('pdf'));

    await service.generatePDF('rx-1', 'clinic-1');

    expect(generatePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor: expect.objectContaining({
          signatureUrl: 'https://example.com/doctor-signature.png',
        }),
      }),
    );
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrescriptionsService } from './prescription.service';

describe('PrescriptionsService', () => {
  const repository = {
    findAll: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findPatientWithAllergies:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findDoctorCompliance: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const pdfService = {
    generate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const eventEmitter = {
    emit: jest.fn<(...args: unknown[]) => unknown>(),
  };

  const usageTracking = {
    trackPrescription: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const storageProvider = {
    supportsSignedUrls: false,
    uploadBuffer: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    generateSignedUrl: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  let service: PrescriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrescriptionsService(
      repository as never,
      pdfService as never,
      eventEmitter as never,
      usageTracking as never,
      storageProvider as never,
    );
  });

  it('passes doctor signature URL to PDF payload when available', async () => {
    repository.findById.mockResolvedValue({
      id: 'rx-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Asha',
      doctorRegistrationNumber: 'REG123',
      instructions: 'Take after food',
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
        firstName: 'Asha',
        lastName: 'Rao',
        phoneNumber: '9999999999',
        email: 'asha@test.com',
        gender: 'FEMALE',
        dateOfBirth: new Date('1992-01-01'),
        clinic: {
          id: 'clinic-1',
          name: 'Docita Clinic',
          address: 'Main Road',
          phone: '1234567890',
          email: 'clinic@test.com',
        },
      },
      doctor: {
        id: 'doc-1',
        name: 'Dr. Asha',
        qualification: 'MBBS',
        registrationNumber: 'REG123',
        signatureUrl: 'https://example.com/doctor-signature.png',
      },
    } as never);

    pdfService.generate.mockResolvedValue(Buffer.from('pdf') as never);

    await service.generatePDF('rx-1');

    expect(pdfService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor: expect.objectContaining({
          signatureUrl: 'https://example.com/doctor-signature.png',
        }),
      }),
    );
  });
});

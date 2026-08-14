import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IClinicUsagePort } from '@/domains/billing/application/ports';
import type { IPrescriptionRepository } from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import type { CreatePrescriptionCommand } from '@/domains/prescriptions/core/repositories/prescription-commands';
import type { PrescriptionPdfOrchestratorService } from './prescription-pdf-orchestrator.service';
import { PrescriptionsCommandService } from './prescriptions-command.service';

describe('PrescriptionsCommandService — controlled substances by modality', () => {
  const findDoctorComplianceMock =
    jest.fn<IPrescriptionRepository['findDoctorCompliance']>();
  const findPatientWithAllergiesMock =
    jest.fn<IPrescriptionRepository['findPatientWithAllergies']>();
  const findAppointmentTypeMock =
    jest.fn<IPrescriptionRepository['findAppointmentType']>();
  const createMock = jest.fn<IPrescriptionRepository['create']>();

  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: createMock,
    update: jest.fn(),
    delete: jest.fn(),
    findPatientWithAllergies: findPatientWithAllergiesMock,
    findDoctorCompliance: findDoctorComplianceMock,
    findAppointmentType: findAppointmentTypeMock,
  } as unknown as IPrescriptionRepository;

  const clinicUsage = {
    getCurrentUsage: jest.fn<IClinicUsagePort['getCurrentUsage']>(),
    trackPrescription: jest
      .fn<IClinicUsagePort['trackPrescription']>()
      .mockResolvedValue(undefined),
  } satisfies IClinicUsagePort;

  const service = new PrescriptionsCommandService(
    repository,
    new EventEmitter2(),
    clinicUsage,
    // create() never reaches the PDF orchestrator in these scenarios
    {} as PrescriptionPdfOrchestratorService,
  );

  const baseParams = (medicationName: string): CreatePrescriptionCommand => ({
    appointmentId: 'appt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    clinicId: 'clinic-1',
    medications: [
      {
        name: medicationName,
        dosage: '50mg',
        frequency: 'BID',
        duration: '3 days',
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findDoctorComplianceMock.mockResolvedValue({
      id: 'doc-1',
      name: 'Dr. Asha',
      email: 'doctor@example.com',
      phoneNumber: '9999999999',
      registrationNumber: 'REG123',
      licenseNumber: null,
      signatureUrl: 'https://example.com/sig.png',
      verificationStatus: 'VERIFIED',
    });
    findPatientWithAllergiesMock.mockResolvedValue({
      id: 'pat-1',
      patientAllergies: [],
    });
    createMock.mockResolvedValue({ id: 'rx-1' } as Awaited<
      ReturnType<IPrescriptionRepository['create']>
    >);
  });

  it('blocks controlled substances on TELEHEALTH appointments (NMC)', async () => {
    findAppointmentTypeMock.mockResolvedValue('TELEHEALTH');

    await expect(service.create(baseParams('Tramadol'))).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create(baseParams('Tramadol'))).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CONTROLLED_SUBSTANCE_TELEMEDICINE_BLOCKED',
      }),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('allows controlled substances on IN_PERSON appointments', async () => {
    findAppointmentTypeMock.mockResolvedValue('IN_PERSON');

    await expect(service.create(baseParams('Tramadol'))).resolves.toMatchObject(
      { id: 'rx-1' },
    );
    expect(findAppointmentTypeMock).toHaveBeenCalledWith('appt-1', 'clinic-1');
  });

  it('allows ordinary medications on TELEHEALTH appointments', async () => {
    findAppointmentTypeMock.mockResolvedValue('TELEHEALTH');

    await expect(
      service.create(baseParams('Cetirizine')),
    ).resolves.toMatchObject({ id: 'rx-1' });
  });

  it('honours an explicit isTeleconsultation flag over the appointment lookup', async () => {
    await expect(
      service.create({ ...baseParams('Tramadol'), isTeleconsultation: true }),
    ).rejects.toThrow(BadRequestException);
    expect(findAppointmentTypeMock).not.toHaveBeenCalled();
  });
});

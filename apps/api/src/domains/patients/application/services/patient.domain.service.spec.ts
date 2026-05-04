import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Patient,
  type PatientProps,
} from '@/domains/patients/core/entities/patient.entity';
import type { IPatientRepository } from '@/domains/patients/core/repositories/patient.repository.interface';
import { PatientService } from './patient.service';
import type {
  PatientDomainCreateInput,
  PatientDomainUpdateInput,
} from '@workspace/types';

describe('PatientService domain safeguards', () => {
  const buildPatient = (overrides: Partial<PatientProps> = {}): Patient =>
    new Patient({
      id: 'patient-1',
      clinicId: 'clinic-1',
      mrn: 'MRN-001',
      firstName: 'Asha',
      lastName: 'Rao',
      gender: 'FEMALE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
      ...overrides,
    });

  const repository: jest.Mocked<IPatientRepository> = {
    findById: jest.fn<IPatientRepository['findById']>(),
    findByMrn: jest.fn<IPatientRepository['findByMrn']>(),
    findByClinicIdAndPhoneNumber:
      jest.fn<IPatientRepository['findByClinicIdAndPhoneNumber']>(),
    findAll: jest.fn<IPatientRepository['findAll']>(),
    save: jest.fn<IPatientRepository['save']>(),
    update: jest.fn<IPatientRepository['update']>(),
    delete: jest.fn<IPatientRepository['delete']>(),
  };

  const buildCreateInput = (
    overrides: Partial<PatientDomainCreateInput> = {},
  ): PatientDomainCreateInput => ({
    clinicId: 'clinic-1',
    mrn: undefined,
    firstName: 'Maya',
    lastName: 'Iyer',
    gender: 'FEMALE',
    email: undefined,
    phoneNumber: undefined,
    dateOfBirth: undefined,
    address: undefined,
    metadata: undefined,
    ...overrides,
  });

  const buildUpdateInput = (
    overrides: Partial<PatientDomainUpdateInput> = {},
  ): PatientDomainUpdateInput => ({
    mrn: undefined,
    firstName: undefined,
    lastName: undefined,
    gender: undefined,
    email: undefined,
    phoneNumber: undefined,
    dateOfBirth: undefined,
    address: undefined,
    metadata: undefined,
    ...overrides,
  });

  let service: PatientService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PatientService(repository);
  });

  it('trims MRNs and checks clinic-scoped uniqueness before create', async () => {
    repository.findByMrn.mockResolvedValue(null);
    repository.save.mockResolvedValue();

    const patient = await service.createPatient(
      buildCreateInput({
        mrn: ' MRN-NEW ',
      }),
    );

    expect(repository.findByMrn).toHaveBeenCalledWith('MRN-NEW', 'clinic-1');
    expect(patient.getMrn()).toBe('MRN-NEW');
    expect(repository.save.mock.calls[0]?.[0].getMrn()).toBe('MRN-NEW');
  });

  it('rejects duplicate MRNs inside the same clinic before create', async () => {
    repository.findByMrn.mockResolvedValue(
      buildPatient({ id: 'patient-existing', mrn: 'MRN-001' }),
    );

    await expect(
      service.createPatient({
        ...buildCreateInput(),
        mrn: 'MRN-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates all editable profile fields and rechecks MRN ownership', async () => {
    const patient = buildPatient();
    repository.findById.mockResolvedValueOnce(patient).mockResolvedValueOnce(
      buildPatient({
        mrn: 'MRN-002',
        firstName: 'Maya',
        phoneNumber: '9999999999',
      }),
    );
    repository.findByMrn.mockResolvedValue(null);
    repository.update.mockResolvedValue();

    await service.updatePatient(
      'patient-1',
      buildUpdateInput({
        mrn: ' MRN-002 ',
        firstName: 'Maya',
        phoneNumber: '9999999999',
      }),
      'clinic-1',
    );

    const saved = repository.update.mock.calls[0]?.[0].toPlain();
    expect(repository.findByMrn).toHaveBeenCalledWith('MRN-002', 'clinic-1');
    expect(saved).toEqual(
      expect.objectContaining({
        mrn: 'MRN-002',
        firstName: 'Maya',
        phoneNumber: '9999999999',
      }),
    );
  });

  it('rejects duplicate MRNs inside the same clinic before update', async () => {
    repository.findById.mockResolvedValue(buildPatient());
    repository.findByMrn.mockResolvedValue(
      buildPatient({ id: 'patient-2', mrn: 'MRN-002' }),
    );

    await expect(
      service.updatePatient(
        'patient-1',
        buildUpdateInput({ mrn: 'MRN-002' }),
        'clinic-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

import { NotFoundException } from '@nestjs/common';
import type { IMedicationDoseRepository } from '@/domains/patients/core/repositories/medication-dose.repository.interface';
import { verifyMedicationDosePatientAccess } from './medication-dose-access.helpers';

function createMockRepository(
  overrides: Partial<IMedicationDoseRepository> = {},
): IMedicationDoseRepository {
  return {
    verifyPatientAccess: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as IMedicationDoseRepository;
}

describe('verifyMedicationDosePatientAccess', () => {
  const clinicId = 'clinic-1';
  const patientId = 'pat-1';

  it('does not throw when patient access is verified', async () => {
    const repo = createMockRepository({
      verifyPatientAccess: jest.fn().mockResolvedValue(true),
    });
    await expect(
      verifyMedicationDosePatientAccess(repo, clinicId, patientId),
    ).resolves.toBeUndefined();
    expect(repo.verifyPatientAccess).toHaveBeenCalledWith(patientId, clinicId);
  });

  it('throws NotFoundException when patient is not found', async () => {
    const repo = createMockRepository({
      verifyPatientAccess: jest.fn().mockResolvedValue(false),
    });
    await expect(
      verifyMedicationDosePatientAccess(repo, clinicId, patientId),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException with descriptive message', async () => {
    const repo = createMockRepository({
      verifyPatientAccess: jest.fn().mockResolvedValue(false),
    });
    await expect(
      verifyMedicationDosePatientAccess(repo, clinicId, patientId),
    ).rejects.toThrow('Patient not found');
  });

  it('passes patientId and clinicId in correct order', async () => {
    const repo = createMockRepository({
      verifyPatientAccess: jest.fn().mockResolvedValue(true),
    });
    await verifyMedicationDosePatientAccess(repo, 'clinic-42', 'pat-99');
    expect(repo.verifyPatientAccess).toHaveBeenCalledWith(
      'pat-99',
      'clinic-42',
    );
  });
});

import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { verifyMedicationDosePatientAccess } from './medication-dose-access.helpers';
import type { IMedicationDoseRepository } from '@/domains/patients/core/repositories/medication-dose.repository.interface';

function repoWith(access: boolean) {
  return {
    verifyPatientAccess: jest.fn(async () => access),
  } as unknown as IMedicationDoseRepository;
}

describe('verifyMedicationDosePatientAccess', () => {
  it('passes when the patient belongs to the clinic', async () => {
    await expect(
      verifyMedicationDosePatientAccess(repoWith(true), 'clinic-1', 'p-1'),
    ).resolves.toBeUndefined();
  });

  it('throws NotFound when the patient is outside the clinic', async () => {
    await expect(
      verifyMedicationDosePatientAccess(repoWith(false), 'clinic-1', 'p-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

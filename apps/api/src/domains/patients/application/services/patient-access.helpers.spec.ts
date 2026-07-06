import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { assertMrnAvailable } from './patient-access.helpers';
import type { IPatientRepository } from '@/domains/patients/core/repositories/patient.repository.interface';

function repoWith(found: { id: string } | null) {
  return {
    findByMrn: jest.fn(async () => found),
  } as unknown as IPatientRepository;
}

describe('assertMrnAvailable', () => {
  it('is a no-op (and skips the lookup) when no MRN is supplied', async () => {
    const repo = repoWith(null);
    await expect(
      assertMrnAvailable(repo, undefined, 'clinic-1'),
    ).resolves.toBeUndefined();
    expect(repo.findByMrn).not.toHaveBeenCalled();
  });

  it('passes when the MRN is unused in the clinic', async () => {
    await expect(
      assertMrnAvailable(repoWith(null), 'MRN-1', 'clinic-1'),
    ).resolves.toBeUndefined();
  });

  it('passes when the MRN belongs to the patient being updated', async () => {
    await expect(
      assertMrnAvailable(repoWith({ id: 'p-1' }), 'MRN-1', 'clinic-1', 'p-1'),
    ).resolves.toBeUndefined();
  });

  it('rejects an MRN already held by a different patient', async () => {
    await expect(
      assertMrnAvailable(repoWith({ id: 'p-2' }), 'MRN-1', 'clinic-1', 'p-1'),
    ).rejects.toThrow(ConflictException);
  });
});

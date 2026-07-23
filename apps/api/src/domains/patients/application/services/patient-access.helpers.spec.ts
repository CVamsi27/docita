import { ConflictException } from '@nestjs/common';
import type { IPatientRepository } from '@/domains/patients/core/repositories/patient.repository.interface';
import { assertMrnAvailable } from './patient-access.helpers';

function createMockRepository(
  overrides: Partial<IPatientRepository> = {},
): IPatientRepository {
  return {
    findByMrn: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as IPatientRepository;
}

describe('assertMrnAvailable', () => {
  const clinicId = 'clinic-1';

  it('does nothing when mrn is undefined', async () => {
    const repo = createMockRepository();
    await expect(
      assertMrnAvailable(repo, undefined, clinicId),
    ).resolves.toBeUndefined();
    expect(repo.findByMrn).not.toHaveBeenCalled();
  });

  it('does nothing when mrn is an empty string', async () => {
    const repo = createMockRepository();
    await expect(
      assertMrnAvailable(repo, '', clinicId),
    ).resolves.toBeUndefined();
    expect(repo.findByMrn).not.toHaveBeenCalled();
  });

  it('does nothing when no existing patient has the MRN', async () => {
    const repo = createMockRepository({ findByMrn: jest.fn().mockResolvedValue(null) });
    await expect(
      assertMrnAvailable(repo, 'MRN-001', clinicId),
    ).resolves.toBeUndefined();
    expect(repo.findByMrn).toHaveBeenCalledWith('MRN-001', clinicId);
  });

  it('throws ConflictException when MRN is already taken by a different patient', async () => {
    const repo = createMockRepository({
      findByMrn: jest.fn().mockResolvedValue({ id: 'other-patient' }),
    });
    await expect(
      assertMrnAvailable(repo, 'MRN-001', clinicId, 'current-patient'),
    ).rejects.toThrow(ConflictException);
  });

  it('does not throw when MRN belongs to the same patient (update flow)', async () => {
    const repo = createMockRepository({
      findByMrn: jest.fn().mockResolvedValue({ id: 'current-patient' }),
    });
    await expect(
      assertMrnAvailable(repo, 'MRN-001', clinicId, 'current-patient'),
    ).resolves.toBeUndefined();
  });

  it('passes the correct clinicId to findByMrn', async () => {
    const repo = createMockRepository({ findByMrn: jest.fn().mockResolvedValue(null) });
    await assertMrnAvailable(repo, 'MRN-999', 'clinic-42');
    expect(repo.findByMrn).toHaveBeenCalledWith('MRN-999', 'clinic-42');
  });
});

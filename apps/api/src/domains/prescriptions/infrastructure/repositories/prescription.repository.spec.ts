import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaPrescriptionRepository } from './prescription.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaPrescriptionRepository tenant guards', () => {
  const readClient = {
    prescription: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
    },
    patient: {
      findFirst: jest.fn<AnyAsync>(),
    },
  };

  const writeClient = {
    prescription: {
      updateMany: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      findFirst: jest.fn<AnyAsync>(),
    },
  };

  let repository: PrismaPrescriptionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      getReadClient: { value: () => readClient, writable: true },
      prescription: { value: writeClient.prescription, writable: true },
    });
    repository = new PrismaPrescriptionRepository(prismaService);
  });

  it('findById scopes by id and patient.clinicId', async () => {
    readClient.prescription.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findById('rx-1', 'other-clinic');

    expect(result).toBeNull();
    expect(readClient.prescription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rx-1', patient: { clinicId: 'other-clinic' } },
      }),
    );
  });

  it('update throws when no row matches the (id, clinicId) tuple', async () => {
    writeClient.prescription.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.update('rx-1', { notes: 'Updated' } as never, 'other-clinic'),
    ).rejects.toThrow('Prescription rx-1 not found');

    expect(writeClient.prescription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rx-1', patient: { clinicId: 'other-clinic' } },
      }),
    );
  });

  it('delete scopes by id and patient.clinicId so cross-tenant delete is a no-op', async () => {
    writeClient.prescription.deleteMany.mockResolvedValueOnce({ count: 0 });

    await repository.delete('rx-1', 'other-clinic');

    expect(writeClient.prescription.deleteMany).toHaveBeenCalledWith({
      where: { id: 'rx-1', patient: { clinicId: 'other-clinic' } },
    });
  });

  it('findPatientWithAllergies scopes the patient lookup by clinicId', async () => {
    readClient.patient.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findPatientWithAllergies(
      'patient-1',
      'other-clinic',
    );

    expect(result).toBeNull();
    expect(readClient.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', clinicId: 'other-clinic' },
      }),
    );
  });
});

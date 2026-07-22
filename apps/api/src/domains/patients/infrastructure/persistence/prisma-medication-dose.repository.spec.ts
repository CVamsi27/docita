import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaService } from '@/prisma/prisma.service';
import { PrismaMedicationDoseRepository } from './prisma-medication-dose.repository';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaMedicationDoseRepository', () => {
  const writeClient = {
    medicationDose: {
      update: jest.fn<AnyAsync>(),
      groupBy: jest.fn<AnyAsync>(),
    },
  };
  const readClient = {
    medicationDose: {
      groupBy: jest.fn<AnyAsync>(),
    },
  };

  let repository: PrismaMedicationDoseRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      medicationDose: { value: writeClient.medicationDose, writable: true },
      getReadClient: { value: () => readClient },
    });
    repository = new PrismaMedicationDoseRepository(prismaService);
  });

  it('increments version when updating a dose', async () => {
    writeClient.medicationDose.update.mockResolvedValueOnce({
      id: 'dose-1',
      version: 2,
    });

    await repository.updateDose('dose-1', { notes: 'Taken with food' });

    expect(writeClient.medicationDose.update).toHaveBeenCalledWith({
      where: { id: 'dose-1' },
      data: {
        notes: 'Taken with food',
        version: { increment: 1 },
      },
    });
  });

  it('groupDosesByMedicationAndStatus returns one row per (med, status) tuple from Prisma', async () => {
    readClient.medicationDose.groupBy.mockResolvedValueOnce([
      { medicationId: 'med-1', status: 'TAKEN', _count: { _all: 4 } },
      { medicationId: 'med-1', status: 'MISSED', _count: { _all: 1 } },
      { medicationId: 'med-2', status: 'TAKEN', _count: { _all: 2 } },
    ]);

    const result = await repository.groupDosesByMedicationAndStatus({
      patientId: 'patient-1',
    });

    expect(readClient.medicationDose.groupBy).toHaveBeenCalledWith({
      by: ['medicationId', 'status'],
      where: { patientId: 'patient-1' },
      _count: { _all: true },
    });
    expect(result).toEqual([
      { medicationId: 'med-1', status: 'TAKEN', count: 4 },
      { medicationId: 'med-1', status: 'MISSED', count: 1 },
      { medicationId: 'med-2', status: 'TAKEN', count: 2 },
    ]);
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaService } from '@/prisma/prisma.service';
import { PrismaMedicationDoseRepository } from './prisma-medication-dose.repository';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaMedicationDoseRepository', () => {
  const writeClient = {
    medicationDose: {
      update: jest.fn<AnyAsync>(),
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
});

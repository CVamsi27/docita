import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CreatePrescriptionCommand } from '@/domains/prescriptions/core/repositories/prescription-commands';
import { PrismaPrescriptionRepository } from './prescription.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaPrescriptionRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {
    prescription: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
  };

  let repository: PrismaPrescriptionRepository;
  const createCommand: CreatePrescriptionCommand = {
    appointmentId: 'appt-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    clinicId: 'clinic-1',
    medications: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaPrescriptionRepository(prismaService as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });

  it('connects the supplied clinic when persisting a prescription', async () => {
    await repository.create(createCommand);

    expect(prismaMock.prescription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinic: { connect: { id: 'clinic-1' } },
        }),
      }),
    );
  });

  it.each([undefined, ''])(
    'rejects missing clinic scope before persistence (%s)',
    async (clinicId) => {
      await expect(
        repository.create({ ...createCommand, clinicId }),
      ).rejects.toThrow('Cannot create prescription without a clinic context');
      expect(prismaMock.prescription.create).not.toHaveBeenCalled();
    },
  );
});

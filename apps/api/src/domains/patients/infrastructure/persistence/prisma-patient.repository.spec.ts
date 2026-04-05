import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Gender } from '@workspace/db';
import { PrismaPatientRepository } from './prisma-patient.repository';
import { PrismaService } from '@/prisma/prisma.service';

describe('PrismaPatientRepository', () => {
  const mockPatientCount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPatientFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockReadClient = {
    patient: {
      count: mockPatientCount,
      findMany: mockPatientFindMany,
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClient),
    patient: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  let repository: PrismaPatientRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      getReadClient: {
        value: mockPrismaService.getReadClient,
        writable: true,
      },
      patient: {
        value: mockPrismaService.patient,
        writable: true,
      },
    });
    repository = new PrismaPatientRepository(prismaService);
  });

  it('returns count and hasMore metadata for paginated results', async () => {
    mockPatientCount.mockResolvedValue(51);
    mockPatientFindMany.mockResolvedValue([
      {
        id: 'patient-1',
        clinicId: 'clinic-1',
        firstName: 'John',
        lastName: 'Doe',
        gender: Gender.MALE,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        version: 1,
      },
    ]);

    const result = await repository.findAll({
      clinicId: 'clinic-1',
      page: 1,
      limit: 25,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(51);
    expect(result.count).toBe(51);
    expect(result.hasMore).toBe(true);
    expect(mockPrismaService.getReadClient).toHaveBeenCalled();
  });

  it('builds search filters and computes no further pages when on last page', async () => {
    mockPatientCount.mockResolvedValue(10);
    mockPatientFindMany.mockResolvedValue([]);

    const result = await repository.findAll({
      clinicId: 'clinic-1',
      search: 'john',
      page: 1,
      limit: 25,
    });

    expect(result.hasMore).toBe(false);
    expect(mockPatientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        where: expect.objectContaining({
          clinicId: 'clinic-1',
          OR: expect.arrayContaining([
            { firstName: { contains: 'john', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });
});

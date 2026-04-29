import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Gender } from '@workspace/db';
import { PrismaPatientRepository } from './prisma-patient.repository';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
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
      updateMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<{ count: number }>>(),
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

  it('scopes findById by both id and clinicId so cross-tenant lookups return null', async () => {
    const findFirstSpy = mockReadClient.patient.findFirst as jest.Mock<
      (...args: unknown[]) => Promise<unknown>
    >;
    findFirstSpy.mockResolvedValueOnce(null);

    const result = await repository.findById('patient-1', 'other-clinic');

    expect(result).toBeNull();
    expect(findFirstSpy).toHaveBeenCalledWith({
      where: { id: 'patient-1', clinicId: 'other-clinic' },
    });
  });

  it('throws when update affects zero rows (cross-tenant id) and never bypasses clinicId', async () => {
    mockPrismaService.patient.updateMany.mockResolvedValueOnce({ count: 0 });

    const patient = new Patient({
      id: 'patient-1',
      clinicId: 'other-clinic',
      firstName: 'Jane',
      lastName: 'Doe',
      gender: Gender.FEMALE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
    });

    await expect(repository.update(patient)).rejects.toThrow(
      'Patient patient-1 not found',
    );

    expect(mockPrismaService.patient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', clinicId: 'other-clinic' },
      }),
    );
  });

  it('scopes delete by both id and clinicId via deleteMany', async () => {
    mockPrismaService.patient.deleteMany.mockResolvedValueOnce({ count: 0 });

    await repository.delete('patient-1', 'other-clinic');

    expect(mockPrismaService.patient.deleteMany).toHaveBeenCalledWith({
      where: { id: 'patient-1', clinicId: 'other-clinic' },
    });
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

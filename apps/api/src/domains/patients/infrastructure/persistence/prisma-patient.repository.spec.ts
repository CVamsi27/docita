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
    repository = new PrismaPatientRepository(prismaService, {
      now: () => new Date('2026-07-02T00:00:00Z'),
    });
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
    expect(findFirstSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', clinicId: 'other-clinic', deletedAt: null },
      }),
    );
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

  it('soft-deletes by scoping id + clinicId and setting deletedAt', async () => {
    mockPrismaService.patient.updateMany.mockResolvedValueOnce({ count: 1 });

    await repository.delete('patient-1', 'other-clinic');

    expect(mockPrismaService.patient.updateMany).toHaveBeenCalledWith({
      where: { id: 'patient-1', clinicId: 'other-clinic', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('throws NotFound when soft-deleting a missing/already-deleted patient', async () => {
    mockPrismaService.patient.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.delete('patient-1', 'other-clinic'),
    ).rejects.toThrow('Patient patient-1 not found');
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

  it('looks up a patient by phone across every equivalent E.164 form', async () => {
    // Returning-patient OTP flows normalize the entered phone to +91… before
    // the call. The row may be stored as bare-10-digit, 91…, or +91… — the
    // repository must match whichever form is on disk, otherwise the lookup
    // silently returns null and the user is locked out.
    const findFirstSpy = mockReadClient.patient.findFirst as jest.Mock<
      (...args: unknown[]) => Promise<unknown>
    >;
    findFirstSpy.mockResolvedValueOnce(null);

    await repository.findByClinicIdAndPhoneNumber('clinic-1', '+919812345678');

    expect(findFirstSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId: 'clinic-1',
          phoneNumber: {
            in: expect.arrayContaining([
              '+919812345678',
              '919812345678',
              '9812345678',
            ]),
          },
          deletedAt: null,
        }),
      }),
    );
  });
});

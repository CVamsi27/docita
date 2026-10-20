import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppointmentRequestStatus } from '@workspace/db';
import { PrismaAppointmentRequestRepository } from './prisma-appointment-request.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaAppointmentRequestRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {
    appointmentRequest: {
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
    user: {
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

  let repository: PrismaAppointmentRequestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaAppointmentRequestRepository(
      prismaService as never,
      { now: () => new Date('2026-07-01T00:00:00Z') } as never,
    );
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });

  it('looks up a slot hold among pending requests only', async () => {
    prismaMock.appointmentRequest.findFirst.mockResolvedValue(null);

    await expect(repository.findPendingBySlotKey('key-1')).resolves.toBeNull();
    expect(prismaMock.appointmentRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pendingSlotKey: 'key-1',
          status: AppointmentRequestStatus.PENDING,
        },
      }),
    );
  });

  it('clears the slot hold when a review settles the request', async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.appointmentRequest.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.appointmentRequest.findFirst.mockResolvedValue({ id: 'req-1' });

    await repository.markReviewed({
      id: 'req-1',
      clinicId: 'clinic-1',
      status: AppointmentRequestStatus.APPROVED,
      reviewedById: 'staff-1',
      responseMessage: '',
      expectedStatus: AppointmentRequestStatus.PENDING,
    });

    expect(prismaMock.appointmentRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'req-1',
        clinicId: 'clinic-1',
        status: AppointmentRequestStatus.PENDING,
      },
      data: expect.objectContaining({
        status: AppointmentRequestStatus.APPROVED,
        pendingSlotKey: null,
        reviewedById: 'staff-1',
      }),
    });
  });

  it('returns null when a concurrent review already settled the request', async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.appointmentRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.markReviewed({
        id: 'req-1',
        clinicId: 'clinic-1',
        status: AppointmentRequestStatus.REJECTED,
        reviewedById: 'staff-1',
        responseMessage: 'No slots',
        expectedStatus: AppointmentRequestStatus.PENDING,
      }),
    ).resolves.toBeNull();
    expect(prismaMock.appointmentRequest.findFirst).not.toHaveBeenCalled();
  });
});

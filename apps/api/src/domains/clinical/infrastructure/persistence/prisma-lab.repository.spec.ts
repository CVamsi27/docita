import { describe, expect, it, jest } from '@jest/globals';
import { PrismaLabRepository } from './prisma-lab.repository';
import type { PrismaService } from '@/prisma/prisma.service';
import { LabTestOrderStatus } from '@workspace/db';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    labTestId: 'test-1',
    labId: null,
    status: LabTestOrderStatus.ORDERED,
    result: null,
    resultUrl: null,
    notes: null,
    orderedBy: 'user-1',
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-01-15T10:00:00.000Z'),
    collectedAt: null,
    completedAt: null,
    resultUploadedBy: null,
    resultUploadedAt: null,
    paidAt: null,
    paymentVerifiedBy: null,
    paymentMethod: null,
    paymentReference: null,
    releasedAt: null,
    labTest: {
      id: 'test-1',
      name: 'CBC',
      category: 'HEMATOLOGY',
      code: 'CBC-1',
      price: 100,
      priceCents: 10000,
      clinicId: 'clinic-1',
      active: true,
    },
    patient: {
      id: 'patient-1',
      firstName: 'Aarav',
      lastName: 'Sharma',
      phoneNumber: '+919000000000',
    },
    ...overrides,
  };
}

function createMocks() {
  const readClient = {
    labTest: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
    },
    labTestOrder: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      groupBy: jest.fn(async () => []),
    },
    patient: {
      findMany: jest.fn(async () => []),
    },
    user: {
      findMany: jest.fn(async () => []),
    },
    lab: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
    },
  } as Record<string, Record<string, jest.Mock>>;
  const prisma = {
    getReadClient: jest.fn(() => readClient) as jest.Mock,
    labTest: {
      upsert: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    labTestOrder: {
      upsert: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    lab: {
      create: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  } as unknown as PrismaService & { getReadClient: jest.Mock };
  const repository = new PrismaLabRepository(prisma);
  return { readClient, prisma, repository };
}

describe('PrismaLabRepository', () => {
  describe('findAllTests', () => {
    it('filters by clinic and truncates beyond 1000 rows', async () => {
      const { readClient, repository } = createMocks();
      const tests = Array.from({ length: 1001 }, (_, i) => ({
        id: `t-${i}`,
        name: `Test ${i}`,
        category: 'CAT',
        clinicId: 'clinic-1',
        active: true,
        code: null,
        price: 10,
        priceCents: 1000,
        description: null,
      }));
      readClient.labTest.findMany = jest.fn(async () => tests);

      const result = await repository.findAllTests('clinic-1');

      expect(readClient.labTest.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        orderBy: { name: 'asc' },
        take: 1001,
      });
      expect(result).toHaveLength(1000);
    });
  });

  describe('findAllOrders', () => {
    it('returns paginated orders with next cursor', async () => {
      const { readClient, repository } = createMocks();
      const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
      readClient.labTestOrder.findMany = jest.fn(async () => orders);
      readClient.user.findMany = jest.fn(async () => [
        { id: 'user-1', name: 'Dr. Rao' },
      ]);

      const result = await repository.findAllOrders('clinic-1', {
        limit: 100,
      });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
      expect(readClient.labTestOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-1' },
          take: 101,
        }),
      );
    });

    it('filters by status and patientId', async () => {
      const { readClient, repository } = createMocks();
      readClient.labTestOrder.findMany = jest.fn(async () => [makeOrder()]);

      await repository.findAllOrders('clinic-1', {
        status: 'COMPLETED',
        patientId: 'patient-1',
      });

      expect(readClient.labTestOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clinicId: 'clinic-1',
            patientId: 'patient-1',
            status: 'COMPLETED',
          },
        }),
      );
    });

    it('ignores an invalid status filter rather than throwing', async () => {
      const { readClient, repository } = createMocks();
      readClient.labTestOrder.findMany = jest.fn(async () => [makeOrder()]);

      await repository.findAllOrders('clinic-1', { status: 'NOT_A_STATUS' });

      const call = (readClient.labTestOrder.findMany as jest.Mock).mock
        .calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.status).toBeUndefined();
    });
  });

  describe('findLabQueue', () => {
    it('passes lab + status filters and maps patient/test names', async () => {
      const { readClient, repository } = createMocks();
      const order = makeOrder({ labId: 'lab-1', status: 'SAMPLE_COLLECTED' });
      readClient.labTestOrder.findMany = jest.fn(async () => [order]);

      const result = await repository.findLabQueue('clinic-1', {
        labId: 'lab-1',
        status: 'SAMPLE_COLLECTED',
      });

      expect(readClient.labTestOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clinicId: 'clinic-1',
            labId: 'lab-1',
            status: 'SAMPLE_COLLECTED',
          },
        }),
      );
      expect(result[0].patient.firstName).toBe('Aarav');
      expect(result[0].labTest.name).toBe('CBC');
    });
  });

  describe('attachResult', () => {
    it('marks the order RESULT_READY with the uploaded payload', async () => {
      const { prisma, repository } = createMocks();
      const now = new Date('2026-01-15T12:00:00.000Z');

      await repository.attachResult(
        'order-1',
        'clinic-1',
        {
          resultUrl: 'https://cdn.example.com/r1.pdf',
          result: { hemoglobin: 13.2 },
          notes: 'normal',
          uploadedBy: 'user-1',
        },
        now,
      );

      expect(prisma.labTestOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', clinicId: 'clinic-1' },
        data: expect.objectContaining({
          status: LabTestOrderStatus.RESULT_READY,
          resultUrl: 'https://cdn.example.com/r1.pdf',
          resultUploadedBy: 'user-1',
          resultUploadedAt: now,
        }),
      });
    });

    it('omits the result payload when none is provided', async () => {
      const { prisma, repository } = createMocks();

      await repository.attachResult(
        'order-1',
        'clinic-1',
        { resultUrl: 'https://cdn.example.com/r1.pdf', uploadedBy: 'user-1' },
        new Date(),
      );

      const call = (prisma.labTestOrder.updateMany as jest.Mock).mock
        .calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.result).toBeUndefined();
    });
  });

  describe('verifyPayment', () => {
    it('records payment details scoped to clinic', async () => {
      const { prisma, repository } = createMocks();
      const now = new Date('2026-01-15T12:00:00.000Z');

      await repository.verifyPayment(
        'order-1',
        'clinic-1',
        { method: 'CASH', reference: 'REF-1', verifiedBy: 'user-1' },
        now,
      );

      expect(prisma.labTestOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', clinicId: 'clinic-1' },
        data: expect.objectContaining({
          paidAt: now,
          paymentVerifiedBy: 'user-1',
          paymentMethod: 'CASH',
          paymentReference: 'REF-1',
        }),
      });
    });
  });

  describe('getStats', () => {
    it('buckets groupBy counts into pending/in-progress/completed', async () => {
      const { readClient, repository } = createMocks();
      readClient.labTestOrder.groupBy = jest.fn(async () => [
        { status: 'ORDERED', _count: 2 },
        { status: 'SAMPLE_COLLECTED', _count: 3 },
        { status: 'COMPLETED', _count: 5 },
      ]);

      const stats = await repository.getStats('clinic-1');

      expect(stats).toEqual({
        pending: 2,
        inProgress: 3,
        completed: 5,
        urgent: 0,
        total: 10,
      });
    });
  });
});

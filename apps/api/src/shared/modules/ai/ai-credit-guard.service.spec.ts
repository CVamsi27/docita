import { HttpException, HttpStatus } from '@nestjs/common';
import { AiCreditGuardService } from './ai-credit-guard.service';
import type { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';

describe('AiCreditGuardService', () => {
  function setup() {
    const findUnique = jest.fn();
    const aggregate = jest.fn();
    const count = jest.fn().mockResolvedValue(0);
    const create = jest.fn().mockResolvedValue({ id: 'claim-1' });
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const $queryRaw = jest
      .fn()
      .mockResolvedValue([{ pg_advisory_xact_lock: true }]);
    const usageEvent = { aggregate, count, create, deleteMany };
    const tx = { $queryRaw, usageEvent };
    const prisma = {
      clinic: { findUnique },
      usageEvent,
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaService;
    // Fixed clock: 2026-01-15T12:00:00.000Z (stale boundary = 11:30Z).
    const service = new AiCreditGuardService(prisma, createFixedClockMock());
    return {
      service,
      findUnique,
      aggregate,
      count,
      create,
      deleteMany,
      $queryRaw,
    };
  }

  it('allows without a DB lookup when clinicId is missing', async () => {
    const { service, findUnique } = setup();

    await expect(service.assertWithinAllotment(null)).resolves.toBeUndefined();
    await expect(
      service.assertWithinAllotment(undefined),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('allows when the clinic tier has no enforced allotment', async () => {
    const { service, findUnique, aggregate, $queryRaw } = setup();
    findUnique.mockResolvedValue({ tier: 'ENTERPRISE' });

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).resolves.toBeUndefined();
    expect(findUnique).toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
    expect($queryRaw).not.toHaveBeenCalled();
  });

  it('admits below the allotment with a zero-quantity claim', async () => {
    const { service, findUnique, aggregate, create } = setup();
    findUnique.mockResolvedValue({ tier: 'ESSENTIAL' });
    aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

    await expect(service.assertWithinAllotment('clinic-1')).resolves.toEqual({
      ticketId: 'claim-1',
      clinicId: 'clinic-1',
    });
    expect(aggregate).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicId: 'clinic-1',
          quantity: 0,
          entityType: 'AiCreditAdmission',
        }),
      }),
    );
  });

  it('blocks with HTTP 402 when the allotment is exhausted', async () => {
    const { service, findUnique, aggregate, create } = setup();
    findUnique.mockResolvedValue({ tier: 'STARTER' });
    aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

    const denial = await service
      .assertWithinAllotment('clinic-1')
      .catch((err: unknown) => err);
    expect(denial).toBeInstanceOf(HttpException);
    expect((denial as HttpException).getStatus()).toBe(
      HttpStatus.PAYMENT_REQUIRED,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('counts in-flight claims so the final credit has one winner', async () => {
    const { service, findUnique, aggregate, count, create } = setup();
    findUnique.mockResolvedValue({ tier: 'STARTER' });
    aggregate.mockResolvedValue({ _sum: { quantity: 99 } });
    count.mockResolvedValue(1);

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityType: 'AiCreditAdmission' }),
      }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('reaps stale claims inside the admission lock', async () => {
    const { service, findUnique, aggregate, deleteMany, $queryRaw } = setup();
    findUnique.mockResolvedValue({ tier: 'ESSENTIAL' });
    aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

    await service.assertWithinAllotment('clinic-1');

    expect($queryRaw).toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        clinicId: 'clinic-1',
        type: 'AI_CREDITS',
        entityType: 'AiCreditAdmission',
        timestamp: { lt: new Date('2026-01-15T11:30:00.000Z') },
      },
    });
  });

  it('releaseAdmission removes the claim, is a no-op without one, and never throws', async () => {
    const { service, deleteMany } = setup();

    await service.releaseAdmission({
      ticketId: 'claim-1',
      clinicId: 'clinic-1',
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'claim-1', entityType: 'AiCreditAdmission' },
    });

    deleteMany.mockClear();
    await service.releaseAdmission(undefined);
    await service.releaseAdmission(null);
    expect(deleteMany).not.toHaveBeenCalled();

    deleteMany.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.releaseAdmission({ ticketId: 'claim-1', clinicId: 'clinic-1' }),
    ).resolves.toBeUndefined();
  });

  it('fails open when the claim cannot be written', async () => {
    const { service, findUnique, aggregate, create } = setup();
    findUnique.mockResolvedValue({ tier: 'ESSENTIAL' });
    aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    create.mockRejectedValue(new Error('insert failed'));

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).resolves.toBeUndefined();
  });
});

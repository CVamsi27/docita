import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BillingCycle, ClinicTier, SubscriptionStatus } from '@workspace/db';
import { InternalSubscriptionQueryService } from './internal-subscription-query.service';

describe('InternalSubscriptionQueryService', () => {
  let service: InternalSubscriptionQueryService;
  let prisma: {
    subscription: { findMany: jest.Mock<(args: unknown) => Promise<unknown>> };
    subscriptionPayment: {
      findMany: jest.Mock<(args: unknown) => Promise<unknown>>;
    };
  };
  let clock: { now: jest.Mock };

  beforeEach(() => {
    prisma = {
      subscription: { findMany: jest.fn() },
      subscriptionPayment: { findMany: jest.fn() },
    };
    clock = { now: jest.fn(() => new Date('2026-08-10T00:00:00Z')) };
    service = new InternalSubscriptionQueryService(
      prisma as never,
      clock as never,
    );
  });

  it('getSubscriptions applies the requested tier and status filters', async () => {
    prisma.subscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        clinicId: 'clinic-1',
        plan: ClinicTier.PROFESSIONAL,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: new Date('2026-08-01'),
        currentPeriodEnd: new Date('2026-09-01'),
        basePriceCents: 10000,
        currency: 'INR',
        clinic: {
          id: 'clinic-1',
          name: 'Acme',
          email: 'a@x.com',
          tier: ClinicTier.PROFESSIONAL,
          referralCreditsMonths: 0,
        },
      },
    ]);

    const result = await service.getSubscriptions({
      tier: ClinicTier.PROFESSIONAL,
      status: SubscriptionStatus.ACTIVE,
    });

    expect(result).toHaveLength(1);
    // Inspect the where clause directly — Prisma's exactOptionalPropertyTypes
    // drops the `plan` key when the value would be undefined at runtime, so a
    // deep-equal match is more reliable than objectContaining here.
    const call = (prisma.subscription.findMany.mock.calls[0]?.[0] ?? {}) as {
      where: {
        status: { in: unknown };
        currentPeriodEnd: { gte: unknown; lte: unknown };
        createdAt: { gte: unknown; lte: unknown };
        plan: unknown;
      };
    };
    expect(call.where.plan).toBe(ClinicTier.PROFESSIONAL);
    expect(call.where.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('getSubscriptions ignores unknown filter values (does not throw)', async () => {
    prisma.subscription.findMany.mockResolvedValueOnce([]);

    await service.getSubscriptions({ tier: 'NOT_A_TIER', status: 'UNKNOWN' });

    // The where clause should not include the invalid filter values.
    const call = (prisma.subscription.findMany.mock.calls[0]?.[0] ?? {}) as {
      where: {
        status: { in: unknown };
        currentPeriodEnd: { gte: unknown; lte: unknown };
        createdAt: { gte: unknown; lte: unknown };
        plan: unknown;
      };
    };
    expect(call.where).not.toHaveProperty('plan');
    expect(call.where).not.toHaveProperty('status');
  });

  it('getExpiringSubscriptions defaults to a 7-day window', async () => {
    prisma.subscription.findMany.mockResolvedValueOnce([]);

    await service.getExpiringSubscriptions();

    const call = (prisma.subscription.findMany.mock.calls[0]?.[0] ?? {}) as {
      where: {
        status: { in: unknown };
        currentPeriodEnd: { gte: unknown; lte: unknown };
        createdAt: { gte: unknown; lte: unknown };
        plan: unknown;
      };
    };
    expect(call.where.status.in).toEqual([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ]);
    // currentPeriodEnd is bounded to [now, now+7d]
    expect(call.where.currentPeriodEnd.gte).toEqual(
      new Date('2026-08-10T00:00:00Z'),
    );
  });

  it('getExpiringSubscriptions accepts a custom window', async () => {
    prisma.subscription.findMany.mockResolvedValueOnce([]);

    await service.getExpiringSubscriptions(14);

    const call = (prisma.subscription.findMany.mock.calls[0]?.[0] ?? {}) as {
      where: {
        status: { in: unknown };
        currentPeriodEnd: { gte: unknown; lte: unknown };
        createdAt: { gte: unknown; lte: unknown };
        plan: unknown;
      };
    };
    expect(call.where.currentPeriodEnd.gte).toEqual(
      new Date('2026-08-10T00:00:00Z'),
    );
  });

  it('getPayments applies clinicId and date filters', async () => {
    prisma.subscriptionPayment.findMany.mockResolvedValueOnce([]);

    await service.getPayments({
      clinicId: 'clinic-1',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });

    const call = (prisma.subscriptionPayment.findMany.mock.calls[0]?.[0] ??
      {}) as {
      where: {
        clinicId: unknown;
        createdAt: { gte: unknown; lte: unknown };
      };
      take?: number;
      skip?: number;
      orderBy?: unknown;
    };
    expect(call.where.clinicId).toBe('clinic-1');
    expect(call.where.createdAt.gte).toEqual(new Date('2026-08-01'));
    expect(call.where.createdAt.lte).toEqual(new Date('2026-08-31'));
  });

  it('getPayments caps the page at 100 rows to avoid unbounded fetches', async () => {
    prisma.subscriptionPayment.findMany.mockResolvedValueOnce([]);

    await service.getPayments({});

    const call = (prisma.subscriptionPayment.findMany.mock.calls[0]?.[0] ??
      {}) as {
      where: {
        clinicId: unknown;
        createdAt: { gte: unknown; lte: unknown };
      };
      take?: number;
      skip?: number;
      orderBy?: unknown;
    };
    expect(call.take).toBe(100);
  });
});

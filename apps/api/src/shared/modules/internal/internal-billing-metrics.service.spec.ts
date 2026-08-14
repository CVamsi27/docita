import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalBillingMetricsService } from './internal-billing-metrics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus } from '@workspace/db';
import { INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN } from './ports/internal-subscription-payment.repository.port';
import { clockPortTestProvider } from '@/test-utils';
import { formatDate, startOfMonth } from '@workspace/utils';

describe('InternalBillingMetricsService', () => {
  let service: InternalBillingMetricsService;

  const mockSubscriptionGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockSubscriptionCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockSubscriptionFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPaymentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockGetPaidRevenueGroupedByMonth =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockPrismaService = {
    subscription: {
      groupBy: mockSubscriptionGroupBy,
      count: mockSubscriptionCount,
      findMany: mockSubscriptionFindMany,
    },
    subscriptionPayment: {
      findMany: mockPaymentFindMany,
    },
  };

  const mockSubscriptionPaymentsRepository = {
    getPaidRevenueGroupedByMonth: mockGetPaidRevenueGroupedByMonth,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalBillingMetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN,
          useValue: mockSubscriptionPaymentsRepository,
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<InternalBillingMetricsService>(
      InternalBillingMetricsService,
    );
    jest.clearAllMocks();
  });

  it('computes MRR/ARR with annualized yearly cycles from a groupBy sum, not a row scan', async () => {
    mockSubscriptionGroupBy
      .mockResolvedValueOnce([
        { billingCycle: 'MONTHLY', _sum: { basePriceCents: 100000 } },
        { billingCycle: 'YEARLY', _sum: { basePriceCents: 1200000 } },
      ])
      .mockResolvedValueOnce([
        { plan: 'STARTER', _count: { _all: 5 } },
        { plan: 'PROFESSIONAL', _count: { _all: 5 } },
      ])
      .mockResolvedValueOnce([
        { status: 'ACTIVE', _count: { _all: 8 } },
        { status: 'TRIALING', _count: { _all: 2 } },
      ]);
    mockSubscriptionCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    mockSubscriptionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetPaidRevenueGroupedByMonth.mockResolvedValue([]);
    mockPaymentFindMany.mockResolvedValue([]);

    const result = await service.getMetrics();

    expect(result.mrr).toBe(2000);
    expect(result.arr).toBe(24000);
    expect(result.activeSubscriptions).toBe(10);
    expect(result.trialSubscriptions).toBe(2);
    expect(result.churnRate).toBeCloseTo(1 / 11);
    expect(result.subscriptionsByTier).toEqual({
      STARTER: 5,
      PROFESSIONAL: 5,
    });
    expect(result.subscriptionsByStatus).toEqual({ ACTIVE: 8, TRIALING: 2 });

    expect(mockSubscriptionGroupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        by: ['billingCycle'],
        where: expect.objectContaining({
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        }),
        _sum: { basePriceCents: true },
      }),
    );
    expect(mockSubscriptionCount).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          status: SubscriptionStatus.CANCELLED,
          updatedAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });

  it('scans only bounded windows instead of loading every subscription row', async () => {
    mockSubscriptionGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSubscriptionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    // Align with the fixed clock (2026-01-15T12:00:00.000Z) so the
    // window-bounds assertions stay self-consistent.
    const now = new Date('2026-01-15T12:00:00.000Z');
    const expiringRow = {
      id: 'sub-expiring',
      clinicId: 'c1',
      plan: 'STARTER',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      basePriceCents: 10000,
      currency: 'INR',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 3 * 86400000),
      clinic: {
        id: 'c1',
        name: 'Clinic One',
        email: 'clinic@example.com',
        tier: 'STARTER',
        referralCreditsMonths: 0,
      },
    };
    mockSubscriptionFindMany
      .mockResolvedValueOnce([expiringRow])
      .mockResolvedValueOnce([]);
    mockGetPaidRevenueGroupedByMonth.mockResolvedValue([]);
    mockPaymentFindMany.mockResolvedValue([]);

    const result = await service.getMetrics();

    // Expiring subscriptions: 7-day bounded window, projected with clinic.
    expect(mockSubscriptionFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
          currentPeriodEnd: expect.objectContaining({
            gt: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
    // Grace period subscriptions: status-scoped, not a full scan.
    expect(mockSubscriptionFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: SubscriptionStatus.GRACE }),
      }),
    );
    // Every findMany on the subscription table is bounded by a where clause.
    for (const call of mockSubscriptionFindMany.mock.calls) {
      expect(call[0]).toHaveProperty('where');
    }
    expect(result.expiringSubscriptions).toEqual([
      {
        id: 'sub-expiring',
        clinicId: 'c1',
        tier: 'STARTER',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 3 * 86400000),
        amount: 100,
        currency: 'INR',
        clinic: expiringRow.clinic,
      },
    ]);
  });

  it('groups paid revenue into the last six months, zero-filling gaps', async () => {
    mockSubscriptionGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSubscriptionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockSubscriptionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const now = new Date('2026-01-15T12:00:00.000Z');
    const currentMonth = startOfMonth(now);
    mockGetPaidRevenueGroupedByMonth.mockResolvedValue([
      { monthStart: currentMonth, revenueCents: 500000n },
    ]);
    mockPaymentFindMany.mockResolvedValue([]);

    const result = await service.getMetrics();

    expect(result.revenueByMonth).toHaveLength(6);
    expect(
      result.revenueByMonth.find(
        (r) => r.month === formatDate(currentMonth, 'MMM yyyy'),
      ),
    ).toEqual({ month: formatDate(currentMonth, 'MMM yyyy'), revenue: 5000 });
    const otherMonths = result.revenueByMonth.filter(
      (r) => r.month !== formatDate(currentMonth, 'MMM yyyy'),
    );
    expect(otherMonths.every((r) => r.revenue === 0)).toBe(true);
  });

  it('guards the churn denominator when there are no active subscriptions', async () => {
    mockSubscriptionGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSubscriptionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockSubscriptionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetPaidRevenueGroupedByMonth.mockResolvedValue([]);
    mockPaymentFindMany.mockResolvedValue([]);

    const result = await service.getMetrics();

    expect(result.churnRate).toBe(0);
    expect(result.mrr).toBe(0);
    expect(result.revenueByMonth).toHaveLength(6);
  });

  it('maps recent payments through the billing summary shape', async () => {
    mockSubscriptionGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSubscriptionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockSubscriptionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetPaidRevenueGroupedByMonth.mockResolvedValue([]);
    mockPaymentFindMany.mockResolvedValue([
      {
        id: 'pay-1',
        amountCents: 50000,
        currency: 'INR',
        status: 'SUCCESS',
        razorpayPaymentId: 'rzp_123',
        description: null,
        paidAt: new Date('2026-01-10T00:00:00.000Z'),
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        subscription: {
          plan: 'PROFESSIONAL',
          clinic: { id: 'c1', name: 'Clinic One' },
        },
        clinic: { id: 'c1', name: 'Clinic One' },
      },
    ]);

    const result = await service.getMetrics();

    expect(mockPaymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
    expect(result.recentPayments).toEqual([
      {
        id: 'pay-1',
        clinicName: 'Clinic One',
        planLabel: 'PROFESSIONAL',
        amount: 500,
        currency: 'INR',
        status: 'SUCCESS',
        gatewayPaymentId: 'rzp_123',
        description: undefined,
        paidAt: '2026-01-10T00:00:00.000Z',
        createdAt: '2026-01-10T00:00:00.000Z',
      },
    ]);
  });
});

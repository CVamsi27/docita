import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralAccrualService } from './referral-accrual.service';

function makeCtx() {
  const referral = {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const subscriptionPayment = {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { referral, subscriptionPayment } as never;
  const payoutService = {
    accruePayoutForPeriod:
      jest.fn<
        (
          ...args: unknown[]
        ) => Promise<{ created: boolean; amountCents: number }>
      >(),
  };
  const service = new ReferralAccrualService(prisma, payoutService as never);
  return { service, referral, subscriptionPayment, payoutService };
}

const marketingReferral = {
  id: 'ref-1',
  status: 'CONVERTED',
  activationAt: new Date('2026-01-15T00:00:00Z'),
  referredClinicId: 'clinic-referred',
  referrer: {
    id: 'referrer-1',
    type: 'MARKETING_PERSON',
    rewardKind: 'REVENUE_SHARE',
    active: true,
    firstYearOnly: true,
    rateBands: null, // → defaults to 15%/5% special-marketing bands
  },
};

describe('ReferralAccrualService.accrueAllDuePayouts', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('accrues one payout per paid period within the first-year window', async () => {
    ctx.referral.findMany.mockResolvedValue([marketingReferral]);
    ctx.subscriptionPayment.findMany.mockResolvedValue([
      { paidAt: new Date('2026-02-01T00:00:00Z'), amountCents: 249900 },
      { paidAt: new Date('2026-03-01T00:00:00Z'), amountCents: 249900 },
    ]);
    ctx.payoutService.accruePayoutForPeriod.mockResolvedValue({
      created: true,
      amountCents: 37485,
    });

    const result = await ctx.service.accrueAllDuePayouts();

    expect(result).toEqual({ referralsProcessed: 1, payoutsCreated: 2 });
    expect(ctx.payoutService.accruePayoutForPeriod).toHaveBeenCalledTimes(2);
    // Uses the referred clinic + first-year window bounds.
    const paymentQuery = ctx.subscriptionPayment.findMany.mock.calls[0][0] as {
      where: {
        clinicId: string;
        status: string;
        paidAt: { gte: Date; lt: Date };
      };
    };
    expect(paymentQuery.where.clinicId).toBe('clinic-referred');
    expect(paymentQuery.where.status).toBe('paid');
    expect(paymentQuery.where.paidAt.gte).toEqual(
      marketingReferral.activationAt,
    );
    expect(paymentQuery.where.paidAt.lt).toEqual(
      new Date('2027-01-15T00:00:00Z'),
    );
  });

  it('counts only newly-created payouts (idempotent re-run)', async () => {
    ctx.referral.findMany.mockResolvedValue([marketingReferral]);
    ctx.subscriptionPayment.findMany.mockResolvedValue([
      { paidAt: new Date('2026-02-01T00:00:00Z'), amountCents: 249900 },
    ]);
    ctx.payoutService.accruePayoutForPeriod.mockResolvedValue({
      created: false,
      amountCents: 37485,
    });

    const result = await ctx.service.accrueAllDuePayouts();
    expect(result.payoutsCreated).toBe(0);
  });

  it('does nothing when there are no due referrals', async () => {
    ctx.referral.findMany.mockResolvedValue([]);
    const result = await ctx.service.accrueAllDuePayouts();
    expect(result).toEqual({ referralsProcessed: 0, payoutsCreated: 0 });
    expect(ctx.subscriptionPayment.findMany).not.toHaveBeenCalled();
  });
});

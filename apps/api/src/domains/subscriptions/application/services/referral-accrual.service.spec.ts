import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralAccrualService } from './referral-accrual.service';

function makeCtx() {
  const repo = {
    findDueRevenueShareReferrals:
      jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findPaidPeriodsInWindow: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findExistingPayout: jest.fn(),
    createPayout: jest.fn(),
  };
  const payoutService = {
    accruePayoutForPeriod:
      jest.fn<
        (...a: unknown[]) => Promise<{ created: boolean; amountCents: number }>
      >(),
  };
  const service = new ReferralAccrualService(
    repo as never,
    payoutService as never,
  );
  return { service, repo, payoutService };
}

const marketingReferral = {
  id: 'ref-1',
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
    ctx.repo.findDueRevenueShareReferrals.mockResolvedValue([
      marketingReferral,
    ]);
    ctx.repo.findPaidPeriodsInWindow.mockResolvedValue([
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
    // Queries the referred clinic's paid periods within [activation, +12 months).
    expect(ctx.repo.findPaidPeriodsInWindow).toHaveBeenCalledWith(
      'clinic-referred',
      marketingReferral.activationAt,
      new Date('2027-01-15T00:00:00Z'),
    );
  });

  it('counts only newly-created payouts (idempotent re-run)', async () => {
    ctx.repo.findDueRevenueShareReferrals.mockResolvedValue([
      marketingReferral,
    ]);
    ctx.repo.findPaidPeriodsInWindow.mockResolvedValue([
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
    ctx.repo.findDueRevenueShareReferrals.mockResolvedValue([]);
    const result = await ctx.service.accrueAllDuePayouts();
    expect(result).toEqual({ referralsProcessed: 0, payoutsCreated: 0 });
    expect(ctx.repo.findPaidPeriodsInWindow).not.toHaveBeenCalled();
  });
});

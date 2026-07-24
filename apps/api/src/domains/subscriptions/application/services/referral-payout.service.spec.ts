import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralPayoutService } from './referral-payout.service';
import { DEFAULT_SPECIAL_MARKETING_RATE_BANDS } from '@/domains/subscriptions/core/services/referral-reward.rules';

function makeCtx() {
  const repo = {
    findExistingPayout:
      jest.fn<(...a: unknown[]) => Promise<{ id: string } | null>>(),
    createPayout: jest.fn<(...a: unknown[]) => Promise<void>>(
      async () => undefined,
    ),
    findDueRevenueShareReferrals: jest.fn(),
    findPaidPeriodsInWindow: jest.fn(),
  };
  return { service: new ReferralPayoutService(repo as never), repo };
}

const base = {
  referralId: 'ref-1',
  referrerId: 'referrer-1',
  activationAt: new Date('2026-01-15T00:00:00Z'),
  periodEnd: new Date('2026-02-14T00:00:00Z'),
  paidRevenueCents: 249900, // ₹2499
  rateBands: DEFAULT_SPECIAL_MARKETING_RATE_BANDS,
};

describe('ReferralPayoutService.accruePayoutForPeriod', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('creates a payout row for a first-year 15% month', async () => {
    ctx.repo.findExistingPayout.mockResolvedValue(null);

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2026-03-01T00:00:00Z'), // month 3 → 15%
    });

    expect(result).toEqual({ created: true, amountCents: 37485 });
    expect(ctx.repo.createPayout).toHaveBeenCalledTimes(1);
    const arg = ctx.repo.createPayout.mock.calls[0][0] as {
      ratePercent: number;
      amountCents: number;
      baseRevenueCents: number;
    };
    expect(arg.ratePercent).toBe(15);
    expect(arg.amountCents).toBe(37485);
    expect(arg.baseRevenueCents).toBe(249900);
  });

  it('does not create a row after the first year (idempotent no-op)', async () => {
    ctx.repo.findExistingPayout.mockResolvedValue(null);

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2027-02-01T00:00:00Z'), // month 13 → 0
    });

    expect(result).toEqual({ created: false, amountCents: 0 });
    expect(ctx.repo.createPayout).not.toHaveBeenCalled();
  });

  it('is idempotent — never double-pays an already-recorded period', async () => {
    ctx.repo.findExistingPayout.mockResolvedValue({ id: 'existing' });

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2026-03-01T00:00:00Z'),
    });

    expect(result).toEqual({ created: false, amountCents: 37485 });
    expect(ctx.repo.createPayout).not.toHaveBeenCalled();
  });

  it('creates nothing when the period has zero paid revenue', async () => {
    ctx.repo.findExistingPayout.mockResolvedValue(null);

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      paidRevenueCents: 0,
      periodStart: new Date('2026-03-01T00:00:00Z'),
    });

    expect(result).toEqual({ created: false, amountCents: 0 });
    expect(ctx.repo.createPayout).not.toHaveBeenCalled();
  });
});

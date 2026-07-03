import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralPayoutService } from './referral-payout.service';
import { DEFAULT_SPECIAL_MARKETING_RATE_BANDS } from '@/domains/subscriptions/core/services/referral-reward.rules';

function makeService() {
  const referralPayout = {
    findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { referralPayout } as never;
  return { service: new ReferralPayoutService(prisma), referralPayout };
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
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it('creates a payout row for a first-year 15% month', async () => {
    ctx.referralPayout.findUnique.mockResolvedValue(null);
    ctx.referralPayout.create.mockResolvedValue({});

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2026-03-01T00:00:00Z'), // month 3 → 15%
    });

    expect(result).toEqual({ created: true, amountCents: 37485 });
    expect(ctx.referralPayout.create).toHaveBeenCalledTimes(1);
    const arg = ctx.referralPayout.create.mock.calls[0][0] as {
      data: {
        ratePercent: number;
        amountCents: number;
        baseRevenueCents: number;
      };
    };
    expect(arg.data.ratePercent).toBe(15);
    expect(arg.data.amountCents).toBe(37485);
    expect(arg.data.baseRevenueCents).toBe(249900);
  });

  it('does not create a row after the first year (idempotent no-op)', async () => {
    ctx.referralPayout.findUnique.mockResolvedValue(null);

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2027-02-01T00:00:00Z'), // month 13 → 0
    });

    expect(result).toEqual({ created: false, amountCents: 0 });
    expect(ctx.referralPayout.create).not.toHaveBeenCalled();
  });

  it('is idempotent — never double-pays an already-recorded period', async () => {
    ctx.referralPayout.findUnique.mockResolvedValue({ id: 'existing' });

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      periodStart: new Date('2026-03-01T00:00:00Z'),
    });

    expect(result).toEqual({ created: false, amountCents: 37485 });
    expect(ctx.referralPayout.create).not.toHaveBeenCalled();
  });

  it('creates nothing when the period has zero paid revenue', async () => {
    ctx.referralPayout.findUnique.mockResolvedValue(null);

    const result = await ctx.service.accruePayoutForPeriod({
      ...base,
      paidRevenueCents: 0,
      periodStart: new Date('2026-03-01T00:00:00Z'),
    });

    expect(result).toEqual({ created: false, amountCents: 0 });
    expect(ctx.referralPayout.create).not.toHaveBeenCalled();
  });
});

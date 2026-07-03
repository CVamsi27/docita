import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalReferralService } from './internal-referral.service';

function makeCtx() {
  const referrer = {
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const referralPayout = {
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    groupBy: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { referrer, referralPayout } as never;
  return {
    service: new InternalReferralService(prisma),
    referrer,
    referralPayout,
  };
}

describe('InternalReferralService', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('defaults a MARKETING_PERSON to REVENUE_SHARE with the 15%/5% bands', async () => {
    ctx.referrer.create.mockResolvedValue({ id: 'r1' });

    await ctx.service.createReferrer({
      type: 'MARKETING_PERSON',
      name: 'Priya (partner)',
    });

    const data = (
      ctx.referrer.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.rewardKind).toBe('REVENUE_SHARE');
    expect(data.rateBands).toEqual([
      { fromMonth: 1, toMonth: 6, percent: 15 },
      { fromMonth: 7, toMonth: 12, percent: 5 },
    ]);
    expect(data.firstYearOnly).toBe(true);
  });

  it('defaults a CLINIC referrer to CREDIT_MONTHS (no rate bands)', async () => {
    ctx.referrer.create.mockResolvedValue({ id: 'r2' });

    await ctx.service.createReferrer({
      type: 'CLINIC',
      name: 'Sunrise Clinic',
    });

    const data = (
      ctx.referrer.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.rewardKind).toBe('CREDIT_MONTHS');
  });

  it('marks a payable payout paid', async () => {
    ctx.referralPayout.updateMany.mockResolvedValue({ count: 1 });
    ctx.referralPayout.findUnique.mockResolvedValue({
      id: 'p1',
      status: 'PAID',
    });

    const result = await ctx.service.markPayoutPaid('p1');

    expect(result).toEqual({ id: 'p1', status: 'PAID' });
    const where = (
      ctx.referralPayout.updateMany.mock.calls[0][0] as {
        where: { id: string; status: { in: string[] } };
      }
    ).where;
    expect(where.id).toBe('p1');
    expect(where.status.in).toEqual(['PENDING', 'APPROVED']);
  });

  it('rejects marking a non-payable payout', async () => {
    ctx.referralPayout.updateMany.mockResolvedValue({ count: 0 });

    await expect(ctx.service.markPayoutPaid('p1')).rejects.toThrow(
      'not in a payable state',
    );
  });
});

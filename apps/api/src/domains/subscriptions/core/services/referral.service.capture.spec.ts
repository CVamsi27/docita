import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReferralService } from './referral.service';

function makeCtx() {
  const referral = {
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const clinic = {
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { referral, clinic } as never;
  const clock = { now: () => new Date('2026-07-02T00:00:00Z') } as never;
  return { service: new ReferralService(prisma, clock), referral, clinic };
}

describe('ReferralService.captureReferralAtSignup', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('links a SIGNED_UP referral for a valid referrer code', async () => {
    ctx.referral.findFirst.mockResolvedValue(null);
    ctx.clinic.findUnique.mockResolvedValue({ id: 'referrer-clinic' });
    ctx.referral.create.mockResolvedValue({ id: 'new-ref' });

    const result = await ctx.service.captureReferralAtSignup({
      clinicId: 'referred-clinic',
      clinicEmail: 'new@clinic.test',
      referralCode: 'ABC123',
    });

    expect(result).toEqual({ linked: true });
    const data = (
      ctx.referral.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data).toMatchObject({
      referrerClinicId: 'referrer-clinic',
      referredClinicId: 'referred-clinic',
      referralCode: 'ABC123',
      status: 'SIGNED_UP',
    });
  });

  it('does not re-link a clinic that already has a referral (one-per-clinic)', async () => {
    ctx.referral.findFirst.mockResolvedValue({ id: 'existing' });

    const result = await ctx.service.captureReferralAtSignup({
      clinicId: 'referred-clinic',
      clinicEmail: null,
      referralCode: 'ABC123',
    });

    expect(result).toEqual({ linked: false });
    expect(ctx.referral.create).not.toHaveBeenCalled();
  });

  it('rejects a blank code, unknown code, and self-referral', async () => {
    // blank
    expect(
      await ctx.service.captureReferralAtSignup({
        clinicId: 'c',
        clinicEmail: null,
        referralCode: '   ',
      }),
    ).toEqual({ linked: false });

    // unknown code
    ctx.referral.findFirst.mockResolvedValue(null);
    ctx.clinic.findUnique.mockResolvedValue(null);
    expect(
      await ctx.service.captureReferralAtSignup({
        clinicId: 'c',
        clinicEmail: null,
        referralCode: 'NOPE',
      }),
    ).toEqual({ linked: false });

    // self-referral
    ctx.clinic.findUnique.mockResolvedValue({ id: 'c' });
    expect(
      await ctx.service.captureReferralAtSignup({
        clinicId: 'c',
        clinicEmail: null,
        referralCode: 'SELF',
      }),
    ).toEqual({ linked: false });

    expect(ctx.referral.create).not.toHaveBeenCalled();
  });
});

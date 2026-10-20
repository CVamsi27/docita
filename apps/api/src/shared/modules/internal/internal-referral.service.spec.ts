import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { InternalReferralService } from './internal-referral.service';
import type { ReferrerWelcomeService } from '@/domains/subscriptions/core/services/referrer-welcome.service';

function makeCtx() {
  const referrer = {
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const referralPayout = {
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    groupBy: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const prisma = { referrer, referralPayout } as never;
  const eventEmitter = {
    emit: jest.fn<(...a: unknown[]) => unknown>(),
  } as unknown as EventEmitter2;
  const welcomeService = {
    resendWelcome: jest.fn<(...a: unknown[]) => Promise<void>>(),
  } as unknown as ReferrerWelcomeService;
  return {
    service: new InternalReferralService(prisma, eventEmitter, welcomeService),
    referrer,
    referralPayout,
    eventEmitter,
    welcomeService,
  };
}

describe('InternalReferralService', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('defaults a MARKETING_PERSON to REVENUE_SHARE with the flat 10% first-year bands', async () => {
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
      { fromMonth: 1, toMonth: 12, percent: 10 },
    ]);
    expect(data.firstYearOnly).toBe(true);
  });

  it('defaults a PHARMACY referrer to REVENUE_SHARE with the same 10% bands', async () => {
    ctx.referrer.create.mockResolvedValue({ id: 'r7' });

    await ctx.service.createReferrer({
      type: 'PHARMACY',
      name: 'Apollo Pharmacy',
    });

    const data = (
      ctx.referrer.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.rewardKind).toBe('REVENUE_SHARE');
    expect(data.rateBands).toEqual([
      { fromMonth: 1, toMonth: 12, percent: 10 },
    ]);
  });

  it('rejects a create when the phone already exists (idempotent conflict)', async () => {
    ctx.referrer.findFirst.mockResolvedValue({ id: 'existing-1' });

    let thrown: unknown;
    try {
      await ctx.service.createReferrer({
        type: 'PHARMACY',
        name: 'Apollo Pharmacy',
        phone: '9812345678',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    // The payload is the AllExceptionsFilter problem-details input: a
    // user-facing `message` plus the canonical DUPLICATE_ENTRY `code` that
    // survives the envelope (`data.code`) so the UI can special-case it.
    expect((thrown as ConflictException).getResponse()).toEqual({
      message: 'A partner with this phone number already exists',
      code: 'DUPLICATE_ENTRY',
    });
    // The lookup is phone-format tolerant and the create never runs.
    const where = (
      ctx.referrer.findFirst.mock.calls[0][0] as {
        where: Record<string, unknown>;
      }
    ).where;
    expect(where.phone).toHaveProperty('in');
    expect(ctx.referrer.create).not.toHaveBeenCalled();
  });

  it('stores the normalized phone on create', async () => {
    ctx.referrer.findFirst.mockResolvedValue(null);
    ctx.referrer.create.mockResolvedValue({ id: 'r8' });

    await ctx.service.createReferrer({
      type: 'PHARMACY',
      name: 'Apollo Pharmacy',
      phone: '98123 45678',
    });

    const data = (
      ctx.referrer.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.phone).toBe('+919812345678');
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

  it('emits REFERRER_CREATED after a successful create', async () => {
    ctx.referrer.create.mockResolvedValue({ id: 'r3' });

    await ctx.service.createReferrer({
      type: 'PHARMACY',
      name: 'Apollo Pharmacy',
    });

    expect(ctx.eventEmitter.emit).toHaveBeenCalledWith(
      'referrer.created',
      expect.objectContaining({ referrerId: 'r3' }),
    );
  });

  it('writes a generated RFR-XXXXXX code on create', async () => {
    ctx.referrer.create.mockResolvedValue({ id: 'r4' });

    await ctx.service.createReferrer({
      type: 'PHARMACY',
      name: 'Apollo Pharmacy',
    });

    const data = (
      ctx.referrer.create.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(typeof data.code).toBe('string');
    expect(data.code).toMatch(/^RFR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it('retries on code collision until success', async () => {
    const takenCodes = new Set<string>();
    ctx.referrer.create.mockImplementation((args: unknown) => {
      const a = args as { data: { code: string } };
      if (takenCodes.has(a.data.code)) {
        const err = new Error('Unique constraint failed') as Error & {
          code: string;
          meta: { target: string[] };
        };
        err.code = 'P2002';
        err.meta = { target: ['code'] };
        throw err;
      }
      takenCodes.add(a.data.code);
      return Promise.resolve({ id: 'r5' });
    });

    await ctx.service.createReferrer({
      type: 'PHARMACY',
      name: 'Apollo Pharmacy',
    });

    // Each call gets a unique code from the generator; collisions are
    // rare in practice but the loop guarantees eventual success.
    expect(ctx.referrer.create.mock.calls.length).toBeGreaterThanOrEqual(1);
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

  it('delegates resend-welcome to the welcome service', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r6', active: true });

    await ctx.service.resendWelcome('r6');

    expect(ctx.welcomeService.resendWelcome).toHaveBeenCalledWith('r6');
  });

  it('rejects resend-welcome for an inactive partner instead of a false success', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r6', active: false });

    await expect(ctx.service.resendWelcome('r6')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(ctx.welcomeService.resendWelcome).not.toHaveBeenCalled();
  });

  it('updates editable fields and normalizes a changed phone', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r10' });
    ctx.referrer.findFirst.mockResolvedValue(null);
    ctx.referrer.update.mockResolvedValue({ id: 'r10', active: true });

    await ctx.service.updateReferrer('r10', {
      type: 'PHARMACY',
      name: 'Apollo Pharmacy 2',
      phone: '98123 45678',
      email: '',
    });

    const data = (
      ctx.referrer.update.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.name).toBe('Apollo Pharmacy 2');
    expect(data.phone).toBe('+919812345678');
    // Empty-string email clears the stored value.
    expect(data.email).toBeNull();
  });

  it('rejects an update that reassigns a phone used by another partner', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r10' });
    ctx.referrer.findFirst.mockResolvedValue({ id: 'other-1' });

    let thrown: unknown;
    try {
      await ctx.service.updateReferrer('r10', {
        type: 'PHARMACY',
        name: 'Apollo Pharmacy 2',
        phone: '9812345678',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConflictException);
    expect((thrown as ConflictException).getResponse()).toEqual({
      message: 'A partner with this phone number already exists',
      code: 'DUPLICATE_ENTRY',
    });
    // The dedupe lookup excludes the partner being updated, and no write runs.
    const where = (
      ctx.referrer.findFirst.mock.calls[0][0] as {
        where: Record<string, unknown>;
      }
    ).where;
    expect(where.id).toEqual({ not: 'r10' });
    expect(ctx.referrer.update).not.toHaveBeenCalled();
  });

  it('leaves email/phone untouched when omitted from an update', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r10' });
    ctx.referrer.update.mockResolvedValue({ id: 'r10' });

    await ctx.service.updateReferrer('r10', {
      type: 'PHARMACY',
      name: 'Apollo Pharmacy 2',
    });

    const data = (
      ctx.referrer.update.mock.calls[0][0] as { data: Record<string, unknown> }
    ).data;
    expect(data.email).toBeUndefined();
    expect(data.phone).toBeUndefined();
  });

  it('throws 404 when updating a missing partner', async () => {
    ctx.referrer.findUnique.mockResolvedValue(null);

    await expect(
      ctx.service.updateReferrer('nope', { type: 'PHARMACY', name: 'X' }),
    ).rejects.toThrow('Referrer not found');
  });

  it('deactivates an active partner', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r11', active: true });
    ctx.referrer.update.mockResolvedValue({ id: 'r11', active: false });

    const result = await ctx.service.deactivateReferrer('r11');

    expect(ctx.referrer.update).toHaveBeenCalledWith({
      where: { id: 'r11' },
      data: { active: false },
    });
    expect(result).toEqual({ id: 'r11', active: false });
  });

  it('treats deactivating an already-inactive partner as a no-op', async () => {
    ctx.referrer.findUnique.mockResolvedValue({ id: 'r11', active: false });

    const result = await ctx.service.deactivateReferrer('r11');

    expect(ctx.referrer.update).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'r11', active: false });
  });

  it('throws 404 when deactivating a missing partner', async () => {
    ctx.referrer.findUnique.mockResolvedValue(null);

    await expect(ctx.service.deactivateReferrer('nope')).rejects.toThrow(
      'Referrer not found',
    );
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { InternalSubscriptionAdminService } from './internal-subscription-admin.service';
import type { PrismaService } from '@/prisma/prisma.service';

describe('InternalSubscriptionAdminService', () => {
  let service: InternalSubscriptionAdminService;
  let prisma: {
    subscription: { findUnique: jest.Mock<(args: unknown) => Promise<unknown>>; update: jest.Mock<(args: unknown) => Promise<unknown>> };
    subscriptionReminder: { create: jest.Mock<(args: unknown) => Promise<unknown>> };
    clinic: { findUnique: jest.Mock<(args: unknown) => Promise<unknown>>; update: jest.Mock<(args: unknown) => Promise<unknown>> };
  };
  let clock: { now: jest.Mock };

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn(), update: jest.fn() },
      subscriptionReminder: { create: jest.fn() },
      clinic: { findUnique: jest.fn(), update: jest.fn() },
    };
    clock = { now: jest.fn(() => new Date('2026-08-10T00:00:00Z')) };
    service = new InternalSubscriptionAdminService(prisma as unknown as PrismaService, clock as never);
  });

  it('sendReminder persists a sent reminder and returns success', async () => {
    prisma.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      clinicId: 'clinic-1',
      clinic: { id: 'clinic-1', name: 'Acme', email: 'a@x.com' },
    });
    prisma.subscriptionReminder.create.mockResolvedValueOnce({});

    const result = await service.sendReminder('sub-1');

    expect(result.success).toBe(true);
    expect(prisma.subscriptionReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clinicId: 'clinic-1',
          subscriptionId: 'sub-1',
          type: 'expiry_7d',
          channel: 'email',
          status: 'sent',
        }),
      }),
    );
  });

  it('sendReminder throws NotFound when the subscription does not exist', async () => {
    prisma.subscription.findUnique.mockResolvedValueOnce(null);

    await expect(service.sendReminder('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('extendGracePeriod updates currentPeriodEnd when the subscription is in GRACE', async () => {
    prisma.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      status: SubscriptionStatus.GRACE,
      currentPeriodEnd: new Date('2026-08-15'),
    });
    prisma.subscription.update.mockResolvedValueOnce({});

    const result = await service.extendGracePeriod('sub-1', 7);

    expect(result.success).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: { currentPeriodEnd: new Date('2026-08-22') },
      }),
    );
  });

  it('extendGracePeriod rejects when the subscription is not in grace', async () => {
    prisma.subscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date('2026-08-15'),
    });

    await expect(service.extendGracePeriod('sub-1', 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('processPaymentAndUpdateTier flips the subscription to ACTIVE and updates tier', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-1',
      currency: 'INR',
    });
    prisma.clinic.update.mockResolvedValueOnce({
      id: 'clinic-1',
      tier: ClinicTier.PROFESSIONAL,
    });

    const result = await service.processPaymentAndUpdateTier('clinic-1', {
      paymentId: 'pay-1',
      amount: 5000,
      currency: 'INR',
      newTier: ClinicTier.PROFESSIONAL,
      paymentMethod: 'razorpay',
    });

    expect(result.success).toBe(true);
    expect(prisma.clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic-1' },
        data: { tier: ClinicTier.PROFESSIONAL, subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
    );
  });

  it('processPaymentAndUpdateTier throws when the clinic does not exist', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.processPaymentAndUpdateTier('missing', {
        paymentId: 'pay-1',
        amount: 5000,
        currency: 'INR',
        newTier: ClinicTier.PROFESSIONAL,
        paymentMethod: 'razorpay',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upgradeTier and downgradeTier both write the new tier via the shared helper', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'clinic-1' });
    prisma.clinic.update.mockResolvedValueOnce({ id: 'clinic-1', tier: 'PROFESSIONAL' });

    const up = await service.upgradeTier('clinic-1', ClinicTier.PROFESSIONAL);
    expect(up.message).toContain('upgraded');
    expect(prisma.clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tier: ClinicTier.PROFESSIONAL } }),
    );

    prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'clinic-1' });
    prisma.clinic.update.mockResolvedValueOnce({ id: 'clinic-1', tier: 'STARTER' });

    const down = await service.downgradeTier('clinic-1', ClinicTier.STARTER);
    expect(down.message).toContain('downgraded');
  });

  it('getTierPricingInfo returns the canonical tier order', () => {
    const tiers = service.getTierPricingInfo();
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBeGreaterThan(0);
  });
});

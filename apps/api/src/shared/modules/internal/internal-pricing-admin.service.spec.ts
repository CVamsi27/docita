import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InternalPricingAdminService } from './internal-pricing-admin.service';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import type { PrismaService } from '@/prisma/prisma.service';

describe('InternalPricingAdminService', () => {
  let service: InternalPricingAdminService;
  let prisma: {
    tierPricing: {
      findMany: jest.Mock<(args: unknown) => Promise<unknown>>;
      update: jest.Mock<(args: unknown) => Promise<unknown>>;
    };
    featureFlag: {
      findMany: jest.Mock<(args: unknown) => Promise<unknown>>;
      findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
      update: jest.Mock<(args: unknown) => Promise<unknown>>;
      create: jest.Mock<(args: unknown) => Promise<unknown>>;
      deleteMany: jest.Mock<(args: unknown) => Promise<unknown>>;
    };
  };
  let events: { emit: jest.Mock };

  beforeEach(() => {
    prisma = {
      tierPricing: { findMany: jest.fn(), update: jest.fn() },
      featureFlag: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    events = { emit: jest.fn() };
    service = new InternalPricingAdminService(
      prisma as unknown as PrismaService,
      events as unknown as EventEmitter2,
    );
  });

  it('returns pricing tiers ordered by display order', async () => {
    const tiers = [{ id: 'tier-1', displayOrder: 0 }];
    prisma.tierPricing.findMany.mockResolvedValueOnce(tiers);

    const result = await service.getPricingTiers();

    expect(result).toEqual(tiers);
    expect(prisma.tierPricing.findMany).toHaveBeenCalledWith({
      orderBy: { displayOrder: 'asc' },
    });
  });

  it('updatePricingTier allows only whitelisted keys and busts the in-process cache via event', async () => {
    const updated = { id: 'tier-1', monthlyBasePriceCents: 1000 };
    prisma.tierPricing.update.mockResolvedValueOnce(updated);

    const result = await service.updatePricingTier('tier-1', {
      monthlyBasePriceCents: 1000,
      // Whitelist drops this — even though it's a real column it's not editable
      // from this admin surface (admin-tier only).
      description: 'new description',
      // Definitely not in the whitelist — must be dropped.
      secretField: 'leak attempt',
    });

    expect(result).toEqual(updated);
    expect(prisma.tierPricing.update).toHaveBeenCalledWith({
      where: { id: 'tier-1' },
      data: {
        monthlyBasePriceCents: 1000,
        description: 'new description',
      },
    });
    expect(events.emit).toHaveBeenCalledWith(
      ApplicationEvents.TIER_PRICING_UPDATED,
      { tierId: 'tier-1' },
    );
  });

  it('getPricingOffers returns parsed offers with clinic info', async () => {
    prisma.featureFlag.findMany.mockResolvedValueOnce([
      {
        id: 'flag-1',
        clinicId: 'clinic-1',
        value: {
          title: 'Launch offer',
          description: 'Save 20%',
          percentOff: 20,
          validUntil: '2026-12-31',
          durationMonths: 6,
        },
        updatedAt: new Date('2026-08-01'),
        clinic: {
          id: 'clinic-1',
          name: 'Acme',
          email: 'a@x.com',
          tier: 'STARTER',
        },
      },
      // Missing clinicId — must be filtered out.
      {
        id: 'flag-2',
        clinicId: null,
        value: null,
        updatedAt: new Date(),
        clinic: null,
      },
    ]);

    const result = await service.getPricingOffers();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'flag-1',
      clinicId: 'clinic-1',
      percentOff: 20,
      title: 'Launch offer',
    });
  });

  it('upsertPricingOffer updates an existing flag rather than creating a duplicate', async () => {
    prisma.featureFlag.findFirst.mockResolvedValueOnce({ id: 'flag-1' });
    prisma.featureFlag.update.mockResolvedValueOnce({
      id: 'flag-1',
      clinicId: 'clinic-1',
      updatedAt: new Date('2026-08-10'),
    });

    const result = await service.upsertPricingOffer('clinic-1', {
      title: 'Updated',
      percentOff: 15,
    });

    expect(prisma.featureFlag.create).not.toHaveBeenCalled();
    expect(prisma.featureFlag.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'flag-1' },
        data: expect.objectContaining({
          description: 'Clinic pricing offer',
        }),
      }),
    );
    expect(result.title).toBe('Updated');
  });

  it('upsertPricingOffer creates a new flag when none exists', async () => {
    prisma.featureFlag.findFirst.mockResolvedValueOnce(null);
    prisma.featureFlag.create.mockResolvedValueOnce({
      id: 'flag-new',
      clinicId: 'clinic-2',
      updatedAt: new Date('2026-08-10'),
    });

    await service.upsertPricingOffer('clinic-2', {
      title: 'New',
      percentOff: 10,
    });

    expect(prisma.featureFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'clinic_pricing_offer',
          clinicId: 'clinic-2',
        }),
      }),
    );
  });

  it('deletePricingOffer removes the flag rows for the clinic', async () => {
    prisma.featureFlag.deleteMany.mockResolvedValueOnce({ count: 1 });

    await service.deletePricingOffer('clinic-1');

    expect(prisma.featureFlag.deleteMany).toHaveBeenCalledWith({
      where: { key: 'clinic_pricing_offer', clinicId: 'clinic-1' },
    });
  });
});

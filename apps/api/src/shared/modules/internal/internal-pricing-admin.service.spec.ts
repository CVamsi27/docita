import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InternalPricingAdminService } from './internal-pricing-admin.service';

describe('InternalPricingAdminService.updatePricingTier', () => {
  let service: InternalPricingAdminService;
  let prismaUpdate: jest.Mock<(args: unknown) => Promise<{ id: string }>>;
  let events: EventEmitter2;
  let emitSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    prismaUpdate = jest
      .fn<(args: unknown) => Promise<{ id: string }>>()
      .mockResolvedValue({ id: 'tier-1' });

    const prisma = {
      tierPricing: { update: prismaUpdate },
      featureFlag: { findMany: jest.fn() },
    };

    events = new EventEmitter2();
    emitSpy = jest.spyOn(events, 'emit');

    service = new InternalPricingAdminService(
      prisma as never,
      events,
    );
  });

  it('emits tierPricing.updated after a successful update', async () => {
    await service.updatePricingTier('tier-1', {
      monthlyBasePriceCents: 9900,
    });

    expect(emitSpy).toHaveBeenCalledWith('tierPricing.updated', {
      tierId: 'tier-1',
    });
  });

  it('strips unknown keys before persisting', async () => {
    await service.updatePricingTier('tier-1', {
      monthlyBasePriceCents: 9900,
      secretField: 'leak',
    });

    const updateArg = prismaUpdate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty('secretField');
    expect(updateArg.data).toHaveProperty('monthlyBasePriceCents', 9900);
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { BadRequestException } from '@nestjs/common';
import { ClinicOperationsAdapter } from './clinic-operations.adapter';
import type { PrismaService } from '@/prisma/prisma.service';
import type { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

type ClinicUpdateArgs = {
  where: { id: string };
  data: {
    tier?: ClinicTier;
    subscriptionStatus?: SubscriptionStatus;
    features?: Record<string, boolean>;
    planMode?: string;
  };
};

/**
 * U01 — plan changes must reach access decisions.
 *
 * Tier/plan/feature writes land on `Clinic`, but guards read through
 * `ClinicAuthCacheService`. The invalidation call in `updateTierAndFeatures`
 * is the only bridge between the two: without it a downgraded clinic keeps
 * its old entitlements until the cache TTL expires. These tests pin that
 * bridge, plus the merge semantics that keep unrelated feature flags intact.
 */
describe('ClinicOperationsAdapter', () => {
  let findUnique: jest.Mock<
    (args: unknown) => Promise<{ features: unknown } | null>
  >;
  let update: jest.Mock<(args: ClinicUpdateArgs) => Promise<unknown>>;
  let invalidate: jest.Mock<(clinicId: string) => void>;
  let adapter: ClinicOperationsAdapter;

  beforeEach(() => {
    findUnique = jest
      .fn<(args: unknown) => Promise<{ features: unknown } | null>>()
      .mockResolvedValue({ features: { whatsapp: true, staleFlag: 'yes' } });
    update = jest
      .fn<(args: ClinicUpdateArgs) => Promise<unknown>>()
      .mockResolvedValue(undefined);
    invalidate = jest.fn<(clinicId: string) => void>();

    const prisma = {
      clinic: { findUnique, update },
    } as unknown as PrismaService;
    const cache = { invalidate } as unknown as ClinicAuthCacheService;

    adapter = new ClinicOperationsAdapter(prisma, undefined, cache);
  });

  it('invalidates the entitlement cache after a plan change persists', async () => {
    await adapter.updateTierAndFeatures(
      'clinic-1',
      ClinicTier.STARTER,
      SubscriptionStatus.ACTIVE,
      { aiCredits: false },
      'FULL',
    );

    expect(update).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith('clinic-1');
  });

  it('invalidates only after the write succeeds', async () => {
    update.mockRejectedValueOnce(new Error('db write failed'));

    await expect(
      adapter.updateTierAndFeatures(
        'clinic-1',
        ClinicTier.STARTER,
        SubscriptionStatus.ACTIVE,
        {},
      ),
    ).rejects.toThrow('db write failed');

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does not invalidate when the tier/status pair is rejected outright', async () => {
    await expect(
      adapter.updateTierAndFeatures(
        'clinic-1',
        'NOT_A_TIER',
        SubscriptionStatus.ACTIVE,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('merges persisted boolean feature flags and drops non-boolean leftovers', async () => {
    await adapter.updateTierAndFeatures(
      'clinic-1',
      ClinicTier.PROFESSIONAL,
      SubscriptionStatus.ACTIVE,
      { aiCredits: true },
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      select: { features: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      data: {
        tier: ClinicTier.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        features: { whatsapp: true, aiCredits: true },
      },
    });
  });

  it('writes the plan mode when supplied and omits it otherwise', async () => {
    await adapter.updateTierAndFeatures(
      'clinic-1',
      ClinicTier.ESSENTIAL,
      SubscriptionStatus.ACTIVE,
      {},
      'FRONT_DESK',
    );
    expect(update.mock.calls[0][0].data.planMode).toBe('FRONT_DESK');

    await adapter.updateTierAndFeatures(
      'clinic-1',
      ClinicTier.ESSENTIAL,
      SubscriptionStatus.ACTIVE,
      {},
    );
    expect(update.mock.calls[1][0].data.planMode).toBeUndefined();
  });

  it('still completes a plan change when no cache instance is wired', async () => {
    const prisma = {
      clinic: { findUnique, update },
    } as unknown as PrismaService;
    const bare = new ClinicOperationsAdapter(prisma);

    await expect(
      bare.updateTierAndFeatures(
        'clinic-1',
        ClinicTier.STARTER,
        SubscriptionStatus.ACTIVE,
        {},
      ),
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
  });
});

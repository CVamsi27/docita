import { AiCreditGuardService } from './ai-credit-guard.service';
import type { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';

/**
 * These cover the only path that runs in production today: with no tier priced
 * (all AI_CREDIT_ALLOTMENT_BY_TIER entries null), the guard must allow every
 * call without touching the database. The over-allotment decision itself is
 * unit-tested via the pure isAiCreditExhausted helper in @workspace/types.
 */
describe('AiCreditGuardService (inert default)', () => {
  function setup() {
    const findUnique = jest.fn();
    const aggregate = jest.fn();
    const prisma = {
      clinic: { findUnique },
      usageEvent: { aggregate },
    } as unknown as PrismaService;
    const service = new AiCreditGuardService(prisma, createFixedClockMock());
    return { service, findUnique, aggregate };
  }

  it('allows without a DB lookup when clinicId is missing', async () => {
    const { service, findUnique } = setup();

    await expect(service.assertWithinAllotment(null)).resolves.toBeUndefined();
    await expect(
      service.assertWithinAllotment(undefined),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('allows without any DB lookup while no tier is priced (the default)', async () => {
    const { service, findUnique, aggregate } = setup();

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
  });
});

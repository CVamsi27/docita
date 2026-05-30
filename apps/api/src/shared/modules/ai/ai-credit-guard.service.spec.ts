import { HttpException } from '@nestjs/common';
import { AiCreditGuardService } from './ai-credit-guard.service';
import type { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';

describe('AiCreditGuardService', () => {
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

  it('allows when the clinic tier has no enforced allotment', async () => {
    const { service, findUnique, aggregate } = setup();
    findUnique.mockResolvedValue({ tier: 'ENTERPRISE' });

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).resolves.toBeUndefined();
    expect(findUnique).toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('allows when usage is below the tier allotment', async () => {
    const { service, findUnique, aggregate } = setup();
    findUnique.mockResolvedValue({ tier: 'ESSENTIAL' });
    aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).resolves.toBeUndefined();
    expect(aggregate).toHaveBeenCalled();
  });

  it('blocks with HTTP 402 when the allotment is exhausted', async () => {
    const { service, findUnique, aggregate } = setup();
    findUnique.mockResolvedValue({ tier: 'STARTER' });
    aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

    await expect(
      service.assertWithinAllotment('clinic-1'),
    ).rejects.toBeInstanceOf(HttpException);
  });
});

import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsageType } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { AiCreditGuardService } from '@/shared/modules/ai/ai-credit-guard.service';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';
import {
  setupTestDatabase,
  resetDatabase,
  closeDatabase,
  getPrismaInstance,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * U01 acceptance clause: "parallel last-unit consumption has one winner".
 *
 * The pre-call AI-credit gate is check-then-allow: every concurrent caller
 * reads the same period sum, so with one credit left all of them pass and the
 * clinic overshoots its allotment. These tests pin the admission race against
 * real PostgreSQL (advisory-lock serialization is not observable on mocks).
 */
describe('AI credit last-unit admission (e2e)', () => {
  let prisma: PrismaService;
  let guard: AiCreditGuardService;
  let clinicId: string;
  const clock = createFixedClockMock(new Date().toISOString());

  beforeAll(async () => {
    setupTestDatabase();
    // getPrismaInstance() hands back the raw test client, not a PrismaService;
    // resolve it through the DI token so the guard receives its declared type
    // without a cast (the same override every sibling e2e spec uses).
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [{ provide: PrismaService, useValue: getPrismaInstance() }],
    }).compile();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
    guard = new AiCreditGuardService(prisma, clock);
  });

  beforeEach(async () => {
    await resetDatabase();
    const clinic = await factories.clinic({ tier: 'STARTER' });
    clinicId = clinic.id;
    // STARTER allotment is 100 credits; seed 99 so exactly one claim fits.
    await prisma.usageEvent.create({
      data: {
        clinicId,
        type: UsageType.AI_CREDITS,
        quantity: 99,
        entityType: 'AIUsage',
        entityId: 'seed',
        eventKey: `ai-credit-seed:${clinicId}`,
        metadata: { feature: 'clinicalNote' },
        timestamp: clock.now(),
      },
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function periodUsed(): Promise<number> {
    const result = await prisma.usageEvent.aggregate({
      where: { clinicId, type: UsageType.AI_CREDITS },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  function isPaymentRequired(result: PromiseSettledResult<unknown>): boolean {
    return (
      result.status === 'rejected' &&
      result.reason instanceof HttpException &&
      result.reason.getStatus() === HttpStatus.PAYMENT_REQUIRED
    );
  }

  it('admits exactly one of many parallel claims on the final credit', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => guard.assertWithinAllotment(clinicId)),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(isPaymentRequired)).toHaveLength(7);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(7);
  });

  it('reserves the claim without billing the clinic', async () => {
    const admission = await guard.assertWithinAllotment(clinicId);
    expect(admission).toBeDefined();

    // Admission is a gate, not a charge: the metered total must not move.
    expect(await periodUsed()).toBe(99);

    const ticket = await prisma.usageEvent.findFirst({
      where: { clinicId, entityType: 'AiCreditAdmission' },
      select: { quantity: true },
    });
    expect(ticket).not.toBeNull();
    expect(ticket?.quantity).toBe(0);
  });

  it('release re-opens admission within the same period', async () => {
    const held = await guard.assertWithinAllotment(clinicId);
    expect(held).toBeDefined();

    // While the claim is in flight the gate is closed for everyone else.
    await expect(guard.assertWithinAllotment(clinicId)).rejects.toBeInstanceOf(
      HttpException,
    );

    await guard.releaseAdmission(held);
    const again = await guard.assertWithinAllotment(clinicId);
    expect(again).toBeDefined();
    await guard.releaseAdmission(again);

    const tickets = await prisma.usageEvent.count({
      where: { clinicId, entityType: 'AiCreditAdmission' },
    });
    expect(tickets).toBe(0);
  });

  it('denies every claim once the period total is exhausted', async () => {
    await prisma.usageEvent.create({
      data: {
        clinicId,
        type: UsageType.AI_CREDITS,
        quantity: 1,
        entityType: 'AIUsage',
        entityId: 'seed-last',
        eventKey: `ai-credit-seed-last:${clinicId}`,
        timestamp: clock.now(),
      },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => guard.assertWithinAllotment(clinicId)),
    );
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(5);
    expect(results.filter(isPaymentRequired)).toHaveLength(5);
  });
});

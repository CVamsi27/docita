import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { QueueJobStatus } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { PrismaQueueJobRepository } from '@/shared/modules/queue/infrastructure/prisma-queue-job.repository';

/**
 * A01 — queue claim fencing.
 *
 * The unit suite proves the service consults the claim token before writing.
 * This suite proves the repository's SQL actually enforces it: a job whose
 * lease was reclaimed must reject the previous owner's acknowledgment even
 * though that worker still holds the job id.
 *
 * The lease-expiry sequence reproduced here is the real one:
 *   1. worker A claims the job (token A)
 *   2. A stalls past the stale timeout
 *   3. stale recovery releases the claim and re-queues the job
 *   4. worker B claims it again (token B)
 *   5. A finally finishes and acknowledges with token A  <- must be rejected
 *   6. B acknowledges with token B                     <- must apply
 */
describe('Queue claim fencing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaQueueJobRepository;

  const QUEUE = 'a01-fence-job';

  const seedJob = async (overrides: Record<string, unknown> = {}) =>
    prisma.queueJob.create({
      data: {
        name: QUEUE,
        data: { key: 'value' },
        status: QueueJobStatus.WAITING,
        maxAttempts: 5,
        ...overrides,
      },
    });

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    repository = new PrismaQueueJobRepository(prisma);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  it('stamps a distinct claim token on each claim of the same job', async () => {
    await seedJob();

    const first = await repository.claimNextWaitingJob(QUEUE);
    const firstToken = first[0].claimToken;
    expect(firstToken).toBeTruthy();
    expect(first[0].status).toBe('ACTIVE');

    // Stale recovery releases the claim, then the job is claimable again.
    await repository.recoverStaleActiveToDelayed(
      QUEUE,
      new Date(Date.now() + 60_000),
      new Date(0),
    );

    const second = await repository.claimNextWaitingJob(QUEUE);
    expect(second[0].claimToken).toBeTruthy();
    expect(second[0].claimToken).not.toBe(firstToken);
  });

  it('rejects the previous owner acknowledgment after the claim is reclaimed', async () => {
    const job = await seedJob();

    // Worker A claims.
    const claimA = await repository.claimNextWaitingJob(QUEUE);
    const tokenA = claimA[0].claimToken as string;
    expect(claimA[0].id).toBe(job.id);

    // A stalls; stale recovery re-queues it, clearing the claim token.
    const released = await repository.recoverStaleActiveToDelayed(
      QUEUE,
      new Date(Date.now() + 60_000),
      new Date(0),
    );
    expect(released.map((r) => r.id)).toContain(job.id);

    // Worker B claims the re-queued job.
    const claimB = await repository.claimNextWaitingJob(QUEUE);
    const tokenB = claimB[0].claimToken as string;
    expect(claimB[0].id).toBe(job.id);

    // A finishes late and acknowledges with its now-stale token.
    const lateAck = await repository.applyClaimTransition(job.id, tokenA, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
    expect(lateAck).toBe(false);

    // The job must still be owned by B, not marked COMPLETED by A.
    const afterLateAck = await prisma.queueJob.findUnique({
      where: { id: job.id },
    });
    expect(afterLateAck?.status).toBe('ACTIVE');
    expect(afterLateAck?.claimToken).toBe(tokenB);
    expect(afterLateAck?.completedAt).toBeNull();

    // B's own acknowledgment applies.
    const ackB = await repository.applyClaimTransition(job.id, tokenB, {
      status: 'COMPLETED',
      completedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(ackB).toBe(true);

    const afterAckB = await prisma.queueJob.findUnique({
      where: { id: job.id },
    });
    expect(afterAckB?.status).toBe('COMPLETED');
    expect(afterAckB?.claimToken).toBeNull();
  });

  it('elects exactly one winner among parallel acknowledgments for one claim', async () => {
    const job = await seedJob();
    const claim = await repository.claimNextWaitingJob(QUEUE);
    const token = claim[0].claimToken as string;

    // Same token, many workers racing to acknowledge it (e.g. an ack retried
    // by a second replica). Exactly one must take effect.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        repository.applyClaimTransition(job.id, token, {
          status: 'COMPLETED',
          completedAt: new Date(),
        }),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    const row = await prisma.queueJob.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe('COMPLETED');
  });

  it('refuses a late acknowledgment once the claim was released without a re-claim', async () => {
    // Stale recovery moves the job to DELAYED and drops the claim. Nobody has
    // re-claimed it yet, but the previous owner's in-flight ack must still be
    // rejected: the token is gone and the job is no longer ACTIVE.
    const job = await seedJob();
    const claimA = await repository.claimNextWaitingJob(QUEUE);
    const tokenA = claimA[0].claimToken as string;

    const released = await repository.recoverStaleActiveToDelayed(
      QUEUE,
      new Date(Date.now() + 60_000),
      new Date(0),
    );
    expect(released.map((r) => r.id)).toContain(job.id);

    expect(
      await repository.applyClaimTransition(job.id, tokenA, {
        status: 'COMPLETED',
        completedAt: new Date(),
      }),
    ).toBe(false);

    const row = await prisma.queueJob.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe('DELAYED');
    expect(row?.claimToken).toBeNull();
    expect(row?.completedAt).toBeNull();
  });

  it('refuses an acknowledgment for a job that holds no active claim', async () => {
    const job = await seedJob();

    // Never claimed: no token, so any acknowledgment is invalid.
    expect(
      await repository.applyClaimTransition(job.id, 'never-issued', {
        status: 'COMPLETED',
      }),
    ).toBe(false);

    const row = await prisma.queueJob.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe('WAITING');
  });

  it('cannot dead-letter a job that a competing worker already completed', async () => {
    const job = await seedJob();
    const claim = await repository.claimNextWaitingJob(QUEUE);
    const token = claim[0].claimToken as string;

    expect(
      await repository.applyClaimTransition(job.id, token, {
        status: 'COMPLETED',
        completedAt: new Date(),
      }),
    ).toBe(true);

    // The token is cleared on completion, so a late retry path cannot reopen
    // the finished job as DEAD_LETTERED.
    expect(
      await repository.applyClaimTransition(job.id, token, {
        status: 'DEAD_LETTERED',
        attemptsMade: 5,
        failedReason: 'late retry',
        deadLetteredAt: new Date(),
      }),
    ).toBe(false);

    const row = await prisma.queueJob.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe('COMPLETED');
    expect(row?.failedReason).toBeNull();
  });

  it('clears the claim token when stale recovery fails the job', async () => {
    // recoverStaleActiveToFailed only claims jobs that exhausted their
    // attempts, so this one starts at the attempt ceiling.
    const job = await seedJob({ attemptsMade: 5, maxAttempts: 5 });
    await repository.claimNextWaitingJob(QUEUE);

    const failed = await repository.recoverStaleActiveToFailed(
      QUEUE,
      new Date(Date.now() + 60_000),
    );
    expect(failed.map((f) => f.id)).toContain(job.id);

    const row = await prisma.queueJob.findUnique({ where: { id: job.id } });
    expect(row?.status).toBe('FAILED');
    expect(row?.claimToken).toBeNull();
  });
});

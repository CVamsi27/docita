import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { Prisma } from '@workspace/db';
import { PostgresQueueService } from './postgres-queue.service';
import { QueueJobData, QueueJobHandler } from './queue.interface';
import type { QueueJobRepository } from './ports/queue-job.repository.port';

interface MockRow {
  id: string;
  name: string;
  data: Prisma.JsonValue;
  status: string;
  priority: number;
  attemptsMade: number;
  maxAttempts: number;
  failedReason: string | null;
  processedAt: Date | null;
  delayedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string | null;
  completedAt: Date | null;
  deadLetteredAt: Date | null;
}

const makeRow = (overrides: Partial<MockRow> = {}): MockRow => ({
  id: 'qj-1',
  name: 'test-job',
  data: { key: 'value' },
  status: 'WAITING',
  priority: 0,
  attemptsMade: 0,
  maxAttempts: 3,
  failedReason: null,
  processedAt: null,
  delayedUntil: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  idempotencyKey: null,
  completedAt: null,
  deadLetteredAt: null,
  ...overrides,
});

describe('PostgresQueueService', () => {
  const createMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const updateMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const deleteMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const deleteManyMock =
    jest.fn<(args: unknown) => Promise<{ count: number }>>();
  const findManyMock = jest.fn<(args: unknown) => Promise<MockRow[]>>();
  const countMock = jest.fn<(args: unknown) => Promise<number>>();
  const queueJobsMock: jest.Mocked<QueueJobRepository> = {
    findRecentCompletedByIdempotency: jest.fn().mockResolvedValue(null),
    claimNextWaitingJob: jest.fn().mockResolvedValue([]),
    recoverStaleActiveToDelayed: jest.fn().mockResolvedValue([]),
    recoverStaleActiveToFailed: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    countByStatus: jest.fn().mockResolvedValue([]),
  };

  const prisma = {
    runUnrestricted: jest.fn(<T>(fn: () => Promise<T>): Promise<T> => fn()),
    queueJob: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      deleteMany: deleteManyMock,
      findMany: findManyMock,
      count: countMock,
    },
  };

  const clock = {
    now: () => new Date('2026-01-15T12:00:00.000Z'),
  };

  const primePollClaim = (row: MockRow) => {
    queueJobsMock.recoverStaleActiveToDelayed.mockResolvedValueOnce([]);
    queueJobsMock.recoverStaleActiveToFailed.mockResolvedValueOnce([]);
    queueJobsMock.claimNextWaitingJob.mockResolvedValueOnce([row]);
  };

  let service: PostgresQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(makeRow());
    countMock.mockResolvedValue(0);
    queueJobsMock.findRecentCompletedByIdempotency.mockResolvedValue(null);
    queueJobsMock.claimNextWaitingJob.mockResolvedValue([]);
    queueJobsMock.recoverStaleActiveToDelayed.mockResolvedValue([]);
    queueJobsMock.recoverStaleActiveToFailed.mockResolvedValue([]);
    queueJobsMock.findById.mockResolvedValue(null);
    queueJobsMock.countByStatus.mockResolvedValue([]);
    service = new PostgresQueueService(
      prisma as never,
      clock,
      queueJobsMock,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('enqueue', () => {
    it('creates a QueueJob row with the provided data', async () => {
      const job = await service.enqueue('test-job', { key: 'value' });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'test-job' }),
        }),
      );
      expect(job.id).toBe('qj-1');
      expect(job.name).toBe('test-job');
    });

    it('sets delayedUntil when a delay option is provided', async () => {
      const before = Date.now();
      await service.enqueue('test-job', {}, { delay: 5000 });

      const callArg = (createMock.mock.lastCall?.[0] ?? {}) as {
        data: { delayedUntil: Date | null };
      };
      expect(callArg.data.delayedUntil).not.toBeNull();
      expect(callArg.data.delayedUntil!.getTime()).toBeGreaterThanOrEqual(
        before + 5000,
      );
    });

    it('uses provided priority and maxAttempts', async () => {
      await service.enqueue('test-job', {}, { priority: 5, attempts: 5 });

      const callArg = (createMock.mock.lastCall?.[0] ?? {}) as {
        data: { priority: number; maxAttempts: number };
      };
      expect(callArg.data.priority).toBe(5);
      expect(callArg.data.maxAttempts).toBe(5);
    });
  });

  describe('process and poll', () => {
    it('calls the handler when a WAITING job is claimed', async () => {
      const activeRow = makeRow({ status: 'ACTIVE' });
      primePollClaim(activeRow);
      updateMock.mockResolvedValue(makeRow({ status: 'COMPLETED' }));

      const handler = jest
        .fn<QueueJobHandler<QueueJobData>>()
        .mockResolvedValue(undefined);

      await service.process('test-job', handler);

      await (
        service as unknown as { poll: (name: string) => Promise<void> }
      ).poll('test-job');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'qj-1', name: 'test-job' }),
      );
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('dead-letters the job and stores failedReason when retries are exhausted', async () => {
      const exhaustedRow = makeRow({ attemptsMade: 2, maxAttempts: 3 });
      primePollClaim(exhaustedRow);
      updateMock.mockResolvedValue(makeRow({ status: 'DEAD_LETTERED' }));

      const handler = jest
        .fn<QueueJobHandler<QueueJobData>>()
        .mockRejectedValue(new Error('handler failed'));

      await service.process('test-job', handler);
      await (
        service as unknown as { poll: (name: string) => Promise<void> }
      ).poll('test-job');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DEAD_LETTERED',
            failedReason: 'handler failed',
            deadLetteredAt: expect.any(Date),
            attemptsMade: 3,
          }),
        }),
      );
    });

    it('reschedules job with exponential backoff when retries remain', async () => {
      const retryableRow = makeRow({ attemptsMade: 0, maxAttempts: 3 });
      primePollClaim(retryableRow);
      updateMock.mockResolvedValue(makeRow({ status: 'DELAYED' }));

      const handler = jest
        .fn<QueueJobHandler<QueueJobData>>()
        .mockRejectedValue(new Error('transient error'));

      await service.process('test-job', handler);
      await (
        service as unknown as { poll: (name: string) => Promise<void> }
      ).poll('test-job');

      const updateCall = (updateMock.mock.lastCall?.[0] ?? {}) as {
        data: { status: string; attemptsMade: number; delayedUntil: Date };
      };
      expect(updateCall.data.status).toBe('DELAYED');
      expect(updateCall.data.attemptsMade).toBe(1);
      expect(updateCall.data.delayedUntil).toBeInstanceOf(Date);
    });

    it('does nothing when no WAITING jobs are available', async () => {
      queueJobsMock.claimNextWaitingJob.mockResolvedValueOnce([]);

      const handler = jest
        .fn<QueueJobHandler<QueueJobData>>()
        .mockResolvedValue(undefined);

      await service.process('test-job', handler);
      await (
        service as unknown as { poll: (name: string) => Promise<void> }
      ).poll('test-job');

      expect(handler).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('returns the job when found', async () => {
      queueJobsMock.findById.mockResolvedValueOnce(makeRow());

      const job = await service.getJob('qj-1');

      expect(job).not.toBeNull();
      expect(job!.id).toBe('qj-1');
    });

    it('returns null when job does not exist', async () => {
      queueJobsMock.findById.mockResolvedValueOnce(null);

      const job = await service.getJob('missing');

      expect(job).toBeNull();
    });
  });

  describe('clear', () => {
    it('deletes all jobs with the given name', async () => {
      deleteManyMock.mockResolvedValue({ count: 3 });

      await service.clear('test-job');

      expect(deleteManyMock).toHaveBeenCalledWith({
        where: { name: 'test-job' },
      });
    });
  });

  describe('getStats', () => {
    it('returns counts grouped by status', async () => {
      queueJobsMock.countByStatus.mockResolvedValueOnce([
        { status: 'WAITING', count: BigInt(2) },
        { status: 'COMPLETED', count: BigInt(5) },
        { status: 'FAILED', count: BigInt(1) },
      ]);

      const stats = await service.getStats('test-job');

      expect(stats.waiting).toBe(2);
      expect(stats.processed).toBe(5);
      expect(stats.failed).toBe(1);
      expect(stats.active).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('clears all pollers without throwing', async () => {
      await service.process(
        'test-job',
        jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      );
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('idempotency', () => {
    it('returns the prior completed job when an idempotency key matches a recent completion', async () => {
      const priorRow = makeRow({
        id: 'qj-prior',
        status: 'COMPLETED',
        idempotencyKey: 'send:patient-1:appt-2',
        completedAt: new Date(),
      });
      queueJobsMock.findRecentCompletedByIdempotency.mockResolvedValueOnce(
        priorRow,
      );

      const job = await service.enqueue(
        'test-job',
        { foo: 'bar' },
        { idempotencyKey: 'send:patient-1:appt-2' },
      );

      expect(createMock).not.toHaveBeenCalled();
      expect(job.id).toBe('qj-prior');
    });

    it('persists the idempotency key on new enqueues when no prior completion exists', async () => {
      queueJobsMock.findRecentCompletedByIdempotency.mockResolvedValueOnce(null);
      createMock.mockResolvedValueOnce(
        makeRow({ idempotencyKey: 'send:patient-1:appt-2' }),
      );

      await service.enqueue(
        'test-job',
        {},
        { idempotencyKey: 'send:patient-1:appt-2' },
      );

      const callArg = (createMock.mock.lastCall?.[0] ?? {}) as {
        data: { idempotencyKey: string | null };
      };
      expect(callArg.data.idempotencyKey).toBe('send:patient-1:appt-2');
    });
  });

  describe('retry backoff bounds', () => {
    it('caps the retry delay at 60 seconds', async () => {
      const beforeMs = Date.now();
      const retryableRow = makeRow({ attemptsMade: 9, maxAttempts: 20 });
      primePollClaim(retryableRow);

      const handler = jest
        .fn<QueueJobHandler<QueueJobData>>()
        .mockRejectedValue(new Error('still flaky'));

      await service.process('test-job', handler);
      await (
        service as unknown as { poll: (name: string) => Promise<void> }
      ).poll('test-job');

      const updateCall = (updateMock.mock.lastCall?.[0] ?? {}) as {
        data: { status: string; delayedUntil: Date };
      };
      const waitMs = updateCall.data.delayedUntil.getTime() - beforeMs;
      expect(updateCall.data.status).toBe('DELAYED');
      expect(waitMs).toBeGreaterThanOrEqual(59_500);
      expect(waitMs).toBeLessThanOrEqual(60_500);
    });
  });

  describe('listDeadLettered', () => {
    it('returns dead-lettered jobs in deadLetteredAt desc order', async () => {
      findManyMock.mockResolvedValueOnce([
        makeRow({
          id: 'dl-2',
          status: 'DEAD_LETTERED',
          deadLetteredAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
        makeRow({
          id: 'dl-1',
          status: 'DEAD_LETTERED',
          deadLetteredAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ]);

      const jobs = await service.listDeadLettered('test-job', 10);

      expect(findManyMock).toHaveBeenCalledWith({
        where: { name: 'test-job', status: 'DEAD_LETTERED' },
        orderBy: { deadLetteredAt: 'desc' },
        take: 10,
      });
      expect(jobs.map((j) => j.id)).toEqual(['dl-2', 'dl-1']);
    });
  });

  describe('replayDeadLettered', () => {
    it('resets attempts and status back to WAITING', async () => {
      updateMock.mockResolvedValueOnce(
        makeRow({ id: 'dl-1', status: 'WAITING', attemptsMade: 0 }),
      );

      const job = await service.replayDeadLettered('dl-1');

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'dl-1' },
        data: expect.objectContaining({
          status: 'WAITING',
          attemptsMade: 0,
          failedReason: null,
          deadLetteredAt: null,
          delayedUntil: null,
          processedAt: null,
        }),
      });
      expect(job.id).toBe('dl-1');
    });
  });
});

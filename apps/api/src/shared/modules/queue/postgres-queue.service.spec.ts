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
  ...overrides,
});

describe('PostgresQueueService', () => {
  const createMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const updateMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const deleteMock = jest.fn<(args: unknown) => Promise<MockRow>>();
  const deleteManyMock =
    jest.fn<(args: unknown) => Promise<{ count: number }>>();
  const queryRawMock = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

  const prisma = {
    runUnrestricted: jest.fn(<T>(fn: () => Promise<T>): Promise<T> => fn()),
    queueJob: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      deleteMany: deleteManyMock,
    },
    $queryRaw: queryRawMock,
  };

  let service: PostgresQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(makeRow());
    service = new PostgresQueueService(prisma as never);
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
      queryRawMock.mockResolvedValueOnce([activeRow]);
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
        expect.objectContaining({ data: { status: 'COMPLETED' } }),
      );
    });

    it('marks job as FAILED and stores failedReason when handler throws (no retries left)', async () => {
      const exhaustedRow = makeRow({ attemptsMade: 2, maxAttempts: 3 });
      queryRawMock.mockResolvedValueOnce([exhaustedRow]);
      updateMock.mockResolvedValue(makeRow({ status: 'FAILED' }));

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
            status: 'FAILED',
            failedReason: 'handler failed',
          }),
        }),
      );
    });

    it('reschedules job with exponential backoff when retries remain', async () => {
      const retryableRow = makeRow({ attemptsMade: 0, maxAttempts: 3 });
      queryRawMock.mockResolvedValueOnce([retryableRow]);
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
      queryRawMock.mockResolvedValueOnce([]);

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
      queryRawMock.mockResolvedValueOnce([makeRow()]);

      const job = await service.getJob('qj-1');

      expect(job).not.toBeNull();
      expect(job!.id).toBe('qj-1');
    });

    it('returns null when job does not exist', async () => {
      queryRawMock.mockResolvedValueOnce([]);

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
      queryRawMock.mockResolvedValueOnce([
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
});

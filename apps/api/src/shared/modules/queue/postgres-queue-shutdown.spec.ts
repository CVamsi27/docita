import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Global, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { PostgresQueueService } from './postgres-queue.service';
import type {
  QueueJobExecutionRecord,
  QueueJobRepository,
  QueueJobRow,
} from './ports/queue-job.repository.port';

function deferred<T>() {
  let resolve = (_value: T): void => {
    throw new Error('Deferred promise has not been initialized');
  };
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function makeRow(name = 'shutdown-job'): QueueJobRow {
  const instant = new Date('2026-10-13T00:00:00.000Z');
  return {
    id: `${name}-id`,
    name,
    data: {},
    status: 'WAITING',
    priority: 0,
    attemptsMade: 0,
    maxAttempts: 3,
    replayCount: 0,
    lastReplayedAt: null,
    failedReason: null,
    processedAt: null,
    claimToken: null,
    delayedUntil: null,
    createdAt: instant,
    updatedAt: instant,
    idempotencyKey: null,
    completedAt: null,
  };
}

function createRepository(): jest.Mocked<QueueJobRepository> {
  return {
    findRecentCompletedByIdempotency: jest
      .fn<QueueJobRepository['findRecentCompletedByIdempotency']>()
      .mockResolvedValue(null),
    claimNextWaitingJob: jest
      .fn<QueueJobRepository['claimNextWaitingJob']>()
      .mockResolvedValue([]),
    recoverStaleActiveToDelayed: jest
      .fn<QueueJobRepository['recoverStaleActiveToDelayed']>()
      .mockResolvedValue([]),
    recoverStaleActiveToFailed: jest
      .fn<QueueJobRepository['recoverStaleActiveToFailed']>()
      .mockResolvedValue([]),
    applyClaimTransition: jest
      .fn<QueueJobRepository['applyClaimTransition']>()
      .mockResolvedValue(true),
    findById: jest.fn<QueueJobRepository['findById']>().mockResolvedValue(null),
    countByStatus: jest
      .fn<QueueJobRepository['countByStatus']>()
      .mockResolvedValue([]),
    appendExecutions: jest
      .fn<QueueJobRepository['appendExecutions']>()
      .mockResolvedValue(undefined),
    listExecutions: jest
      .fn<QueueJobRepository['listExecutions']>()
      .mockResolvedValue([]),
  };
}

describe('Postgres queue graceful shutdown', () => {
  let service: PostgresQueueService;
  let repository: jest.Mocked<QueueJobRepository>;
  let databaseClosed: boolean;
  let rows: QueueJobRow[];
  let executions: QueueJobExecutionRecord[];

  beforeEach(() => {
    jest.useFakeTimers();
    repository = createRepository();
    databaseClosed = false;
    rows = [makeRow()];
    executions = [];
    repository.claimNextWaitingJob.mockImplementation(async (name) => {
      if (databaseClosed) throw new Error('Database is closed');
      const row = rows.find(
        (candidate) =>
          candidate.name === name && candidate.status === 'WAITING',
      );
      if (!row) return [];
      row.status = 'ACTIVE';
      row.claimToken = `${row.id}-claim`;
      return [{ ...row }];
    });
    repository.applyClaimTransition.mockImplementation(
      async (id, claimToken, transition) => {
        if (databaseClosed) throw new Error('Database is closed');
        const row = rows.find(
          (candidate) =>
            candidate.id === id &&
            candidate.status === 'ACTIVE' &&
            candidate.claimToken === claimToken,
        );
        if (!row) return false;
        Object.assign(row, transition, { claimToken: null });
        return true;
      },
    );
    repository.appendExecutions.mockImplementation(async (records) => {
      if (databaseClosed) throw new Error('Database is closed');
      executions.push(...records);
    });
    service = new PostgresQueueService(
      Object.create(PrismaService.prototype) as PrismaService,
      { now: () => new Date('2026-10-13T00:00:00.000Z') },
      repository,
    );
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the Nest persistence dependency open until an active handler and acknowledgment finish', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    let generated = false;

    @Global()
    @Module({
      providers: [
        {
          provide: 'database',
          useValue: {
            onModuleDestroy: () => {
              databaseClosed = true;
            },
          },
        },
      ],
      exports: ['database'],
    })
    class LifecycleDatabaseModule {}

    @Module({
      imports: [LifecycleDatabaseModule],
      providers: [{ provide: 'queue', useValue: service }],
    })
    class LifecycleQueueModule {}

    const application = await NestFactory.createApplicationContext(
      LifecycleQueueModule,
      { logger: false },
    );
    await service.process(rows[0].name, async () => {
      entered.resolve();
      await release.promise;
      generated = true;
    });
    await jest.advanceTimersToNextTimerAsync();
    await entered.promise;
    const closing = application.close();
    let shutdownResolved = false;
    void closing.then(() => {
      shutdownResolved = true;
    });
    try {
      await jest.advanceTimersByTimeAsync(0);
      expect(shutdownResolved).toBe(false);
      expect(databaseClosed).toBe(false);
      expect(rows[0].status).toBe('ACTIVE');
    } finally {
      release.resolve();
      await jest.advanceTimersByTimeAsync(0);
      await closing;
    }
    expect(generated).toBe(true);
    expect(rows[0].status).toBe('COMPLETED');
    expect(rows[0].claimToken).toBeNull();
    expect(executions.map((record) => record.outcome)).toEqual(['COMPLETED']);
    expect(databaseClosed).toBe(true);
  });

  it('does not claim a new job after shutdown begins during asynchronous recovery', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    let generated = false;
    repository.recoverStaleActiveToDelayed.mockImplementationOnce(async () => {
      entered.resolve();
      await release.promise;
      return [];
    });
    await service.process(rows[0].name, async () => {
      generated = true;
    });
    await jest.advanceTimersToNextTimerAsync();
    await entered.promise;
    const closing = Promise.resolve(service.onModuleDestroy());
    try {
      await jest.advanceTimersByTimeAsync(0);
    } finally {
      release.resolve();
      await jest.advanceTimersByTimeAsync(0);
      await closing;
    }
    expect(generated).toBe(false);
    expect(rows[0].status).toBe('WAITING');
    expect(rows[0].claimToken).toBeNull();
    expect(executions).toEqual([]);
  });

  it('finishes and acknowledges a claim that arrives while shutdown is waiting', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    let generated = false;
    repository.claimNextWaitingJob.mockImplementationOnce(async () => {
      entered.resolve();
      await release.promise;
      rows[0].status = 'ACTIVE';
      rows[0].claimToken = 'late-claim';
      return rows.map((row) => ({ ...row }));
    });
    await service.process(rows[0].name, async () => {
      generated = true;
    });
    await jest.advanceTimersToNextTimerAsync();
    await entered.promise;
    const closing = Promise.resolve(service.onModuleDestroy());
    let shutdownResolved = false;
    void closing.then(() => {
      shutdownResolved = true;
    });
    try {
      await jest.advanceTimersByTimeAsync(0);
      expect(shutdownResolved).toBe(false);
    } finally {
      release.resolve();
      await jest.advanceTimersByTimeAsync(0);
      await closing;
    }
    expect(generated).toBe(true);
    expect(rows[0].status).toBe('COMPLETED');
    expect(executions[0].claimToken).toBe('late-claim');
  });

  it('refuses handler registration that would restart polling during shutdown', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    await service.process(rows[0].name, async () => {
      entered.resolve();
      await release.promise;
    });
    await jest.advanceTimersToNextTimerAsync();
    await entered.promise;
    const closing = Promise.resolve(service.onModuleDestroy());
    try {
      await expect(
        service.process('new-job', async () => undefined),
      ).rejects.toThrow(/shutting down/i);
      await jest.advanceTimersByTimeAsync(30_000);
      expect(rows[0].status).toBe('ACTIVE');
    } finally {
      release.resolve();
      await jest.advanceTimersByTimeAsync(0);
      await closing;
    }
  });

  it('waits for every active queue before finishing shutdown', async () => {
    rows = [makeRow('invoice'), makeRow('prescription')];
    const releases = [deferred<void>(), deferred<void>()];
    for (const [index, row] of rows.entries()) {
      await service.process(row.name, async () => {
        await releases[index].promise;
      });
    }
    await jest.advanceTimersToNextTimerAsync();
    expect(rows.map((row) => row.status)).toEqual(['ACTIVE', 'ACTIVE']);
    const closing = Promise.resolve(service.onModuleDestroy());
    let shutdownResolved = false;
    void closing.then(() => {
      shutdownResolved = true;
    });
    try {
      releases[0].resolve();
      await jest.advanceTimersByTimeAsync(0);
      expect(rows.map((row) => row.status)).toEqual(['COMPLETED', 'ACTIVE']);
      expect(shutdownResolved).toBe(false);
    } finally {
      for (const release of releases) release.resolve();
      await jest.advanceTimersByTimeAsync(0);
      await closing;
    }
    expect(rows.map((row) => row.status)).toEqual(['COMPLETED', 'COMPLETED']);
  });

  it('fails shutdown when a claimed job cannot be acknowledged instead of reporting success', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const failure = new Error('Acknowledgment unavailable');
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    repository.applyClaimTransition.mockRejectedValue(failure);
    await service.process(rows[0].name, async () => {
      entered.resolve();
      await release.promise;
    });
    await jest.advanceTimersToNextTimerAsync();
    await entered.promise;
    const closing = Promise.resolve(service.onModuleDestroy()).then(
      () => ({ succeeded: true, error: undefined }),
      (error: unknown) => ({ succeeded: false, error }),
    );
    release.resolve();
    await jest.advanceTimersByTimeAsync(0);
    const result = await closing;
    expect(result.succeeded).toBe(false);
    expect(result.error).toBe(failure);
    expect(rows[0].status).toBe('ACTIVE');
    expect(rows[0].claimToken).toBe('shutdown-job-id-claim');
    expect(executions).toEqual([]);
  });
});

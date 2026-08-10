import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { InMemoryQueueService } from './in-memory-queue.service';
import { QueueJobData, QueueJobHandler } from './queue.interface';

describe('InMemoryQueueService', () => {
  let service: InMemoryQueueService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new InMemoryQueueService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the handler once when the job succeeds', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {});
    await service.process('test-job', handler);
    await service.enqueue('test-job', { x: 1 });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries the job up to maxAttempts when the handler throws', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {
      throw new Error('boom');
    });
    await service.process('test-job', handler);

    await service.enqueue('test-job', { x: 1 }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 100 },
    });

    // First attempt fails immediately.
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    // Advance past the first backoff, the retry runs.
    await jest.advanceTimersByTimeAsync(150);
    expect(handler).toHaveBeenCalledTimes(2);

    // Advance past the second backoff, the second retry runs.
    await jest.advanceTimersByTimeAsync(150);
    expect(handler).toHaveBeenCalledTimes(3);

    // No more retries should happen — maxAttempts=3 is exhausted.
    await jest.advanceTimersByTimeAsync(10_000);
    expect(handler).toHaveBeenCalledTimes(3);

    const stats = await service.getStats('test-job');
    expect(stats.failed).toBeGreaterThan(0);
  });

  it('does not retry ZodError / BadRequestException — caller sees the failure immediately', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {
      const err = new Error('bad payload');
      err.name = 'ZodError';
      throw err;
    });
    await service.process('test-job', handler);

    await service.enqueue('test-job', { x: 1 }, {
      attempts: 5,
      backoff: { type: 'fixed', delay: 50 },
    });

    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    // Wait long enough for any retry to fire — none should.
    await jest.advanceTimersByTimeAsync(10_000);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff between attempts', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {
      throw new Error('boom');
    });
    await service.process('test-job', handler);

    await service.enqueue('test-job', { x: 1 }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 100 },
    });

    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    // First backoff: 100ms.
    await jest.advanceTimersByTimeAsync(150);
    expect(handler).toHaveBeenCalledTimes(2);

    // Second backoff: 200ms (exponential).
    await jest.advanceTimersByTimeAsync(250);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('honors the requested maxAttempts (default 1 = no retry)', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {
      throw new Error('boom');
    });
    await service.process('test-job', handler);

    await service.enqueue('test-job', { x: 1 });
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(10_000);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('records the failure reason on the job', async () => {
    const handler = jest.fn<QueueJobHandler<QueueJobData>>(async () => {
      throw new Error('specific failure text');
    });
    await service.process('test-job', handler);

    const job = await service.enqueue('test-job', { x: 1 }, { attempts: 1 });
    await Promise.resolve();

    const fetched = await service.getJob(job.id);
    expect(fetched?.failedReason).toBe('specific failure text');
  });
});

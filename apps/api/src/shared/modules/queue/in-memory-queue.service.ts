// jscpd:ignore-start
import { Injectable, Logger } from '@nestjs/common';
import {
  IQueueProvider,
  QueueJob,
  QueueJobData,
  QueueJobHandler,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';
import { bindQueueJobHandler, coerceQueueJob } from './queue-job-boundary';

interface InMemoryJob<T extends QueueJobData> extends QueueJob<T> {
  // jscpd:ignore-end
  status: 'waiting' | 'active' | 'completed' | 'failed';
  delayedUntil?: number;
}

@Injectable()
export class InMemoryQueueService implements IQueueProvider {
  private readonly logger = new Logger(InMemoryQueueService.name);
  private jobs = new Map<string, InMemoryJob<QueueJobData>>();
  private jobsByName = new Map<string, Set<string>>();
  private handlers = new Map<string, QueueJobHandler>();
  private stats = new Map<string, QueueStats>();
  private jobCounter = 0;

  async enqueue<T extends QueueJobData>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const jobId = `${name}-${++this.jobCounter}`;
    const maxAttempts = Math.max(1, options?.attempts ?? 1);
    const job: InMemoryJob<QueueJobData> = {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
      maxAttempts,
      timestamp: Date.now(),
      status: 'waiting',
      delayedUntil: options?.delay ? Date.now() + options.delay : undefined,
    };

    this.jobs.set(jobId, job);

    if (!this.jobsByName.has(name)) {
      this.jobsByName.set(name, new Set());
      this.stats.set(name, {
        processed: 0,
        failed: 0,
        waiting: 0,
        active: 0,
        delayed: 0,
      });
    }

    this.jobsByName.get(name)?.add(jobId);

    // Enqueue is fire-and-forget for the caller: the job is dispatched in
    // the background so the HTTP request / event handler that called
    // enqueue returns immediately. Retries happen inside processJob and
    // are also backgrounded via setTimeout.
    if (!options?.delay || options.delay <= 0) {
      void this.processJob(job, options).catch((error: unknown) => {
        this.logger.error(
          `In-memory queue job ${job.id} dispatcher crashed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    } else {
      setTimeout(() => {
        void this.processJob(job, options).catch((error: unknown) => {
          this.logger.error(
            `Delayed in-memory queue job ${job.id} failed terminally: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
      }, options.delay);
    }

    return {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
      maxAttempts,
      timestamp: job.timestamp,
    };
  }

  async process<T extends QueueJobData>(
    name: string,
    handler: QueueJobHandler<T>,
  ): Promise<void> {
    this.handlers.set(name, bindQueueJobHandler(handler));
    await Promise.resolve();
  }

  async getJob<T extends QueueJobData>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return coerceQueueJob<T>(job);
  }

  async removeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      const jobs = this.jobsByName.get(job.name);
      if (jobs) {
        jobs.delete(jobId);
      }
      this.jobs.delete(jobId);
    }
    await Promise.resolve();
  }

  async clear(name: string): Promise<void> {
    const jobs = this.jobsByName.get(name);
    if (jobs) {
      for (const jobId of jobs) {
        this.jobs.delete(jobId);
      }
      jobs.clear();
      const stats = this.stats.get(name);
      if (stats) {
        stats.processed = 0;
        stats.failed = 0;
        stats.waiting = 0;
        stats.active = 0;
        stats.delayed = 0;
      }
    }
    await Promise.resolve();
  }

  async getStats(name: string): Promise<QueueStats> {
    const stats = this.stats.get(name);
    await Promise.resolve();
    return (
      stats || {
        processed: 0,
        failed: 0,
        waiting: 0,
        active: 0,
        delayed: 0,
      }
    );
  }

  private async processJob(
    job: InMemoryJob<QueueJobData>,
    options?: QueueJobOptions,
  ): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      return;
    }

    try {
      job.status = 'active';
      const stats = this.stats.get(job.name);
      if (stats) stats.active++;

      await handler(job);

      job.status = 'completed';
      if (stats) {
        stats.active--;
        stats.processed++;
      }
      return;
    } catch (error) {
      job.attemptsMade++;
      job.failedReason = error instanceof Error ? error.message : String(error);
      const maxAttempts = job.maxAttempts ?? 1;
      const remainingAttempts = maxAttempts - job.attemptsMade;

      const stats = this.stats.get(job.name);
      if (stats) stats.active--;

      if (remainingAttempts > 0 && this.shouldRetry(job, error, options)) {
        const backoffMs = this.computeBackoffMs(job.attemptsMade, options);
        this.logger.warn(
          `In-memory queue job ${job.name}:${job.id} attempt ${job.attemptsMade}/${maxAttempts} failed (${job.failedReason}); retrying in ${backoffMs}ms`,
        );
        job.status = 'waiting';
        if (stats) stats.waiting++;
        setTimeout(() => {
          job.status = 'active';
          void this.processJob(job, options).catch((err: unknown) => {
            this.logger.error(
              `In-memory queue retry crashed: ${err instanceof Error ? err.message : String(err)}`,
              err instanceof Error ? err.stack : undefined,
            );
          });
        }, backoffMs);
        return;
      }

      job.status = 'failed';
      if (stats) {
        stats.failed++;
      }
      this.logger.error(
        `In-memory queue job ${job.name}:${job.id} failed terminally after ${job.attemptsMade} attempt(s): ${job.failedReason}`,
      );
    }
  }

  /**
   * Decide whether a thrown error should trigger a retry. Fatal errors
   * (validation, missing data) are surfaced immediately so callers see
   * the failure instead of retrying pointlessly.
   */
  private shouldRetry(
    _job: InMemoryJob<QueueJobData>,
    error: unknown,
    _options?: QueueJobOptions,
  ): boolean {
    if (!(error instanceof Error)) return true;
    // Surface validation errors immediately; retrying a bad payload is
    // a guaranteed second failure and burns attempt budget.
    if (error.name === 'ZodError' || error.name === 'BadRequestException') {
      return false;
    }
    return true;
  }

  private computeBackoffMs(
    attemptNumber: number,
    options?: QueueJobOptions,
  ): number {
    const baseDelay = options?.backoff?.delay ?? 1000;
    if (options?.backoff?.type === 'exponential') {
      return baseDelay * Math.pow(2, Math.max(0, attemptNumber - 1));
    }
    return baseDelay;
  }
}

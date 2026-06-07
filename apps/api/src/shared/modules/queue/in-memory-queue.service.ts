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
    const job: InMemoryJob<QueueJobData> = {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
      maxAttempts: 1,
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

    if (!options?.delay || options.delay <= 0) {
      await this.processJob(job);
    } else {
      setTimeout(() => {
        void this.processJob(job).catch((error: unknown) => {
          this.logger.error(
            `Delayed in-memory queue job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
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
      maxAttempts: 1,
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

  private async processJob(job: InMemoryJob<QueueJobData>): Promise<void> {
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
    } catch (error) {
      job.status = 'failed';
      job.failedReason = error instanceof Error ? error.message : String(error);
      job.attemptsMade++;

      const stats = this.stats.get(job.name);
      if (stats) {
        stats.active--;
        stats.failed++;
      }
    }
  }
}

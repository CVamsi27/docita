import { Injectable } from '@nestjs/common';
import {
  IQueueProvider,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';

interface InMemoryJob<T extends Record<string, unknown>> extends QueueJob<T> {
  handler?: (job: QueueJob<T>) => Promise<void>;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  delayedUntil?: number;
}

@Injectable()
export class InMemoryQueueService implements IQueueProvider {
  private jobs = new Map<string, InMemoryJob<Record<string, unknown>>>();
  private jobsByName = new Map<string, Set<string>>();
  private handlers = new Map<
    string,
    (job: QueueJob<Record<string, unknown>>) => Promise<void>
  >();
  private stats = new Map<string, QueueStats>();
  private jobCounter = 0;

  async enqueue<T extends Record<string, unknown>>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const jobId = `${name}-${++this.jobCounter}`;
    const job: InMemoryJob<Record<string, unknown>> = {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
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

    this.jobsByName.get(name)!.add(jobId);

    if (!options?.delay || options.delay <= 0) {
      await this.processJob(job);
    } else {
      setTimeout(() => {
        void this.processJob(job).catch((_err: unknown) => {});
      }, options.delay);
    }

    return {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
      timestamp: job.timestamp,
    };
  }

  async process<T extends Record<string, unknown>>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void> {
    this.handlers.set(name, async (job) => {
      await handler(job as QueueJob<T>);
    });
    await Promise.resolve();
  }

  async getJob<T extends Record<string, unknown>>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const data = job.data as T;
    const result: QueueJob<T> = {
      id: job.id,
      name: job.name,
      data: data,
      progress: job.progress,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
    await Promise.resolve();
    return result;
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
    job: InMemoryJob<Record<string, unknown>>,
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

/**
 * In-Memory Queue Service
 * 
 * Simple queue implementation for development.
 * Jobs are processed immediately or with delays, but NOT persisted.
 * For production, use BullMQ with Redis.
 */

import { Injectable } from '@nestjs/common';
import { IQueueProvider, QueueJob, QueueJobOptions, QueueStats, JobNames } from './queue.interface';

interface InMemoryJob<T> extends QueueJob<T> {
  handler?: (job: QueueJob<T>) => Promise<void>;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  delayedUntil?: number;
}

@Injectable()
export class InMemoryQueueService implements IQueueProvider {
  private jobs = new Map<string, InMemoryJob<any>>();
  private jobsByName = new Map<string, Set<string>>();
  private handlers = new Map<string, (job: QueueJob<any>) => Promise<void>>();
  private stats = new Map<string, QueueStats>();
  private jobCounter = 0;

  async enqueue<T>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const jobId = `${name}-${++this.jobCounter}`;
    const job: InMemoryJob<T> = {
      id: jobId,
      name,
      data,
      progress: 0,
      attemptsMade: 0,
      timestamp: Date.now(),
      status: options?.delay ? 'waiting' : 'waiting',
      delayedUntil: options?.delay ? Date.now() + options.delay : undefined,
    };

    this.jobs.set(jobId, job);

    if (!this.jobsByName.has(name)) {
      this.jobsByName.set(name, new Set());
      this.stats.set(name, { processed: 0, failed: 0, waiting: 0, active: 0, delayed: 0 });
    }

    this.jobsByName.get(name)!.add(jobId);

    // Process immediately if no delay
    if (!options?.delay) {
      await this.processJob(job);
    } else {
      // Schedule processing after delay
      setTimeout(() => this.processJob(job), options.delay);
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

  async process<T>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void> {
    this.handlers.set(name, handler as any);
  }

  async getJob<T>(jobId: string): Promise<QueueJob<T> | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
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
  }

  async getStats(name: string): Promise<QueueStats> {
    return (
      this.stats.get(name) || {
        processed: 0,
        failed: 0,
        waiting: 0,
        active: 0,
        delayed: 0,
      }
    );
  }

  private async processJob<T>(job: InMemoryJob<T>): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      console.warn(`No handler registered for queue: ${job.name}`);
      return;
    }

    try {
      job.status = 'active';
      const stats = this.stats.get(job.name);
      if (stats) stats.active++;

      await handler(job as QueueJob<T>);

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

      console.error(`Job ${job.id} failed:`, error);
    }
  }
}

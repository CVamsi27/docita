/**
 * BullMQ Queue Service
 *
 * Production-grade queue using BullMQ + Redis.
 * Provides job persistence, retries, delays, priorities, etc.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  IQueueProvider,
  QueueJob,
  QueueJobOptions,
  QueueStats,
  JobNames,
} from './queue.interface';

/**
 * BullMQ service (requires 'bull' and 'ioredis' packages)
 *
 * Installation:
 * npm install bull ioredis
 *
 * Environment variables:
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 * REDIS_PASSWORD=optional
 */
@Injectable()
export class BullMQQueueService
  implements IQueueProvider, OnModuleInit, OnModuleDestroy
{
  private queues = new Map<string, any>();
  private initialized = false;

  async onModuleInit() {
    // BullMQ initialization happens lazily when jobs are enqueued
    this.initialized = true;
  }

  async onModuleDestroy() {
    // Clean up all queues
    for (const queue of this.queues.values()) {
      try {
        await queue.close();
      } catch (error) {
        console.error('Error closing queue:', error);
      }
    }
  }

  private async getQueue(name: string) {
    if (!this.queues.has(name)) {
      try {
        // Dynamic import to avoid hard dependency
        const Queue = require('bull');
        const queue = new Queue(name, {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
          },
        });

        this.queues.set(name, queue);
      } catch (error) {
        throw new Error(
          `BullMQ not installed. Run: npm install bull\nError: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return this.queues.get(name);
  }

  async enqueue<T>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const queue = await this.getQueue(name);

    const bullOptions: any = {
      attempts: options?.attempts ?? 3,
      timeout: options?.timeout ?? 30000,
      removeOnComplete: options?.removeOnComplete ?? false,
    };

    if (options?.delay) {
      bullOptions.delay = options.delay;
    }

    if (options?.priority) {
      bullOptions.priority = options.priority;
    }

    if (options?.backoff) {
      bullOptions.backoff = {
        type: options.backoff.type,
        delay: options.backoff.delay,
      };
    }

    const job = await queue.add(data, bullOptions);

    return {
      id: job.id.toString(),
      name,
      data,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }

  async process<T>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void> {
    const queue = await this.getQueue(name);

    queue.process(async (bullJob: any) => {
      const job: QueueJob<T> = {
        id: bullJob.id.toString(),
        name,
        data: bullJob.data,
        progress: bullJob.progress(),
        attemptsMade: bullJob.attemptsMade,
        timestamp: bullJob.timestamp,
      };

      return handler(job);
    });
  }

  async getJob<T>(jobId: string): Promise<QueueJob<T> | null> {
    // This would require iterating through all queues
    // For now, return null as BullMQ requires queue name
    console.warn('getJob requires queue name in BullMQ implementation');
    return null;
  }

  async removeJob(jobId: string): Promise<void> {
    // This would require iterating through all queues
    console.warn('removeJob requires queue name in BullMQ implementation');
  }

  async clear(name: string): Promise<void> {
    const queue = await this.getQueue(name);
    await queue.empty();
  }

  async getStats(name: string): Promise<QueueStats> {
    const queue = await this.getQueue(name);

    const [waiting, active, delayed, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      delayed,
      processed: completed,
      failed,
    };
  }

  /**
   * Get detailed queue info
   */
  async getQueueInfo(name: string) {
    const queue = await this.getQueue(name);
    const stats = await this.getStats(name);

    return {
      name,
      ...stats,
      isPaused: queue.isPaused,
    };
  }

  /**
   * Pause all processing for a queue
   */
  async pauseQueue(name: string): Promise<void> {
    const queue = await this.getQueue(name);
    await queue.pause();
  }

  /**
   * Resume processing for a queue
   */
  async resumeQueue(name: string): Promise<void> {
    const queue = await this.getQueue(name);
    await queue.resume();
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  IQueueProvider,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type BullQueue = {
  close: () => Promise<void>;
  add: (
    data: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => Promise<{
    id: string | number;
    progress: () => number | Promise<number>;
    attemptsMade: number;
    timestamp: number;
  }>;
  process: (
    handler: (job: {
      id: string | number;
      data: Record<string, unknown>;
      progress: () => number | Promise<number>;
      attemptsMade: number;
      timestamp: number;
    }) => Promise<void>,
  ) => void;
  empty: () => Promise<void>;
  getWaitingCount: () => Promise<number>;
  getActiveCount: () => Promise<number>;
  getDelayedCount: () => Promise<number>;
  getCompletedCount: () => Promise<number>;
  getFailedCount: () => Promise<number>;
  isPaused: boolean;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

@Injectable()
export class BullMQQueueService
  implements IQueueProvider, OnModuleInit, OnModuleDestroy
{
  private queues = new Map<string, BullQueue>();
  private initialized = false;

  constructor(private configService: AppConfigService) {}

  onModuleInit() {
    this.initialized = true;
  }

  async onModuleDestroy() {
    for (const queue of this.queues.values()) {
      try {
        await queue.close();
      } catch (_error) {}
    }
  }

  private getQueue(name: string): BullQueue {
    if (!this.queues.has(name)) {
      try {
        const Queue = require('bull');
        const redisConfig = this.configService.getRedisConfig();
        const queue = new Queue(name, {
          redis: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
          },
        });

        this.queues.set(name, queue as BullQueue);
      } catch (error) {
        throw new Error(
          `BullMQ not installed. Run: npm install bull\nError: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return this.queues.get(name)!;
  }

  private async resolveProgress(
    progress: number | Promise<number>,
  ): Promise<number> {
    const value = await progress;
    return Number.isFinite(value) ? value : 0;
  }

  async enqueue<T extends Record<string, unknown>>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const queue = await this.getQueue(name);

    const bullOptions: Record<string, unknown> = {
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
    const progress = await this.resolveProgress(job.progress());

    return {
      id: job.id.toString(),
      name,
      data,
      progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }

  async process<T extends Record<string, unknown>>(
    name: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void> {
    const queue = await this.getQueue(name);

    queue.process(
      async (bullJob: {
        id: string | number;
        data: Record<string, unknown>;
        progress: () => number | Promise<number>;
        attemptsMade: number;
        timestamp: number;
      }) => {
        const progress =
          typeof bullJob.progress === 'function'
            ? await this.resolveProgress(bullJob.progress())
            : 0;

        const job: QueueJob<T> = {
          id: bullJob.id.toString(),
          name,
          data: bullJob.data as T,
          progress,
          attemptsMade: bullJob.attemptsMade,
          timestamp: bullJob.timestamp,
        };

        return handler(job);
      },
    );
  }

  async getJob<T extends Record<string, unknown>>(
    _jobId: string,
  ): Promise<QueueJob<T> | null> {
    await Promise.resolve();
    return null;
  }

  removeJob(_jobId: string): Promise<void> {
    return Promise.resolve();
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

  async getQueueInfo(name: string) {
    const queue = await this.getQueue(name);
    const stats = await this.getStats(name);

    return {
      name,
      ...stats,
      isPaused: queue.isPaused,
    };
  }

  async pauseQueue(name: string): Promise<void> {
    const queue = await this.getQueue(name);
    await queue.pause();
  }

  async resumeQueue(name: string): Promise<void> {
    const queue = await this.getQueue(name);
    await queue.resume();
  }
}

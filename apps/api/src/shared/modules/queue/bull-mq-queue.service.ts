import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  IQueueProvider,
  QueueJob,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';
import { AppConfigService } from '../config/app-configuration.service';

@Injectable()
export class BullMQQueueService
  implements IQueueProvider, OnModuleInit, OnModuleDestroy
{
  private queues = new Map<string, any>();
  private initialized = false;

  constructor(private configService: AppConfigService) {}

  onModuleInit() {
    this.initialized = true;
  }

  async onModuleDestroy() {
    for (const queue of this.queues.values()) {
      try {
        await queue.close();
      } catch (error) {
        console.error(
          'Error closing queue:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  private getQueue(name: string) {
    if (!this.queues.has(name)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Queue = require('bull');
        const queue = new Queue(name, {
          redis: {
            host: this.configService.getRedisHost(),
            port: this.configService.getRedisPort(),
            password: this.configService.getRedisPassword(),
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

    return {
      id: job.id.toString(),
      name,
      data,
      progress: job.progress(),
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
        data: T;
        progress: () => number | Promise<number>;
        attemptsMade: number;
        timestamp: number;
      }) => {
        const job: QueueJob<T> = {
          id: bullJob.id.toString(),
          name,
          data: bullJob.data,
          progress:
            typeof bullJob.progress === 'function'
              ? (bullJob.progress() as any)
              : 0,
          attemptsMade: bullJob.attemptsMade,
          timestamp: bullJob.timestamp,
        };

        return handler(job);
      },
    );
  }

  async getJob<T extends Record<string, unknown>>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    console.warn('getJob requires queue name in BullMQ implementation');
    await Promise.resolve();
    return null;
  }

  removeJob(jobId: string): Promise<void> {
    console.warn('removeJob requires queue name in BullMQ implementation');
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

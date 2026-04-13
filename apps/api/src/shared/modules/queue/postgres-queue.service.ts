import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IQueueProvider,
  QueueJob,
  QueueJobData,
  QueueJobHandler,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';

const POLL_INTERVAL_MS = 2000;

interface QueueJobRow {
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

@Injectable()
export class PostgresQueueService implements IQueueProvider, OnModuleDestroy {
  private readonly logger = new Logger(PostgresQueueService.name);
  private readonly handlers = new Map<string, QueueJobHandler>();
  private readonly pollers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private readonly prisma: PrismaService) {}

  async enqueue<T extends QueueJobData>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const delayedUntil = options?.delay
      ? new Date(Date.now() + options.delay)
      : null;

    const row = await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.create({
        data: {
          name,
          data,
          priority: options?.priority ?? 0,
          maxAttempts: options?.attempts ?? 3,
          delayedUntil,
        },
      }),
    );

    return this.rowToJob<T>(row);
  }

  async process<T extends QueueJobData>(
    name: string,
    handler: QueueJobHandler<T>,
  ): Promise<void> {
    this.handlers.set(name, async (job) => {
      await handler(job as QueueJob<T>);
    });

    if (!this.pollers.has(name)) {
      const interval = setInterval(() => {
        void this.poll(name).catch((err) => {
          this.logger.error(
            `Queue poller error for ${name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }, POLL_INTERVAL_MS);

      this.pollers.set(name, interval);
    }
  }

  private async poll(name: string): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) return;

    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'ACTIVE', "processedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = (
          SELECT id FROM "QueueJob"
          WHERE name = ${name}
            AND status = 'WAITING'
            AND ("delayedUntil" IS NULL OR "delayedUntil" <= NOW())
          ORDER BY priority DESC, "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `,
    );

    if (!rows.length) return;

    const row = rows[0];
    const job = this.rowToJob(row);

    try {
      await handler(job);

      await this.prisma.runUnrestricted(async () =>
        this.prisma.queueJob.update({
          where: { id: row.id },
          data: { status: 'COMPLETED' },
        }),
      );
    } catch (error) {
      const failedReason =
        error instanceof Error ? error.message : String(error);
      const nextAttemptsMade = row.attemptsMade + 1;

      if (nextAttemptsMade < row.maxAttempts) {
        const backoffMs = Math.pow(2, nextAttemptsMade) * 5000;
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'WAITING',
              attemptsMade: nextAttemptsMade,
              delayedUntil: new Date(Date.now() + backoffMs),
            },
          }),
        );
      } else {
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'FAILED',
              attemptsMade: nextAttemptsMade,
              failedReason,
            },
          }),
        );
        this.logger.error(
          `Job ${row.id} (${name}) permanently failed after ${nextAttemptsMade} attempts: ${failedReason}`,
        );
      }
    }
  }

  async getJob<T extends QueueJobData>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
        SELECT * FROM "QueueJob" WHERE id = ${jobId} LIMIT 1
      `,
    );

    if (!rows.length) return null;
    return this.rowToJob<T>(rows[0]);
  }

  async removeJob(jobId: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.delete({ where: { id: jobId } }),
    );
  }

  async clear(name: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.deleteMany({ where: { name } }),
    );
  }

  async getStats(name: string): Promise<QueueStats> {
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT status, COUNT(*) as count
        FROM "QueueJob"
        WHERE name = ${name}
        GROUP BY status
      `,
    );

    const byStatus = new Map(rows.map((r) => [r.status, Number(r.count)]));

    return {
      waiting: byStatus.get('WAITING') ?? 0,
      active: byStatus.get('ACTIVE') ?? 0,
      processed: byStatus.get('COMPLETED') ?? 0,
      failed: byStatus.get('FAILED') ?? 0,
      delayed: byStatus.get('DELAYED') ?? 0,
    };
  }

  onModuleDestroy() {
    for (const [, interval] of this.pollers) {
      clearInterval(interval);
    }
    this.pollers.clear();
  }

  private rowToJob<T extends QueueJobData>(row: QueueJobRow): QueueJob<T> {
    return {
      id: row.id,
      name: row.name,
      data: row.data as T,
      progress: 0,
      failedReason: row.failedReason ?? undefined,
      attemptsMade: row.attemptsMade,
      timestamp: row.createdAt.getTime(),
    };
  }
}

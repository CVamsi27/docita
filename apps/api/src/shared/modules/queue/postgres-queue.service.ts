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
import { WorkerMetricsService } from './worker-metrics.service';

const POLL_INTERVAL_MS = 2000;
const STALE_ACTIVE_TIMEOUT_MS = 10 * 60 * 1000;
const RECOVERY_DELAY_MS = 30 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 60_000;
const IDEMPOTENCY_LOOKBACK_MS = 24 * 60 * 60 * 1000;

const computeBackoffMs = (attempt: number): number => {
  const exponential = RETRY_BASE_MS * Math.pow(2, attempt - 1);
  return Math.min(exponential, RETRY_MAX_MS);
};

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
  idempotencyKey?: string | null;
  completedAt?: Date | null;
}

@Injectable()
export class PostgresQueueService implements IQueueProvider, OnModuleDestroy {
  private readonly logger = new Logger(PostgresQueueService.name);
  private readonly handlers = new Map<string, QueueJobHandler>();
  private readonly pollers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: WorkerMetricsService,
  ) {}

  async enqueue<T extends QueueJobData>(
    name: string,
    data: T,
    options?: QueueJobOptions,
  ): Promise<QueueJob<T>> {
    const delayedUntil = options?.delay
      ? new Date(Date.now() + options.delay)
      : null;

    if (options?.idempotencyKey) {
      const recent = await this.findRecentCompletedByIdempotency(
        name,
        options.idempotencyKey,
      );
      if (recent) {
        this.logger.debug(
          `Skipping duplicate enqueue for ${name} idempotencyKey=${options.idempotencyKey} (existing job ${recent.id})`,
        );
        return this.rowToJob<T>(recent);
      }
    }

    const row = await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.create({
        data: {
          name,
          data,
          status: delayedUntil ? 'DELAYED' : 'WAITING',
          priority: options?.priority ?? 0,
          maxAttempts: options?.attempts ?? DEFAULT_MAX_ATTEMPTS,
          delayedUntil,
          idempotencyKey: options?.idempotencyKey ?? null,
        },
      }),
    );

    return this.rowToJob<T>(row);
  }

  private async findRecentCompletedByIdempotency(
    name: string,
    idempotencyKey: string,
  ): Promise<QueueJobRow | null> {
    const cutoff = new Date(Date.now() - IDEMPOTENCY_LOOKBACK_MS);
    const rows = await this.prisma.runUnrestricted(
      async () =>
        this.prisma.$queryRaw<QueueJobRow[]>`
          SELECT * FROM "QueueJob"
          WHERE name = ${name}
            AND "idempotencyKey" = ${idempotencyKey}
            AND status = 'COMPLETED'
            AND "completedAt" >= ${cutoff}
          ORDER BY "completedAt" DESC
          LIMIT 1
        `,
    );
    return rows && rows[0] ? rows[0] : null;
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

    await this.recoverStaleActiveJobs(name);

    const rows =
      (await this.prisma.runUnrestricted(
        async () =>
          this.prisma.$queryRaw<QueueJobRow[]>`
        UPDATE "QueueJob"
        SET status = 'ACTIVE', "processedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = (
          SELECT id FROM "QueueJob"
          WHERE name = ${name}
            AND status IN ('WAITING', 'DELAYED')
            AND ("delayedUntil" IS NULL OR "delayedUntil" <= NOW())
          ORDER BY priority DESC, "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `,
      )) ?? [];

    if (!rows.length) return;

    const row = rows[0];
    const job = this.rowToJob(row);

    if (row.idempotencyKey) {
      const recent = await this.findRecentCompletedByIdempotency(
        name,
        row.idempotencyKey,
      );
      if (recent && recent.id !== row.id) {
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              failedReason: 'Skipped: idempotency-key already completed',
            },
          }),
        );
        this.metrics?.observeJobCompletion(name, 'idempotent_skip');
        return;
      }
    }

    const startedAt = Date.now();
    try {
      await handler(job);

      await this.prisma.runUnrestricted(async () =>
        this.prisma.queueJob.update({
          where: { id: row.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        }),
      );
      this.metrics?.observeJobCompletion(name, 'completed');
      this.metrics?.observeJobDuration(name, (Date.now() - startedAt) / 1000);
    } catch (error) {
      const failedReason =
        error instanceof Error ? error.message : String(error);
      const nextAttemptsMade = row.attemptsMade + 1;

      if (nextAttemptsMade < row.maxAttempts) {
        const backoffMs = computeBackoffMs(nextAttemptsMade);
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'DELAYED',
              attemptsMade: nextAttemptsMade,
              failedReason,
              delayedUntil: new Date(Date.now() + backoffMs),
            },
          }),
        );
        this.metrics?.observeJobCompletion(name, 'retried');
      } else {
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'DEAD_LETTERED',
              attemptsMade: nextAttemptsMade,
              failedReason,
              deadLetteredAt: new Date(),
            },
          }),
        );
        this.metrics?.observeJobCompletion(name, 'dead_lettered');
        this.logger.error(
          `Job ${row.id} (${name}) dead-lettered after ${nextAttemptsMade} attempts: ${failedReason}`,
        );
      }
      this.metrics?.observeJobDuration(name, (Date.now() - startedAt) / 1000);
    }

    await this.refreshDlqGauge(name);
  }

  private async refreshDlqGauge(name: string): Promise<void> {
    if (!this.metrics) return;
    try {
      const count = await this.prisma.runUnrestricted(async () =>
        this.prisma.queueJob.count({
          where: { name, status: 'DEAD_LETTERED' },
        }),
      );
      this.metrics.setDlqSize(name, count);
    } catch {
      // never let metrics refresh fail the job loop
    }
  }

  /**
   * Returns dead-lettered jobs for a queue, newest first.
   */
  async listDeadLettered(
    name: string,
    limit = 50,
  ): Promise<QueueJob<QueueJobData>[]> {
    const rows = await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.findMany({
        where: { name, status: 'DEAD_LETTERED' },
        orderBy: { deadLetteredAt: 'desc' },
        take: limit,
      }),
    );
    return rows.map((row) => this.rowToJob(row));
  }

  /**
   * Replays a dead-lettered job by resetting attempt counts and putting
   * it back into the WAITING queue. Returns the refreshed job.
   */
  async replayDeadLettered(jobId: string): Promise<QueueJob<QueueJobData>> {
    const row = await this.prisma.runUnrestricted(async () =>
      this.prisma.queueJob.update({
        where: { id: jobId },
        data: {
          status: 'WAITING',
          attemptsMade: 0,
          failedReason: null,
          deadLetteredAt: null,
          delayedUntil: null,
          processedAt: null,
        },
      }),
    );
    await this.refreshDlqGauge(row.name);
    return this.rowToJob(row);
  }

  private async recoverStaleActiveJobs(name: string): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_ACTIVE_TIMEOUT_MS);
    const delayedUntil = new Date(Date.now() + RECOVERY_DELAY_MS);

    const delayedRows =
      (await this.prisma.runUnrestricted(
        async () =>
          this.prisma.$queryRaw<Array<{ id: string }>>`
          UPDATE "QueueJob"
          SET status = 'DELAYED',
              "attemptsMade" = "attemptsMade" + 1,
              "failedReason" = NULL,
              "delayedUntil" = ${delayedUntil},
              "updatedAt" = NOW()
          WHERE name = ${name}
            AND status = 'ACTIVE'
            AND "processedAt" < ${staleBefore}
            AND "attemptsMade" < "maxAttempts"
          RETURNING id
        `,
      )) ?? [];

    const failedRows =
      (await this.prisma.runUnrestricted(
        async () =>
          this.prisma.$queryRaw<Array<{ id: string }>>`
          UPDATE "QueueJob"
          SET status = 'FAILED',
              "failedReason" = 'Recovered stale ACTIVE job after timeout',
              "updatedAt" = NOW()
          WHERE name = ${name}
            AND status = 'ACTIVE'
            AND "processedAt" < ${staleBefore}
            AND "attemptsMade" >= "maxAttempts"
          RETURNING id
        `,
      )) ?? [];

    if (delayedRows.length > 0 || failedRows.length > 0) {
      this.logger.warn(
        `Recovered stale ACTIVE jobs for ${name}: delayed=${delayedRows.length}, failed=${failedRows.length}`,
      );
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
      failed:
        (byStatus.get('FAILED') ?? 0) + (byStatus.get('DEAD_LETTERED') ?? 0),
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
      maxAttempts: row.maxAttempts,
      timestamp: row.createdAt.getTime(),
    };
  }
}

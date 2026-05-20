import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { jsonObjectSchema } from '@workspace/types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IQueueProvider,
  QueueJob,
  QueueJobData,
  QueueJobHandler,
  QueueJobOptions,
  QueueStats,
} from './queue.interface';
import type {
  QueueJobRepository,
  QueueJobRow,
} from './ports/queue-job.repository.port';
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

@Injectable()
export class PostgresQueueService implements IQueueProvider, OnModuleDestroy {
  private readonly logger = new Logger(PostgresQueueService.name);
  private readonly handlers = new Map<string, QueueJobHandler>();
  private readonly pollers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly queueJobs: QueueJobRepository,
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

    // RLS-BYPASS: background queue workers run without per-request clinic session
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
    const cutoff = new Date(
      this.clock.now().getTime() - IDEMPOTENCY_LOOKBACK_MS,
    );
    return this.queueJobs.findRecentCompletedByIdempotency(
      name,
      idempotencyKey,
      cutoff,
    );
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
      interval.unref?.();

      this.pollers.set(name, interval);
    }
  }

  private async poll(name: string): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) return;

    await this.recoverStaleActiveJobs(name);

    const rows = await this.queueJobs.claimNextWaitingJob(name);

    if (!rows.length) return;

    const row = rows[0];
    const job = this.rowToJob(row);

    if (row.idempotencyKey) {
      const recent = await this.findRecentCompletedByIdempotency(
        name,
        row.idempotencyKey,
      );
      if (recent && recent.id !== row.id) {
        // RLS-BYPASS: background queue workers run without per-request clinic session
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'COMPLETED',
              completedAt: this.clock.now(),
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

      // RLS-BYPASS: background queue workers run without per-request clinic session
      await this.prisma.runUnrestricted(async () =>
        this.prisma.queueJob.update({
          where: { id: row.id },
          data: { status: 'COMPLETED', completedAt: this.clock.now() },
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
        // RLS-BYPASS: background queue workers run without per-request clinic session
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
        // RLS-BYPASS: background queue workers run without per-request clinic session
        await this.prisma.runUnrestricted(async () =>
          this.prisma.queueJob.update({
            where: { id: row.id },
            data: {
              status: 'DEAD_LETTERED',
              attemptsMade: nextAttemptsMade,
              failedReason,
              deadLetteredAt: this.clock.now(),
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
      // RLS-BYPASS: background queue workers run without per-request clinic session
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
    // RLS-BYPASS: background queue workers run without per-request clinic session
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
    // RLS-BYPASS: background queue workers run without per-request clinic session
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
    const nowMs = this.clock.now().getTime();
    const staleBefore = new Date(nowMs - STALE_ACTIVE_TIMEOUT_MS);
    const delayedUntil = new Date(nowMs + RECOVERY_DELAY_MS);

    const delayedRows = await this.queueJobs.recoverStaleActiveToDelayed(
      name,
      staleBefore,
      delayedUntil,
    );

    const failedRows = await this.queueJobs.recoverStaleActiveToFailed(
      name,
      staleBefore,
    );

    if (delayedRows.length > 0 || failedRows.length > 0) {
      this.logger.warn(
        `Recovered stale ACTIVE jobs for ${name}: delayed=${delayedRows.length}, failed=${failedRows.length}`,
      );
    }
  }

  async getJob<T extends QueueJobData>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    const row = await this.queueJobs.findById(jobId);
    if (!row) return null;
    return this.rowToJob<T>(row);
  }

  async removeJob(jobId: string): Promise<void> {
    // RLS-BYPASS: background queue workers run without per-request clinic session
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
    const rows = await this.queueJobs.countByStatus(name);

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
    const data = (parsePrismaJsonColumn(row.data, jsonObjectSchema) ?? {}) as T;
    return {
      id: row.id,
      name: row.name,
      data,
      progress: 0,
      failedReason: row.failedReason ?? undefined,
      attemptsMade: row.attemptsMade,
      maxAttempts: row.maxAttempts,
      timestamp: row.createdAt.getTime(),
    };
  }
}

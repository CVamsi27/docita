// jscpd:ignore-start
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { jsonObjectSchema } from '@workspace/types';
import { QueueJobOutcome } from '@workspace/db';
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
import { bindQueueJobHandler, coerceQueueJob } from './queue-job-boundary';
import type {
  QueueJobRepository,
  // jscpd:ignore-end
  QueueJobRow,
} from './ports/queue-job.repository.port';
import { WorkerMetricsService } from './worker-metrics.service';
import { QueueJobLifecycle } from './queue-job-lifecycle';

const POLL_INTERVAL_MS = 2000;
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
  private readonly activePolls = new Map<string, Promise<void>>();
  private shuttingDown = false;
  private readonly lifecycle: QueueJobLifecycle;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly queueJobs: QueueJobRepository,
    private readonly metrics?: WorkerMetricsService,
  ) {
    this.lifecycle = new QueueJobLifecycle(queueJobs, clock);
  }

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
        return coerceQueueJob<T>(this.rowToJob(recent));
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

    return coerceQueueJob<T>(this.rowToJob(row));
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
    if (this.shuttingDown) {
      throw new Error('Queue is shutting down');
    }
    this.handlers.set(name, bindQueueJobHandler(handler));

    if (!this.pollers.has(name)) {
      const interval = setInterval(() => {
        void this.pollIfIdle(name).catch((err) => {
          this.logger.error(
            `Queue poller error for ${name}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }, POLL_INTERVAL_MS);
      interval.unref?.();

      this.pollers.set(name, interval);
    }
  }

  private async pollIfIdle(name: string): Promise<void> {
    if (this.shuttingDown || this.activePolls.has(name)) return;

    const poll = this.poll(name);
    this.activePolls.set(name, poll);
    try {
      await poll;
    } finally {
      this.activePolls.delete(name);
    }
  }

  private async poll(name: string): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) return;

    await this.lifecycle.recoverStaleActiveJobs(name);
    if (this.shuttingDown) return;

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
        const skipped = await this.lifecycle.acknowledgeClaim(row, {
          status: 'COMPLETED',
          completedAt: this.clock.now(),
          failedReason: 'Skipped: idempotency-key already completed',
        });
        if (skipped) {
          this.metrics?.observeJobCompletion(name, 'idempotent_skip');
          await this.lifecycle.recordExecution(row, {
            outcome: QueueJobOutcome.IDEMPOTENT_SKIP,
            attempt: row.attemptsMade + 1,
            failedReason: 'Skipped: idempotency-key already completed',
          });
        }
        return;
      }
    }

    const startedAt = Date.now();
    try {
      await handler(job);

      const applied = await this.lifecycle.acknowledgeClaim(row, {
        status: 'COMPLETED',
        completedAt: this.clock.now(),
      });
      if (applied) {
        this.metrics?.observeJobCompletion(name, 'completed');
        await this.lifecycle.recordExecution(row, {
          outcome: QueueJobOutcome.COMPLETED,
          attempt: row.attemptsMade + 1,
          durationMs: Date.now() - startedAt,
        });
      }
      this.metrics?.observeJobDuration(name, (Date.now() - startedAt) / 1000);
    } catch (error) {
      const failedReason =
        error instanceof Error ? error.message : String(error);
      const nextAttemptsMade = row.attemptsMade + 1;

      if (nextAttemptsMade < row.maxAttempts) {
        const backoffMs = computeBackoffMs(nextAttemptsMade);
        const applied = await this.lifecycle.acknowledgeClaim(row, {
          status: 'DELAYED',
          attemptsMade: nextAttemptsMade,
          failedReason,
          delayedUntil: new Date(Date.now() + backoffMs),
        });
        if (applied) {
          this.metrics?.observeJobCompletion(name, 'retried');
          await this.lifecycle.recordExecution(row, {
            outcome: QueueJobOutcome.RETRY_SCHEDULED,
            attempt: nextAttemptsMade,
            durationMs: Date.now() - startedAt,
            failedReason,
          });
        }
      } else {
        const applied = await this.lifecycle.acknowledgeClaim(row, {
          status: 'DEAD_LETTERED',
          attemptsMade: nextAttemptsMade,
          failedReason,
          deadLetteredAt: this.clock.now(),
        });
        if (applied) {
          this.metrics?.observeJobCompletion(name, 'dead_lettered');
          this.logger.error(
            `Job ${row.id} (${name}) dead-lettered after ${nextAttemptsMade} attempts: ${failedReason}`,
          );
          await this.lifecycle.recordExecution(row, {
            outcome: QueueJobOutcome.DEAD_LETTERED,
            attempt: nextAttemptsMade,
            durationMs: Date.now() - startedAt,
            failedReason,
          });
        }
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
   * it back into the WAITING queue. The replay count remains durable so
   * operators and future auto-replay policy can enforce a bounded history.
   * Returns the refreshed job.
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
          replayCount: { increment: 1 },
          lastReplayedAt: this.clock.now(),
        },
      }),
    );
    await this.refreshDlqGauge(row.name);
    try {
      await this.queueJobs.appendExecutions([
        {
          jobId: row.id,
          queueName: row.name,
          outcome: QueueJobOutcome.REPLAYED,
          attempt: 1,
          claimToken: null,
          durationMs: null,
          failedReason: `Replayed after ${row.replayCount} replay(s)`,
          occurredAt: this.clock.now(),
        },
      ]);
    } catch (error) {
      this.logger.warn(
        `Could not record replay history for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.rowToJob(row);
  }

  async getJob<T extends QueueJobData>(
    jobId: string,
  ): Promise<QueueJob<T> | null> {
    const row = await this.queueJobs.findById(jobId);
    if (!row) return null;
    return coerceQueueJob<T>(this.rowToJob(row));
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

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    for (const [, interval] of this.pollers) {
      clearInterval(interval);
    }
    this.pollers.clear();

    // Keep persistence open until owned claims finish; the worker bounds shutdown.
    const outcomes = await Promise.allSettled(this.activePolls.values());
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        const error: unknown = outcome.reason;
        throw error instanceof Error
          ? error
          : new Error('Queue poll failed during shutdown');
      }
    }
  }

  private rowToJob(row: QueueJobRow): QueueJob<QueueJobData> {
    const data = parsePrismaJsonColumn(row.data, jsonObjectSchema) ?? {};
    return {
      id: row.id,
      name: row.name,
      data,
      progress: 0,
      failedReason: row.failedReason ?? undefined,
      attemptsMade: row.attemptsMade,
      maxAttempts: row.maxAttempts,
      replayCount: row.replayCount,
      lastReplayedAt: row.lastReplayedAt?.getTime(),
      timestamp: row.createdAt.getTime(),
    };
  }
}

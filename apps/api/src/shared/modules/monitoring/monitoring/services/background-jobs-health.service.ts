import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  BackgroundJobsHealthSummary,
  SchedulerHeartbeat,
} from '@workspace/types';

/**
 * Whether the durable background backends are keeping up.
 *
 * Reads two tables that were already being written but never read back: cron
 * heartbeats (one row per `@TrackHeartbeat` job) and the outbox (pending and
 * failed events awaiting the relay). Both answer "is async work draining?",
 * which during a deploy is the question an operator actually has.
 *
 * No per-job cadence is stored, so this reports `ageMs` and lets the reader
 * judge staleness rather than inventing a threshold per job.
 *
 * Split out of `MetricsQueryService` (file-size budget): this is durable-job
 * health, a different question from the HTTP-metrics queries that live there.
 */
@Injectable()
export class BackgroundJobsHealthService {
  private readonly logger = new Logger(BackgroundJobsHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getBackgroundJobsHealthSummary(): Promise<BackgroundJobsHealthSummary> {
    const now = this.clock.now().getTime();
    try {
      const [
        heartbeats,
        pendingCount,
        failingCount,
        oldestPending,
        oldestRetry,
      ] = await Promise.all([
        this.prisma.cronHeartbeat.findMany({
          select: {
            name: true,
            lastRunAt: true,
            lastStatus: true,
            lastError: true,
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.outboxEvent.count({
          where: { processedAt: null },
        }),
        this.prisma.outboxEvent.count({
          where: { processedAt: null, lastError: { not: null } },
        }),
        this.prisma.outboxEvent.findFirst({
          where: { processedAt: null },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.outboxEvent.findFirst({
          where: { processedAt: null, lastError: { not: null } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const schedulers: SchedulerHeartbeat[] = heartbeats.map((row) => ({
        name: row.name,
        lastRunAt: row.lastRunAt.toISOString(),
        lastStatus: row.lastStatus,
        ageMs: Math.max(0, now - row.lastRunAt.getTime()),
        lastError: row.lastError ?? null,
      }));

      return {
        schedulers,
        schedulerSummary: {
          total: schedulers.length,
          failing: schedulers.filter((job) => job.lastStatus === 'FAILURE')
            .length,
          oldestAgeMs: schedulers.length
            ? Math.max(...schedulers.map((job) => job.ageMs))
            : null,
        },
        outbox: {
          pending: pendingCount,
          failing: failingCount,
          oldestPendingAgeMs: oldestPending
            ? Math.max(0, now - oldestPending.createdAt.getTime())
            : null,
          oldestRetryAgeMs: oldestRetry
            ? Math.max(0, now - oldestRetry.createdAt.getTime())
            : null,
        },
        coverageNote:
          'Live read of the current replica database. `ageMs` is reported per job rather than a stale flag because each schedule has its own cadence and none is stored.',
      };
    } catch (error) {
      this.logger.error(
        `Failed to load background jobs health summary: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return {
        schedulers: [],
        schedulerSummary: { total: 0, failing: 0, oldestAgeMs: null },
        outbox: {
          pending: 0,
          failing: 0,
          oldestPendingAgeMs: null,
          oldestRetryAgeMs: null,
        },
        coverageNote:
          'Unavailable: the background jobs health query failed. Treat these numbers as unknown, not as zero.',
      };
    }
  }
}

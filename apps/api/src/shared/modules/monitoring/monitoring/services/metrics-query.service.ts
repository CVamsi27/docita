import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { MetricType, Prisma, RouteCategory } from '@workspace/db';
import {
  API_REQUEST_METRICS_REPOSITORY_TOKEN,
  type ApiRequestMetricsRepository,
} from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';
import { BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import { toRouteCategoryBreakdown } from '@/shared/modules/monitoring/monitoring/rules/telemetry-observation.rules';
import { BackgroundJobsHealthService } from '@/shared/modules/monitoring/monitoring/services/background-jobs-health.service';
import type {
  BackgroundJobsHealthSummary,
  PerformanceMetrics,
} from '@workspace/types';

@Injectable()
export class MetricsQueryService {
  private readonly logger = new Logger(MetricsQueryService.name);

  constructor(
    private readonly backgroundJobs: BackgroundJobsHealthService,
    private readonly prisma: PrismaService,
    @Inject(API_REQUEST_METRICS_REPOSITORY_TOKEN)
    private readonly apiRequestMetrics: ApiRequestMetricsRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getSystemMetrics(
    startDate: Date,
    endDate: Date,
    metricType?: MetricType,
  ): Promise<unknown[]> {
    try {
      const where: Prisma.SystemMetricWhereInput = {
        recordedAt: { gte: startDate, lte: endDate },
      };

      if (metricType) {
        where.metricType = metricType;
      }

      return await this.prisma.systemMetric.findMany({
        where,
        orderBy: { recordedAt: 'asc' },
        take: BULK_READ_LIMIT,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        // jscpd:ignore-start
      );
      return [];
    }
  }

  async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date,
    routeCategory?: RouteCategory,
  ): Promise<PerformanceMetrics> {
    const where: Prisma.ApiRequestWhereInput = {};
    // observedAt, not createdAt: rows flushed late after an outage still belong
    // to the window the request completed in.
    if (startDate || endDate) {
      where.observedAt = {};
      if (startDate) where.observedAt.gte = startDate;
      if (endDate) where.observedAt.lte = endDate;
    }
    if (routeCategory) where.routeCategory = routeCategory;

    const metricsFilter = { startDate, endDate, routeCategory };
    const validWhere: Prisma.ApiRequestWhereInput = {
      ...where,
      latencyValid: true,
    };

    const [slowestEndpoints, distributionRows, byCategoryRows] =
      await Promise.all([
        this.prisma.apiRequest.groupBy({
          // jscpd:ignore-end
          by: ['path', 'method'],
          where: validWhere,
          _avg: { duration: true },
          _max: { duration: true },
          _count: { id: true },
          orderBy: { _avg: { duration: 'desc' } },
          take: 15,
        }),
        this.apiRequestMetrics.getResponseTimeDistribution(metricsFilter),
        this.prisma.apiRequest.groupBy({
          by: ['routeCategory'],
          where,
          _count: { id: true },
        }),
      ]);

    const distributionRow = distributionRows[0] ?? {
      range_0_100: 0n,
      range_100_250: 0n,
      range_250_500: 0n,
      range_500_1000: 0n,
      range_1000_2000: 0n,
      range_2000_5000: 0n,
      range_5000_plus: 0n,
      invalid_latency_samples: 0n,
    };

    const distribution = [
      { range: '0-100ms', count: Number(distributionRow.range_0_100) },
      { range: '100-250ms', count: Number(distributionRow.range_100_250) },
      { range: '250-500ms', count: Number(distributionRow.range_250_500) },
      { range: '500ms-1s', count: Number(distributionRow.range_500_1000) },
      { range: '1-2s', count: Number(distributionRow.range_1000_2000) },
      { range: '2-5s', count: Number(distributionRow.range_2000_5000) },
      { range: '5s+', count: Number(distributionRow.range_5000_plus) },
    ];

    const now = this.clock.now();
    const throughputStart =
      startDate ?? new Date(now.getTime() - 60 * 60 * 1000);
    const throughputEnd = endDate ?? now;
    const throughputRows = await this.apiRequestMetrics.getThroughputByMinute(
      throughputStart,
      throughputEnd,
    );

    const throughputByMinute = throughputRows.map((row) => ({
      minute: row.minute,
      count: Number(row.count),
    }));

    return {
      slowestEndpoints: slowestEndpoints.map((e) => ({
        path: e.path,
        method: e.method,
        avgDuration: e._avg.duration || 0,
        maxDuration: e._max.duration || 0,
        count: e._count.id,
      })),
      responseTimeDistribution: distribution,
      throughputByMinute,
      byRouteCategory: toRouteCategoryBreakdown(byCategoryRows),
      invalidLatencySamples: Number(distributionRow.invalid_latency_samples),
    };
  }

  async getSecurityMonitoringSummary(startDate: Date, endDate: Date) {
    const whereBase: Prisma.ApiRequestWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
    };

    try {
      const [
        totalRequests,
        status401,
        status403,
        status429,
        status5xx,
        topAuthFailureRoutes,
      ] = await Promise.all([
        this.prisma.apiRequest.count({ where: whereBase }),
        this.prisma.apiRequest.count({
          where: { ...whereBase, statusCode: 401 },
        }),
        this.prisma.apiRequest.count({
          where: { ...whereBase, statusCode: 403 },
        }),
        this.prisma.apiRequest.count({
          where: { ...whereBase, statusCode: 429 },
        }),
        this.prisma.apiRequest.count({
          where: {
            ...whereBase,
            statusCode: { gte: 500, lte: 599 },
          },
        }),
        this.prisma.apiRequest.groupBy({
          by: ['path', 'method', 'statusCode'],
          where: {
            ...whereBase,
            statusCode: { in: [401, 403, 429] },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 25,
        }),
      ]);

      return {
        windowStart: startDate.toISOString(),
        windowEnd: endDate.toISOString(),
        totalRequests,
        status401,
        status403,
        status429,
        status5xx,
        topAuthFailureRoutes: topAuthFailureRoutes.map((row) => ({
          path: row.path,
          method: row.method,
          statusCode: row.statusCode,
          count: row._count.id,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to load security monitoring summary: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return {
        windowStart: startDate.toISOString(),
        windowEnd: endDate.toISOString(),
        totalRequests: 0,
        status401: 0,
        status403: 0,
        status429: 0,
        status5xx: 0,
        topAuthFailureRoutes: [],
      };
    }
  }

  /**
   * Delegates to BackgroundJobsHealthService: durable-job health is a separate
   * concern from the HTTP-metrics queries in this service.
   */
  async getBackgroundJobsHealthSummary(): Promise<BackgroundJobsHealthSummary> {
    return this.backgroundJobs.getBackgroundJobsHealthSummary();
  }

  /**
   * Current queue state plus the last 24h of immutable execution outcomes.
   *
   * `countsByStatus` is current state only, so a job that failed twice and then
   * succeeded is indistinguishable from a clean run. The outcome history is what
   * makes recovered retries and lost claims visible.
   */
  async getQueueHealthSummary() {
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [
        countsByStatus,
        topQueuesByWaiting,
        topQueuesByFailed,
        dlq24h,
        outcomesLast24h,
        retriedJobIds,
      ] = await Promise.all([
        this.prisma.queueJob.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.queueJob.groupBy({
          by: ['name'],
          where: { status: 'WAITING' },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 12,
        }),
        this.prisma.queueJob.groupBy({
          by: ['name'],
          where: { status: 'FAILED' },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 12,
        }),
        this.prisma.queueJob.count({
          where: {
            status: 'DEAD_LETTERED',
            deadLetteredAt: { gte: since24h },
          },
        }),
        this.prisma.queueJobExecution.groupBy({
          by: ['outcome'],
          where: { occurredAt: { gte: since24h } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        this.prisma.queueJobExecution.findMany({
          where: {
            occurredAt: { gte: since24h },
            outcome: 'RETRY_SCHEDULED',
          },
          distinct: ['jobId'],
          select: { jobId: true },
        }),
      ]);

      // A recovery is a job that retried inside the window and also completed
      // inside it, so the two lists overlap by construction and only the
      // intersection is reported as recovered work.
      const retriedJobIdsList = retriedJobIds.map((row) => row.jobId);
      const recoveredJobIdsList =
        retriedJobIdsList.length === 0
          ? []
          : await this.prisma.queueJobExecution.findMany({
              where: {
                jobId: { in: retriedJobIdsList },
                outcome: 'COMPLETED',
                occurredAt: { gte: since24h },
              },
              distinct: ['jobId'],
              select: { jobId: true },
            });

      const retriedSet = new Set(retriedJobIdsList);
      const completedSet = new Set(recoveredJobIdsList.map((row) => row.jobId));
      const recovered = [...retriedSet].filter((jobId) =>
        completedSet.has(jobId),
      ).length;

      return {
        countsByStatus: countsByStatus.map((row) => ({
          status: row.status,
          count: row._count.id,
        })),
        topQueuesByWaiting: topQueuesByWaiting.map((row) => ({
          name: row.name,
          count: row._count.id,
        })),
        topQueuesByFailed: topQueuesByFailed.map((row) => ({
          name: row.name,
          count: row._count.id,
        })),
        deadLetteredLast24h: dlq24h,
        outcomesLast24h: outcomesLast24h.map((row) => ({
          outcome: row.outcome,
          count: row._count.id,
        })),
        jobsRetriedLast24h: retriedSet.size,
        jobsRecoveredLast24h: recovered,
      };
    } catch (error) {
      this.logger.error(
        `Failed to load queue health summary: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return {
        countsByStatus: [],
        topQueuesByWaiting: [],
        topQueuesByFailed: [],
        deadLetteredLast24h: 0,
        outcomesLast24h: [],
        jobsRetriedLast24h: 0,
        jobsRecoveredLast24h: 0,
      };
    }
  }
}

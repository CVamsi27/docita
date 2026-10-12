import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, RouteCategory } from '@workspace/db';
import type { RequestStats } from '@workspace/types';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { isRecord } from '@workspace/utils';
import { isDatabaseAuthError } from '@/shared/common/utils/is-database-auth-error';
import {
  API_REQUEST_METRICS_REPOSITORY_TOKEN,
  type ApiRequestMetricsRepository,
} from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';
import { ApiRequestInput } from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';
import {
  classifyRouteCategory,
  isValidLatencySample,
  toRouteCategoryBreakdown,
} from '@/shared/modules/monitoring/monitoring/rules/telemetry-observation.rules';
import { TelemetryCaptureRecorder } from '@/shared/modules/monitoring/monitoring/services/telemetry-capture-recorder.service';

/**
 * Hard ceiling on the in-memory buffer.
 *
 * While persistence is down the buffer is retained for retry, which previously
 * grew without limit and took the process down with it. When the ceiling is hit
 * the oldest rows are discarded and the loss is recorded as a capture event
 * rather than happening silently.
 */
const MAX_BUFFER_SIZE = 10_000;

@Injectable()
export class RequestLogService implements OnModuleDestroy {
  private readonly logger = new Logger(RequestLogService.name);
  private requestBuffer: ApiRequestInput[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private persistenceDisabled = false;
  private flushInProgress = false;
  private loggedPersistenceDisabledReason = false;
  private droppedWhileDisabled = 0;
  private droppedWhileTruncated = 0;

  constructor(
    private prisma: PrismaService,
    private monitoringFactory: MonitoringFactory,
    @Inject(API_REQUEST_METRICS_REPOSITORY_TOKEN)
    private readonly apiRequestMetrics: ApiRequestMetricsRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly captureRecorder: TelemetryCaptureRecorder,
  ) {
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
        // jscpd:ignore-start
        this.logger.error('Failed to flush request buffer', error);
      });
    }, this.FLUSH_INTERVAL);
    this.flushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer().catch((error) => {
      this.logger.error('Failed to flush requests on shutdown', error);
      // jscpd:ignore-end
    });
  }

  logRequest(data: ApiRequestInput): void {
    if (this.persistenceDisabled) {
      // Capture is off. Counting here is what makes the gap reportable: an
      // early return without a counter is the original defect.
      this.droppedWhileDisabled += 1;
      return;
    }

    let validatedData: ApiRequestInput;
    try {
      validatedData = this.monitoringFactory.createApiRequest(data);
    } catch (error) {
      this.logger.warn(
        'Skipping malformed api-request payload in monitoring pipeline',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    this.requestBuffer.push(validatedData);

    this.enforceBufferCeiling();

    if (this.requestBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffer().catch((error) => {
        this.logger.error('Failed to flush request buffer', error);
      });
    }
  }

  /**
   * Discards the oldest rows when the buffer exceeds MAX_BUFFER_SIZE. An outage
   * must not convert telemetry buffering into an out-of-memory kill; the loss is
   * recorded so coverage reports it.
   */
  private enforceBufferCeiling(): void {
    if (this.requestBuffer.length <= MAX_BUFFER_SIZE) {
      return;
    }
    const overflow = this.requestBuffer.length - MAX_BUFFER_SIZE;
    this.requestBuffer.splice(0, overflow);
    this.droppedWhileTruncated += overflow;
    this.captureRecorder
      .recordTruncated('BUFFER_OVERFLOW', overflow, this.requestBuffer.length)
      .catch((error) => {
        this.logger.warn(
          `Could not record telemetry truncation: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  async flushBuffer(): Promise<void> {
    if (this.persistenceDisabled || this.requestBuffer.length === 0) {
      return;
    }
    if (this.flushInProgress) {
      return;
    }
    const requestsToFlush = this.requestBuffer.slice(0, this.BATCH_SIZE);
    if (requestsToFlush.length === 0) {
      return;
    }
    try {
      this.flushInProgress = true;
      // RLS-BYPASS: system telemetry and error logs are not clinic-scoped
      await this.prisma.runUnrestricted(async () => {
        await this.prisma.apiRequest.createMany({
          data: requestsToFlush.map((req) => ({
            clinicId: req.clinicId,
            userId: req.userId,
            method: req.method,
            path: req.path,
            statusCode: req.statusCode,
            duration: req.duration,
            requestSize: req.requestSize,
            responseSize: req.responseSize,
            userAgent: req.userAgent,
            ip: req.ip,
            error: req.error,
            errorStack: req.errorStack,
            // Health probes and internal staff traffic are separated from
            // customer operations so volume and latency reporting can exclude
            // them. Classified from the path here, not at the producer, so every
            // source of an ApiRequestInput gets the same answer.
            routeCategory: classifyRouteCategory(req.path),
            // Opaque join key for the matching ErrorLog row. Carries no
            // identity, so a request and its error can be tied together without
            // either carrying more personal data than it already does.
            correlationId: req.correlationId,
            // The instant the request finished. createdAt stays the row insert
            // time, which after an outage can be hours late; window queries read
            // observedAt so a late flush cannot distort a settled hour.
            observedAt: req.observedAt ?? this.clock.now(),
            latencyValid: isValidLatencySample(req.duration),
            metadata:
              req.metadata !== undefined
                ? toPrismaInputJsonValue(req.metadata)
                : undefined,
          })),
          skipDuplicates: true,
        });
      });
      this.requestBuffer.splice(0, requestsToFlush.length);
      await this.captureRecorder.flushPending();
      this.logger.debug(`Flushed ${requestsToFlush.length} requests`);
    } catch (error) {
      if (isDatabaseAuthError(error)) {
        this.disablePersistence(
          'Disabling request-log database persistence due to database authentication failure. Verify DATABASE_URL credentials.',
          'DATABASE_AUTH_FAILURE',
        );
        return;
      }

      if (this.isMissingApiRequestTableError(error)) {
        this.disablePersistence(
          'Disabling request-log database persistence because monitoring tables are missing. Run Prisma migrations (the migration that creates "ApiRequest").',
          'MISSING_MONITORING_TABLES',
        );
        return;
      }

      this.logger.error('Failed to write requests to database', error);
    } finally {
      this.flushInProgress = false;
    }
  }

  private disablePersistence(message: string, reason: string): void {
    if (this.persistenceDisabled) {
      return;
    }

    this.persistenceDisabled = true;
    // The buffer is being discarded. That is a real coverage gap, so it is
    // counted and recorded rather than vanishing: without this the dashboard
    // reads the previous rows as if they were current traffic.
    const discarded = this.requestBuffer.length;
    this.droppedWhileDisabled += discarded;
    this.requestBuffer = [];
    this.loggedPersistenceDisabledReason = true;

    this.logger.warn(message);
    this.captureRecorder.recordDisabled(reason, discarded, 0).catch((error) => {
      this.logger.warn(
        `Could not record telemetry capture loss: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  /**
   * Number of requests this process knows it failed to persist. Exposed for
   * tests and for the coverage report.
   */
  getDroppedRequestCount(): number {
    return this.droppedWhileDisabled + this.droppedWhileTruncated;
  }

  private isMissingApiRequestTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const code =
      'code' in error && typeof error.code === 'string' ? error.code : '';

    // Prisma known error for "table does not exist".
    // Common when migrations weren't applied (e.g. "ApiRequest" is missing).
    if (code === 'P2021' || code === 'P1014') return true;

    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';

    // Postgres: 42P01 = undefined_table
    // Prisma may surface the raw DB error string.
    if (
      message.includes('42p01') ||
      message.includes('undefined_table') ||
      message.includes('does not exist') ||
      message.includes('relation "apirequest" does not exist') ||
      message.includes('relation "ApiRequest" does not exist'.toLowerCase())
    ) {
      return true;
    }

    // Some Prisma errors include a `meta.table` field.
    if ('meta' in error && isRecord(error.meta)) {
      if (
        typeof error.meta.table === 'string' &&
        error.meta.table === 'ApiRequest'
      )
        return true;
    }

    return false;
  }

  async getRequestStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
    routeCategory?: RouteCategory,
  ): Promise<RequestStats> {
    const where: Prisma.ApiRequestWhereInput = {};
    // observedAt, not createdAt: a row flushed hours late after an outage still
    // belongs to the hour the request completed in.
    if (startDate || endDate) {
      where.observedAt = {};
      if (startDate) where.observedAt.gte = startDate;
      if (endDate) where.observedAt.lte = endDate;
    }
    if (clinicId) where.clinicId = clinicId;
    if (routeCategory) where.routeCategory = routeCategory;

    // Latency figures only ever average valid samples.
    const validWhere: Prisma.ApiRequestWhereInput = {
      ...where,
      latencyValid: true,
    };
    const metricsFilter = { startDate, endDate, clinicId, routeCategory };

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      avgDuration,
      requestsByPath,
      requestsByStatus,
      requestsByHourRows,
      byCategoryRows,
      invalidLatencySamples,
    ] = await Promise.all([
      this.prisma.apiRequest.count({ where }),
      this.prisma.apiRequest.count({
        where: { ...where, statusCode: { lt: 400 } },
      }),
      this.prisma.apiRequest.count({
        where: { ...where, statusCode: { gte: 400 } },
      }),
      this.prisma.apiRequest.aggregate({
        where: validWhere,
        _avg: { duration: true },
      }),
      this.prisma.apiRequest.groupBy({
        by: ['path'],
        where: validWhere,
        _count: { id: true },
        _avg: { duration: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.apiRequest.groupBy({
        by: ['statusCode'],
        where,
        _count: { id: true },
        orderBy: { statusCode: 'asc' },
      }),
      this.apiRequestMetrics.getRequestsByHour(metricsFilter),
      this.prisma.apiRequest.groupBy({
        by: ['routeCategory'],
        where,
        _count: { id: true },
      }),
      this.prisma.apiRequest.count({
        where: { ...where, latencyValid: false },
      }),
    ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: avgDuration._avg.duration || 0,
      requestsByPath: requestsByPath.map((r) => ({
        path: r.path,
        count: r._count.id,
        avgDuration: r._avg.duration || 0,
      })),
      requestsByStatus: requestsByStatus.map((r) => ({
        statusCode: r.statusCode,
        count: r._count.id,
      })),
      requestsByHour: requestsByHourRows.map((row) => ({
        hour: row.hour,
        count: Number(row.count),
      })),
      byRouteCategory: toRouteCategoryBreakdown(byCategoryRows),
      invalidLatencySamples,
    };
  }

  async cleanupOldRequests(daysToKeep: number): Promise<number> {
    const cutoffDate = this.clock.now();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.apiRequest.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    return result.count;
  }
}

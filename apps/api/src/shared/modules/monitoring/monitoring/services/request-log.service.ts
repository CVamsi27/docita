import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import {
  API_REQUEST_METRICS_REPOSITORY_TOKEN,
  type ApiRequestMetricsRepository,
} from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';
import { ApiRequestInput } from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';

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

  constructor(
    private prisma: PrismaService,
    private monitoringFactory: MonitoringFactory,
    @Inject(API_REQUEST_METRICS_REPOSITORY_TOKEN)
    private readonly apiRequestMetrics: ApiRequestMetricsRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
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
    });
  }

  logRequest(data: ApiRequestInput): void {
    if (this.persistenceDisabled) {
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

    if (this.requestBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffer().catch((error) => {
        this.logger.error('Failed to flush request buffer', error);
      });
    }
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
            metadata: req.metadata as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
      });

      this.requestBuffer.splice(0, requestsToFlush.length);
      this.logger.debug(`Flushed ${requestsToFlush.length} requests`);
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.disablePersistence(
          'Disabling request-log database persistence due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      if (this.isMissingApiRequestTableError(error)) {
        this.disablePersistence(
          'Disabling request-log database persistence because monitoring tables are missing. Run Prisma migrations (the migration that creates "ApiRequest").',
        );
        return;
      }

      this.logger.error('Failed to write requests to database', error);
    } finally {
      this.flushInProgress = false;
    }
  }

  private disablePersistence(message: string): void {
    this.persistenceDisabled = true;
    this.requestBuffer = [];

    if (this.loggedPersistenceDisabledReason) {
      return;
    }

    this.loggedPersistenceDisabledReason = true;
    this.logger.warn(message);
  }

  private isDatabaseAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';

    if (code === 'P1000') {
      return true;
    }

    return (
      message.includes('authentication failed against the database server') ||
      message.includes('database credentials') ||
      message.includes('password authentication failed')
    );
  }

  private isMissingApiRequestTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as {
      code?: unknown;
      message?: unknown;
      meta?: unknown;
    };

    const code = typeof candidate.code === 'string' ? candidate.code : '';

    // Prisma known error for "table does not exist".
    // Common when migrations weren't applied (e.g. "ApiRequest" is missing).
    if (code === 'P2021' || code === 'P1014') {
      return true;
    }

    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
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
    if (candidate.meta && typeof candidate.meta === 'object') {
      const meta = candidate.meta as { table?: unknown };
      if (typeof meta.table === 'string' && meta.table === 'ApiRequest') {
        return true;
      }
    }

    return false;
  }

  async getRequestStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    requestsByPath: { path: string; count: number; avgDuration: number }[];
    requestsByStatus: { statusCode: number; count: number }[];
    requestsByHour: { hour: number; count: number }[];
  }> {
    const where: Prisma.ApiRequestWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (clinicId) where.clinicId = clinicId;

    const metricsFilter = { startDate, endDate, clinicId };

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      avgDuration,
      requestsByPath,
      requestsByStatus,
      requestsByHourRows,
    ] = await Promise.all([
      this.prisma.apiRequest.count({ where }),
      this.prisma.apiRequest.count({
        where: { ...where, statusCode: { lt: 400 } },
      }),
      this.prisma.apiRequest.count({
        where: { ...where, statusCode: { gte: 400 } },
      }),
      this.prisma.apiRequest.aggregate({
        where,
        _avg: { duration: true },
      }),
      this.prisma.apiRequest.groupBy({
        by: ['path'],
        where,
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

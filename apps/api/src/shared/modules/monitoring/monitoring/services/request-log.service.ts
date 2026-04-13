import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
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

  constructor(
    private prisma: PrismaService,
    private monitoringFactory: MonitoringFactory,
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
    if (this.persistenceDisabled || this.requestBuffer.length === 0) return;

    const requestsToFlush = this.requestBuffer.splice(0, this.BATCH_SIZE);

    try {
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

      this.logger.debug(`Flushed ${requestsToFlush.length} requests`);
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.persistenceDisabled = true;
        this.requestBuffer = [];
        this.logger.warn(
          'Disabling request-log database persistence due to database authentication failure. Verify DATABASE_URL credentials.',
        );
        return;
      }

      this.logger.error('Failed to write requests to database', error);
    }
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

    const whereSqlClauses: Prisma.Sql[] = [];
    if (startDate) {
      whereSqlClauses.push(Prisma.sql`"createdAt" >= ${startDate}`);
    }
    if (endDate) {
      whereSqlClauses.push(Prisma.sql`"createdAt" <= ${endDate}`);
    }
    if (clinicId) {
      whereSqlClauses.push(Prisma.sql`"clinicId" = ${clinicId}`);
    }

    const sqlWhere =
      whereSqlClauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereSqlClauses, ' AND ')}`
        : Prisma.empty;

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
      this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>(Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM "createdAt")::int AS "hour",
          COUNT(*)::bigint AS "count"
        FROM "ApiRequest"
        ${sqlWhere}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY EXTRACT(HOUR FROM "createdAt") ASC
      `),
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.apiRequest.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    return result.count;
  }
}

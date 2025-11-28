import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ErrorSeverity, MetricType } from '@workspace/db';

interface RequestLogData {
  clinicId?: string;
  userId?: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  requestSize?: number;
  responseSize?: number;
  userAgent?: string;
  ip?: string;
  error?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorLogData {
  clinicId?: string;
  userId?: string;
  type: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  requestBody?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: ErrorSeverity;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  // =============================================
  // Request Logging
  // =============================================

  async logRequest(data: RequestLogData): Promise<void> {
    try {
      // Use upsert-style async operation to not block the response
      setImmediate(async () => {
        try {
          await this.prisma.apiRequest.create({
            data: {
              clinicId: data.clinicId,
              userId: data.userId,
              method: data.method,
              path: data.path,
              statusCode: data.statusCode,
              duration: data.duration,
              requestSize: data.requestSize,
              responseSize: data.responseSize,
              userAgent: data.userAgent,
              ip: data.ip,
              error: data.error,
              errorStack: data.errorStack,
              metadata: data.metadata as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          this.logger.error('Failed to log request', error);
        }
      });
    } catch (error) {
      this.logger.error('Failed to queue request log', error);
    }
  }

  // =============================================
  // Error Logging
  // =============================================

  async logError(data: ErrorLogData): Promise<void> {
    try {
      setImmediate(async () => {
        try {
          await this.prisma.errorLog.create({
            data: {
              clinicId: data.clinicId,
              userId: data.userId,
              type: data.type,
              message: data.message,
              stack: data.stack,
              path: data.path,
              method: data.method,
              statusCode: data.statusCode,
              userAgent: data.userAgent,
              ip: data.ip,
              requestBody: data.requestBody as Prisma.InputJsonValue,
              metadata: data.metadata as Prisma.InputJsonValue,
              severity: data.severity || ErrorSeverity.ERROR,
            },
          });
        } catch (error) {
          this.logger.error('Failed to log error', error);
        }
      });
    } catch (error) {
      this.logger.error('Failed to queue error log', error);
    }
  }

  // =============================================
  // System Metrics
  // =============================================

  async recordMetric(
    metricType: MetricType,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.systemMetric.create({
        data: {
          metricType,
          value,
          unit,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error('Failed to record metric', error);
    }
  }

  async recordSystemMetrics(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    await Promise.all([
      this.recordMetric(
        MetricType.MEMORY_USAGE,
        memoryUsage.rss / 1024 / 1024,
        'MB',
      ),
      this.recordMetric(
        MetricType.HEAP_USED,
        memoryUsage.heapUsed / 1024 / 1024,
        'MB',
      ),
      this.recordMetric(
        MetricType.HEAP_TOTAL,
        memoryUsage.heapTotal / 1024 / 1024,
        'MB',
      ),
      this.recordMetric(
        MetricType.CPU_USAGE,
        (cpuUsage.user + cpuUsage.system) / 1000000,
        'seconds',
      ),
      this.recordMetric(MetricType.UPTIME, uptime, 'seconds'),
    ]);
  }

  // =============================================
  // Analytics Retrieval
  // =============================================

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

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      avgDuration,
      requestsByPath,
      requestsByStatus,
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
    ]);

    // Get requests by hour of day
    const requestsRaw = await this.prisma.apiRequest.findMany({
      where,
      select: { createdAt: true },
    });

    const hourCounts = new Map<number, number>();
    requestsRaw.forEach((r) => {
      const hour = r.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const requestsByHour = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

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
      requestsByHour,
    };
  }

  async getErrorStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
  ): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsByType: { type: string; count: number }[];
    recentErrors: {
      id: string;
      type: string;
      message: string;
      path?: string;
      severity: string;
      createdAt: Date;
    }[];
    errorTrend: { date: string; count: number }[];
  }> {
    const where: Prisma.ErrorLogWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (clinicId) where.clinicId = clinicId;

    const [
      totalErrors,
      unresolvedErrors,
      errorsBySeverity,
      errorsByType,
      recentErrors,
    ] = await Promise.all([
      this.prisma.errorLog.count({ where }),
      this.prisma.errorLog.count({ where: { ...where, resolved: false } }),
      this.prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: { id: true },
      }),
      this.prisma.errorLog.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.errorLog.findMany({
        where,
        select: {
          id: true,
          type: true,
          message: true,
          path: true,
          severity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Get error trend by day
    const errorsRaw = await this.prisma.errorLog.findMany({
      where,
      select: { createdAt: true },
    });

    const dateCounts = new Map<string, number>();
    errorsRaw.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    });

    const errorTrend = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalErrors,
      unresolvedErrors,
      errorsBySeverity: errorsBySeverity.map((e) => ({
        severity: e.severity,
        count: e._count.id,
      })),
      errorsByType: errorsByType.map((e) => ({
        type: e.type,
        count: e._count.id,
      })),
      recentErrors: recentErrors.map((e) => ({
        ...e,
        path: e.path ?? undefined,
      })),
      errorTrend,
    };
  }

  async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    slowestEndpoints: {
      path: string;
      method: string;
      avgDuration: number;
      maxDuration: number;
      count: number;
    }[];
    responseTimeDistribution: { range: string; count: number }[];
    throughputByMinute: { minute: string; count: number }[];
  }> {
    const where: Prisma.ApiRequestWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get slowest endpoints
    const slowestEndpoints = await this.prisma.apiRequest.groupBy({
      by: ['path', 'method'],
      where,
      _avg: { duration: true },
      _max: { duration: true },
      _count: { id: true },
      orderBy: { _avg: { duration: 'desc' } },
      take: 15,
    });

    // Get response time distribution
    const allRequests = await this.prisma.apiRequest.findMany({
      where,
      select: { duration: true },
    });

    const ranges = [
      { min: 0, max: 100, label: '0-100ms' },
      { min: 100, max: 250, label: '100-250ms' },
      { min: 250, max: 500, label: '250-500ms' },
      { min: 500, max: 1000, label: '500ms-1s' },
      { min: 1000, max: 2000, label: '1-2s' },
      { min: 2000, max: 5000, label: '2-5s' },
      { min: 5000, max: Infinity, label: '5s+' },
    ];

    const distribution = ranges.map((range) => ({
      range: range.label,
      count: allRequests.filter(
        (r) => r.duration >= range.min && r.duration < range.max,
      ).length,
    }));

    // Get throughput by minute (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await this.prisma.apiRequest.findMany({
      where: { createdAt: { gte: oneHourAgo } },
      select: { createdAt: true },
    });

    const minuteCounts = new Map<string, number>();
    recentRequests.forEach((r) => {
      const minute = r.createdAt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      minuteCounts.set(minute, (minuteCounts.get(minute) || 0) + 1);
    });

    const throughputByMinute = Array.from(minuteCounts.entries())
      .map(([minute, count]) => ({ minute, count }))
      .sort((a, b) => a.minute.localeCompare(b.minute));

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
    };
  }

  async getSystemHealth(): Promise<{
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpuUsage: { user: number; system: number };
    databaseConnected: boolean;
    lastErrors: number;
    avgResponseTime: number;
    requestsLastHour: number;
    errorsLastHour: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    let databaseConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }

    const [requestsLastHour, errorsLastHour, avgResponse, recentErrors] =
      await Promise.all([
        this.prisma.apiRequest.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.apiRequest.aggregate({
          where: { createdAt: { gte: oneHourAgo } },
          _avg: { duration: true },
        }),
        this.prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo }, resolved: false },
        }),
      ]);

    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      cpuUsage: {
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
      },
      databaseConnected,
      lastErrors: recentErrors,
      avgResponseTime: avgResponse._avg.duration || 0,
      requestsLastHour,
      errorsLastHour,
    };
  }

  // =============================================
  // Error Resolution
  // =============================================

  async resolveError(
    errorId: string,
    resolvedBy: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
    return { success: true };
  }

  async resolveMultipleErrors(
    errorIds: string[],
    resolvedBy: string,
  ): Promise<{ success: boolean; count: number }> {
    const result = await this.prisma.errorLog.updateMany({
      where: { id: { in: errorIds } },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
    return { success: true, count: result.count };
  }

  // =============================================
  // Cleanup & Aggregation
  // =============================================

  async cleanupOldData(daysToKeep: number = 30): Promise<{
    requestsDeleted: number;
    errorsDeleted: number;
    metricsDeleted: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const [requestsResult, errorsResult, metricsResult] = await Promise.all([
      this.prisma.apiRequest.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      this.prisma.errorLog.deleteMany({
        where: { createdAt: { lt: cutoffDate }, resolved: true },
      }),
      this.prisma.systemMetric.deleteMany({
        where: { recordedAt: { lt: cutoffDate } },
      }),
    ]);

    return {
      requestsDeleted: requestsResult.count,
      errorsDeleted: errorsResult.count,
      metricsDeleted: metricsResult.count,
    };
  }

  async aggregateHourlyMetrics(): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    oneHourAgo.setMinutes(0, 0, 0);

    const hourStart = oneHourAgo;
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    // Group requests by path and method for the past hour
    const aggregates = await this.prisma.apiRequest.groupBy({
      by: ['path', 'method'],
      where: {
        createdAt: { gte: hourStart, lt: hourEnd },
      },
      _count: { id: true },
      _avg: { duration: true },
      _min: { duration: true },
      _max: { duration: true },
    });

    for (const agg of aggregates) {
      const successCount = await this.prisma.apiRequest.count({
        where: {
          path: agg.path,
          method: agg.method,
          createdAt: { gte: hourStart, lt: hourEnd },
          statusCode: { lt: 400 },
        },
      });

      await this.prisma.performanceAggregate.upsert({
        where: {
          path_method_period_periodStart: {
            path: agg.path,
            method: agg.method,
            period: 'hourly',
            periodStart: hourStart,
          },
        },
        create: {
          path: agg.path,
          method: agg.method,
          period: 'hourly',
          periodStart: hourStart,
          totalRequests: agg._count.id,
          successCount,
          errorCount: agg._count.id - successCount,
          avgDuration: agg._avg.duration || 0,
          minDuration: agg._min.duration || 0,
          maxDuration: agg._max.duration || 0,
        },
        update: {
          totalRequests: agg._count.id,
          successCount,
          errorCount: agg._count.id - successCount,
          avgDuration: agg._avg.duration || 0,
          minDuration: agg._min.duration || 0,
          maxDuration: agg._max.duration || 0,
        },
      });
    }
  }

  async getAggregatedPerformance(
    period: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      path: string;
      method: string;
      periodStart: Date;
      totalRequests: number;
      successCount: number;
      errorCount: number;
      avgDuration: number;
    }[]
  > {
    return this.prisma.performanceAggregate.findMany({
      where: {
        period,
        periodStart: { gte: startDate, lte: endDate },
      },
      orderBy: { periodStart: 'asc' },
    });
  }
}

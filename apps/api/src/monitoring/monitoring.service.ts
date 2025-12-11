import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ErrorSeverity, MetricType } from '@workspace/db';
import { WebVitalDto } from './dto/web-vital.dto';

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
  
  // Batching buffers
  private requestBuffer: RequestLogData[] = [];
  private errorBuffer: ErrorLogData[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {
    // Start the periodic flush timer
    this.startFlushTimer();
  }

  /**
   * Start periodic flushing of buffered logs
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffers().catch((error) => {
        this.logger.error('Failed to flush monitoring buffers', error);
      });
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush all buffered logs to database
   */
  private async flushBuffers(): Promise<void> {
    const requestsToFlush = this.requestBuffer.splice(0, this.BATCH_SIZE);
    const errorsToFlush = this.errorBuffer.splice(0, this.BATCH_SIZE);

    const promises: Promise<any>[] = [];

    if (requestsToFlush.length > 0) {
      promises.push(
        this.prisma.apiRequest.createMany({
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
        }),
      );
    }

    if (errorsToFlush.length > 0) {
      promises.push(
        this.prisma.errorLog.createMany({
          data: errorsToFlush.map((err) => ({
            clinicId: err.clinicId,
            userId: err.userId,
            type: err.type,
            message: err.message,
            stack: err.stack,
            path: err.path,
            method: err.method,
            statusCode: err.statusCode,
            userAgent: err.userAgent,
            ip: err.ip,
            requestBody: err.requestBody as Prisma.InputJsonValue,
            metadata: err.metadata as Prisma.InputJsonValue,
            severity: err.severity || ErrorSeverity.ERROR,
          })),
          skipDuplicates: true,
        }),
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      this.logger.debug(
        `Flushed ${requestsToFlush.length} requests and ${errorsToFlush.length} errors`,
      );
    }
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining logs synchronously before shutdown
    this.flushBuffers().catch((error) => {
      this.logger.error('Failed to flush logs on shutdown', error);
    });
  }

  // =============================================
  // Request Logging
  // =============================================

  logRequest(data: RequestLogData): void {
    // Add to buffer instead of immediate database write
    this.requestBuffer.push(data);
    
    // If buffer is full, flush immediately
    if (this.requestBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffers().catch((error) => {
        this.logger.error('Failed to flush request buffer', error);
      });
    }
  }

  // =============================================
  // Error Logging
  // =============================================

  logError(data: ErrorLogData): void {
    // Add to buffer instead of immediate database write
    this.errorBuffer.push(data);
    
    // If buffer is full, flush immediately
    if (this.errorBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffers().catch((error) => {
        this.logger.error('Failed to flush error buffer', error);
      });
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

    // Use createMany with a single database call instead of multiple parallel calls
    // This prevents connection pool exhaustion
    try {
      await this.prisma.systemMetric.createMany({
        data: [
          {
            metricType: MetricType.MEMORY_USAGE,
            value: memoryUsage.rss / 1024 / 1024,
            unit: 'MB',
          },
          {
            metricType: MetricType.HEAP_USED,
            value: memoryUsage.heapUsed / 1024 / 1024,
            unit: 'MB',
          },
          {
            metricType: MetricType.HEAP_TOTAL,
            value: memoryUsage.heapTotal / 1024 / 1024,
            unit: 'MB',
          },
          {
            metricType: MetricType.CPU_USAGE,
            value: (cpuUsage.user + cpuUsage.system) / 1000000,
            unit: 'seconds',
          },
          {
            metricType: MetricType.UPTIME,
            value: uptime,
            unit: 'seconds',
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to record system metrics', error);
    }
  }

  /**
   * Record feature usage metrics (Phase 2)
   * Tracks usage of AI features, bulk operations, analytics, etc.
   */
  async recordFeatureUsage(
    featureName: string,
    clinicId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.systemMetric.create({
        data: {
          metricType: MetricType.REQUEST_COUNT,
          value: 1,
          unit: 'count',
          metadata: {
            featureName,
            metricCategory: 'feature_usage',
            clinicId,
            userId,
            timestamp: new Date().toISOString(),
            ...metadata,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record feature usage for ${featureName}: ${error.message}`,
      );
    }
  }

  /**
   * Record cache hit/miss metrics (Phase 2)
   * Tracks cache performance for analytics and API responses
   */
  async recordCacheMetric(
    isHit: boolean,
    key: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.systemMetric.create({
        data: {
          metricType: MetricType.REQUEST_COUNT,
          value: 1,
          unit: 'count',
          metadata: {
            metricCategory: isHit ? 'cache_hit' : 'cache_miss',
            key,
            timestamp: new Date().toISOString(),
            ...metadata,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record cache metric: ${error.message}`);
    }
  }

  /**
   * Record database query performance (Phase 2)
   * Tracks slow queries and query patterns
   */
  async recordDatabaseMetric(
    operationType: string,
    duration: number,
    isError: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.systemMetric.create({
        data: {
          metricType: MetricType.DB_QUERY_TIME,
          value: duration,
          unit: 'ms',
          metadata: {
            operationType,
            duration,
            isError,
            timestamp: new Date().toISOString(),
            ...metadata,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record database metric: ${error.message}`);
    }
  }

  /**
   * Get system metrics for given time period (Phase 2)
   * Retrieves all recorded metrics for analysis
   */
  async getSystemMetrics(
    startDate: Date,
    endDate: Date,
    metricType?: MetricType,
  ): Promise<any[]> {
    try {
      const where: any = {
        recordedAt: { gte: startDate, lte: endDate },
      };

      if (metricType) {
        where.metricType = metricType;
      }

      const metrics = await this.prisma.systemMetric.findMany({
        where,
        orderBy: { recordedAt: 'asc' },
        take: 1000,
      });

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to retrieve system metrics: ${error.message}`);
      return [];
    }
  }

  /**
   * Get performance summary (Phase 2)
   * Aggregates metrics into summary statistics
   */
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

  /**
   * Record Web Vital metric from frontend
   * ✅ OPTIMIZATION: Store Core Web Vitals for real user monitoring (RUM)
   * 
   * Web Vitals thresholds:
   * - LCP (Largest Contentful Paint): < 2.5s good, > 4s poor
   * - INP (Interaction to Next Paint): < 200ms good, > 500ms poor
   * - CLS (Cumulative Layout Shift): < 0.1 good, > 0.25 poor
   * - FCP (First Contentful Paint): < 1.8s good, > 3s poor
   * - TTFB (Time to First Byte): < 800ms good, > 1800ms poor
   */
  async recordWebVital(vital: WebVitalDto) {
    const rating = this.getRating(vital.name, vital.value);
    
    // Store vital in database using SystemMetric table
    await this.prisma.systemMetric.create({
      data: {
        metricType: MetricType.AVG_RESPONSE_TIME, // Repurpose for web vitals
        value: vital.value,
        unit: vital.name, // Store metric name in unit field
        metadata: {
          rating,
          page: vital.page,
          userId: vital.userId,
          sessionId: vital.sessionId,
          metricName: vital.name,
        },
      },
    });

    return { success: true, rating };
  }

  /**
   * Get Web Vitals statistics
   */
  async getWebVitals(startDate?: Date, endDate?: Date, page?: string) {
    const where = {
      metricType: MetricType.AVG_RESPONSE_TIME,
      recordedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Get all web vitals
    const vitals = await this.prisma.systemMetric.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });

    // Filter by page if specified and group by metric name
    const filtered = vitals.filter(
      (v) =>
        !page ||
        (v.metadata &&
          typeof v.metadata === 'object' &&
          'page' in v.metadata &&
          v.metadata.page === page),
    );

    // Group by metric name (stored in unit field)
    const grouped = filtered.reduce(
      (acc, vital) => {
        const name = vital.unit || 'unknown';
        if (!acc[name]) acc[name] = [];
        acc[name].push(vital.value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    // Calculate statistics for each metric
    return Object.entries(grouped).map(([name, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;
      const avg = sorted.reduce((a, b) => a + b, 0) / count;
      const p75Index = Math.floor(count * 0.75);
      const p95Index = Math.floor(count * 0.95);

      return {
        name,
        count,
        avg,
        min: sorted[0] || 0,
        max: sorted[count - 1] || 0,
        p75: sorted[p75Index] || 0,
        p95: sorted[p95Index] || 0,
        rating: this.getRating(name, avg),
      };
    });
  }

  /**
   * Get rating for Web Vital based on thresholds
   */
  private getRating(
    name: string,
    value: number,
  ): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      INP: { good: 200, poor: 500 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  }
}

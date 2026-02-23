import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, MetricType } from '@workspace/db';
import { WebVitalDto } from '../dto/monitoring.dto';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

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
        `Failed to record feature usage for ${featureName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

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
      this.logger.error(
        `Failed to record cache metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

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
      this.logger.error(
        `Failed to record database metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getSystemMetrics(
    startDate: Date,
    endDate: Date,
    metricType?: MetricType,
  ): Promise<any[]> {
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
        take: 1000,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
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

    const slowestEndpoints = await this.prisma.apiRequest.groupBy({
      by: ['path', 'method'],
      where,
      _avg: { duration: true },
      _max: { duration: true },
      _count: { id: true },
      orderBy: { _avg: { duration: 'desc' } },
      take: 15,
    });

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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await this.prisma.apiRequest.findMany({
      where: { createdAt: { gte: oneHourAgo } },
      select: { createdAt: true },
    });

    const minuteCounts = new Map<string, number>();
    recentRequests.forEach((r) => {
      const minute = r.createdAt.toISOString().slice(0, 16);
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

  async aggregateHourlyMetrics(): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    oneHourAgo.setMinutes(0, 0, 0);

    const hourStart = oneHourAgo;
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

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
  ): Promise<any[]> {
    return this.prisma.performanceAggregate.findMany({
      where: {
        period,
        periodStart: { gte: startDate, lte: endDate },
      },
      orderBy: { periodStart: 'asc' },
    });
  }

  async recordWebVital(vital: WebVitalDto) {
    const rating = this.getRating(vital.name, vital.value);

    await this.prisma.systemMetric.create({
      data: {
        metricType: MetricType.AVG_RESPONSE_TIME,
        value: vital.value,
        unit: vital.name,
        metadata: {
          rating,
          page: vital.page,
          userId: vital.userId,
          sessionId: vital.sessionId,
          metricName: vital.name,
        } as Prisma.InputJsonValue,
      },
    });

    return { success: true, rating };
  }

  async getWebVitals(startDate?: Date, endDate?: Date, page?: string) {
    const where: Prisma.SystemMetricWhereInput = {
      metricType: MetricType.AVG_RESPONSE_TIME,
    };

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      where.recordedAt = dateFilter;
    }

    const vitals = await this.prisma.systemMetric.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });

    const filtered = vitals.filter(
      (v) =>
        !page ||
        (v.metadata &&
          typeof v.metadata === 'object' &&
          'page' in v.metadata &&
          (v.metadata as any).page === page),
    );

    const grouped = filtered.reduce(
      (acc, vital) => {
        const name = vital.unit || 'unknown';
        if (!acc[name]) acc[name] = [];
        acc[name].push(vital.value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

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

  async cleanupOldMetrics(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemMetric.deleteMany({
      where: { recordedAt: { lt: cutoffDate } },
    });

    return result.count;
  }
}

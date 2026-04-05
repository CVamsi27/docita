import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, MetricType } from '@workspace/db';
import { WebVitalDto } from '@/shared/modules/monitoring/monitoring/dto/monitoring.dto';

function getMetadataPage(
  metadata: Prisma.JsonValue | null,
): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const page = Reflect.get(metadata, 'page');
  return typeof page === 'string' ? page : undefined;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private persistenceDisabled = false;

  constructor(private prisma: PrismaService) {}

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

  private handlePersistenceError(error: unknown, context: string): void {
    if (this.isDatabaseAuthError(error)) {
      this.persistenceDisabled = true;
      this.logger.warn(
        'Disabling metrics database persistence due to database authentication failure. Verify DATABASE_URL credentials.',
      );
      return;
    }

    this.logger.error(context, error);
  }

  async recordMetric(
    metricType: MetricType,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

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
      this.handlePersistenceError(error, 'Failed to record metric');
    }
  }

  async recordSystemMetrics(): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

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
      this.handlePersistenceError(error, 'Failed to record system metrics');
    }
  }

  async recordFeatureUsage(
    featureName: string,
    clinicId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

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
      this.handlePersistenceError(
        error,
        `Failed to record feature usage for ${featureName}`,
      );
    }
  }

  async recordCacheMetric(
    isHit: boolean,
    key: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

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
      this.handlePersistenceError(error, 'Failed to record cache metric');
    }
  }

  async recordDatabaseMetric(
    operationType: string,
    duration: number,
    isError: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

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
      this.handlePersistenceError(error, 'Failed to record database metric');
    }
  }

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

    const whereSqlClauses: Prisma.Sql[] = [];
    if (startDate) {
      whereSqlClauses.push(Prisma.sql`"createdAt" >= ${startDate}`);
    }
    if (endDate) {
      whereSqlClauses.push(Prisma.sql`"createdAt" <= ${endDate}`);
    }

    const sqlWhere =
      whereSqlClauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereSqlClauses, ' AND ')}`
        : Prisma.empty;

    const [slowestEndpoints, distributionRows] = await Promise.all([
      this.prisma.apiRequest.groupBy({
        by: ['path', 'method'],
        where,
        _avg: { duration: true },
        _max: { duration: true },
        _count: { id: true },
        orderBy: { _avg: { duration: 'desc' } },
        take: 15,
      }),
      this.prisma.$queryRaw<
        Array<{
          range_0_100: bigint;
          range_100_250: bigint;
          range_250_500: bigint;
          range_500_1000: bigint;
          range_1000_2000: bigint;
          range_2000_5000: bigint;
          range_5000_plus: bigint;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE duration >= 0 AND duration < 100)::bigint AS "range_0_100",
          COUNT(*) FILTER (WHERE duration >= 100 AND duration < 250)::bigint AS "range_100_250",
          COUNT(*) FILTER (WHERE duration >= 250 AND duration < 500)::bigint AS "range_250_500",
          COUNT(*) FILTER (WHERE duration >= 500 AND duration < 1000)::bigint AS "range_500_1000",
          COUNT(*) FILTER (WHERE duration >= 1000 AND duration < 2000)::bigint AS "range_1000_2000",
          COUNT(*) FILTER (WHERE duration >= 2000 AND duration < 5000)::bigint AS "range_2000_5000",
          COUNT(*) FILTER (WHERE duration >= 5000)::bigint AS "range_5000_plus"
        FROM "ApiRequest"
        ${sqlWhere}
      `),
    ]);

    const distributionRow = distributionRows[0] ?? {
      range_0_100: 0n,
      range_100_250: 0n,
      range_250_500: 0n,
      range_500_1000: 0n,
      range_1000_2000: 0n,
      range_2000_5000: 0n,
      range_5000_plus: 0n,
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

    const throughputStart = startDate ?? new Date(Date.now() - 60 * 60 * 1000);
    const throughputEnd = endDate ?? new Date();
    const throughputRows = await this.prisma.$queryRaw<
      Array<{ minute: string; count: bigint }>
    >(Prisma.sql`
      SELECT
        to_char(date_trunc('minute', "createdAt"), 'YYYY-MM-DD"T"HH24:MI') AS "minute",
        COUNT(*)::bigint AS "count"
      FROM "ApiRequest"
      WHERE "createdAt" >= ${throughputStart}
        AND "createdAt" <= ${throughputEnd}
      GROUP BY date_trunc('minute', "createdAt")
      ORDER BY date_trunc('minute', "createdAt") ASC
    `);

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
    };
  }

  async aggregateHourlyMetrics(): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    oneHourAgo.setMinutes(0, 0, 0);

    const hourStart = oneHourAgo;
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    const [aggregates, successAggregates] = await Promise.all([
      this.prisma.apiRequest.groupBy({
        by: ['path', 'method'],
        where: {
          createdAt: { gte: hourStart, lt: hourEnd },
        },
        _count: { id: true },
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
      this.prisma.apiRequest.groupBy({
        by: ['path', 'method'],
        where: {
          createdAt: { gte: hourStart, lt: hourEnd },
          statusCode: { lt: 400 },
        },
        _count: { id: true },
      }),
    ]);

    const successCountByRoute = new Map(
      successAggregates.map((row) => [
        `${row.path}::${row.method}`,
        row._count.id,
      ]),
    );

    await Promise.all(
      aggregates.map((agg) => {
        const successCount =
          successCountByRoute.get(`${agg.path}::${agg.method}`) ?? 0;

        return this.prisma.performanceAggregate.upsert({
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
      }),
    );
  }

  async getAggregatedPerformance(
    period: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<unknown[]> {
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
      (v) => !page || getMetadataPage(v.metadata) === page,
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

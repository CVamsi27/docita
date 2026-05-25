import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Prisma } from '@workspace/db';
import { getLastNDaysRange, DEFAULT_TIMEZONE } from '@workspace/utils';
import {
  RevenueMetric,
  RevenueTrendPoint,
  CptRevenueMetric,
} from '@workspace/types';
import {
  AnalyticsPeriod,
  TimeSeriesGroupBy,
} from '@/domains/analytics/factories/period-bucket.util';

@Injectable()
export class FinancialAnalyticsFactory {
  private readonly logger = new Logger(FinancialAnalyticsFactory.name);

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private analyticsPeriodSql(
    timestampSql: Prisma.Sql,
    period: AnalyticsPeriod,
    timezone: string,
  ): Prisma.Sql {
    if (period === 'daily') {
      return Prisma.sql`TO_CHAR(${timestampSql} AT TIME ZONE ${timezone}, 'YYYY-MM-DD')`;
    }

    if (period === 'weekly') {
      return Prisma.sql`CONCAT(
        EXTRACT(YEAR FROM (${timestampSql} AT TIME ZONE ${timezone})
          - EXTRACT(DOW FROM (${timestampSql} AT TIME ZONE ${timezone}))::int * INTERVAL '1 day')::int,
        '-W',
        CEIL(EXTRACT(DAY FROM (${timestampSql} AT TIME ZONE ${timezone}))::numeric / 7)::int
      )`;
    }

    return Prisma.sql`TO_CHAR(${timestampSql} AT TIME ZONE ${timezone}, 'YYYY-MM')`;
  }

  private timeSeriesPeriodSql(
    timestampSql: Prisma.Sql,
    groupBy: TimeSeriesGroupBy,
  ): Prisma.Sql {
    if (groupBy === 'day') {
      return Prisma.sql`TO_CHAR(${timestampSql}, 'YYYY-MM-DD')`;
    }

    if (groupBy === 'week') {
      return Prisma.sql`TO_CHAR(
        DATE_TRUNC('day', ${timestampSql})
          - EXTRACT(DOW FROM ${timestampSql})::int * INTERVAL '1 day',
        'YYYY-MM-DD'
      )`;
    }

    return Prisma.sql`TO_CHAR(${timestampSql}, 'YYYY-MM')`;
  }

  async getRevenueTrends(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    const cacheKey = `analytics:revenue-trends:${clinicId}:${period}:${days}:${timezone}`;
    const cached = await this.cacheManager.get<RevenueTrendPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const dateRange = getLastNDaysRange(days, { timezone });
    const readClient = this.getReadClient();

    const periodSql = this.analyticsPeriodSql(
      Prisma.sql`i."createdAt"`,
      period,
      timezone,
    );
    const data = await readClient.$queryRaw<RevenueTrendPoint[]>`
      SELECT
        ${periodSql} AS date,
        COALESCE(SUM(i.total), 0)::float AS revenue
      FROM "Invoice" i
      WHERE i."clinicId" = ${clinicId}
        AND i."createdAt" >= ${dateRange.start}
      GROUP BY date
      ORDER BY date ASC
    `;

    await this.cacheManager.set(cacheKey, data, 3600 * 1000);

    return data;
  }

  async getRevenueByCptCode(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const cacheKey = `revenue-by-cpt-${clinicId}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cachedResult =
      await this.cacheManager.get<CptRevenueMetric[]>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const where: Prisma.ProcedureWhereInput = {
      appointment: { clinicId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const readClient = this.getReadClient();

    const procedures = await readClient.procedure.groupBy({
      by: ['cptCodeId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    const cptCodeIds = procedures
      .map((p) => p.cptCodeId)
      .filter((id): id is string => typeof id === 'string');

    const cptCodes = await readClient.cptCode.findMany({
      where: { id: { in: cptCodeIds } },
    });

    const cptCodeMap = new Map(cptCodes.map((code) => [code.id, code]));

    const result: CptRevenueMetric[] = procedures
      .map((p) => {
        const cptCodeId = typeof p.cptCodeId === 'string' ? p.cptCodeId : '';
        const cptCode = cptCodeMap.get(cptCodeId);
        const count = p._count.id;
        const totalRevenue = cptCode ? Number(cptCode.price) * count : 0;

        return {
          cptCode: cptCode
            ? {
                code: cptCode.code,
                description: cptCode.description,
                price: Number(cptCode.price),
                category: cptCode.category,
              }
            : undefined,
          procedureCount: count,
          totalRevenue,
          avgPrice: cptCode?.price ? Number(cptCode.price) : 0,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    await this.cacheManager.set(cacheKey, result, 86400000);
    return result;
  }

  async getRevenueByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const revenueData = await this.getRevenueByCptCode(
      clinicId,
      startDate,
      endDate,
    );

    const byCategory = revenueData.reduce<
      Record<string, { count: number; revenue: number }>
    >((acc, item) => {
      if (item.cptCode) {
        const category = item.cptCode.category;
        if (!acc[category]) {
          acc[category] = { count: 0, revenue: 0 };
        }
        acc[category].count += item.procedureCount;
        acc[category].revenue += item.totalRevenue;
      }
      return acc;
    }, {});

    return Object.entries(byCategory)
      .map(
        ([category, data]: [string, { count: number; revenue: number }]) => ({
          category,
          ...data,
        }),
      )
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getRevenueTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    const readClient = this.getReadClient();
    const periodSql = this.timeSeriesPeriodSql(
      Prisma.sql`pr."createdAt"`,
      groupBy,
    );

    return readClient.$queryRaw<Array<{ period: string; revenue: number }>>`
      SELECT
        ${periodSql} AS period,
        COALESCE(SUM(c.price), 0)::float AS revenue
      FROM "Procedure" pr
      JOIN "Appointment" a ON a.id = pr."appointmentId"
      JOIN "CptCode" c ON c.id = pr."cptCodeId"
      WHERE a."clinicId" = ${clinicId}
        AND pr."createdAt" >= ${startDate}
        AND pr."createdAt" <= ${endDate}
      GROUP BY period
      ORDER BY period ASC
    `;
  }

  async getRevenueMetrics(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    const cacheKey = `revenue-metrics-${clinicId}-${period}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cached = await this.cacheManager.get<RevenueMetric[]>(cacheKey);
    if (cached) return cached;

    const readClient = this.getReadClient();

    const dateFilter =
      startDate && endDate
        ? Prisma.sql`AND i."createdAt" >= ${startDate} AND i."createdAt" <= ${endDate}`
        : startDate
          ? Prisma.sql`AND i."createdAt" >= ${startDate}`
          : endDate
            ? Prisma.sql`AND i."createdAt" <= ${endDate}`
            : Prisma.sql``;
    const periodSql = this.analyticsPeriodSql(
      Prisma.sql`i."createdAt"`,
      period,
      DEFAULT_TIMEZONE,
    );

    const result = await readClient.$queryRaw<RevenueMetric[]>`
      SELECT
        ${periodSql} AS date,
        COALESCE(SUM(i.total), 0)::float AS "totalRevenue",
        COUNT(i.id)::int AS "invoiceCount",
        COALESCE(AVG(i.total), 0)::float AS "avgInvoiceAmount"
      FROM "Invoice" i
      WHERE i."clinicId" = ${clinicId}
        ${dateFilter}
      GROUP BY date
      ORDER BY date ASC
    `;

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.getAnalyticsCacheTtl() * 1000,
    );
    return result;
  }
}

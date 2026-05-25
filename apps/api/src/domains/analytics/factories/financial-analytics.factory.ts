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
  toAnalyticsPeriodKey,
  toTimeSeriesBucketKey,
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

    const invoices = await readClient.invoice.findMany({
      where: {
        patient: { clinicId },
        createdAt: { gte: dateRange.start },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const revenueByPeriod = new Map<string, number>();

    invoices.forEach((invoice) => {
      const periodKey = toAnalyticsPeriodKey(invoice.createdAt, period);
      const current = revenueByPeriod.get(periodKey) || 0;
      revenueByPeriod.set(periodKey, current + (invoice.total || 0));
    });

    const data = Array.from(revenueByPeriod.entries())
      .map(([date, revenue]) => ({
        date,
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

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
    const procedures = await readClient.procedure.findMany({
      where: {
        appointment: { clinicId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        cptCode: {
          select: {
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const timeSeriesData = new Map<string, number>();

    procedures.forEach((procedure) => {
      if (!procedure.cptCode) return;

      const periodKey = toTimeSeriesBucketKey(procedure.createdAt, groupBy);

      const revenue = Number(procedure.cptCode.price);
      timeSeriesData.set(
        periodKey,
        (timeSeriesData.get(periodKey) || 0) + revenue,
      );
    });

    return Array.from(timeSeriesData.entries())
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));
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

    const where: Prisma.InvoiceWhereInput = { patient: { clinicId } };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const readClient = this.getReadClient();

    const invoices = await readClient.invoice.findMany({
      where,
      select: { total: true, createdAt: true },
    });

    const grouped: Record<string, RevenueMetric> = {};
    invoices.forEach((inv) => {
      const key = toAnalyticsPeriodKey(inv.createdAt, period);
      if (!grouped[key]) {
        grouped[key] = {
          totalRevenue: 0,
          invoiceCount: 0,
          avgInvoiceAmount: 0,
          date: key,
        };
      }
      grouped[key].totalRevenue += inv.total || 0;
      grouped[key].invoiceCount += 1;
    });

    const result = Object.values(grouped).map((g) => ({
      ...g,
      avgInvoiceAmount:
        g.invoiceCount > 0 ? g.totalRevenue / g.invoiceCount : 0,
    }));

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.getAnalyticsCacheTtl() * 1000,
    );
    return result;
  }
}

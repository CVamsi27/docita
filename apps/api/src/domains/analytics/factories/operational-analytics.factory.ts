import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Prisma } from '@workspace/db';
import {
  getMonthRange,
  getLastNDaysRange,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import {
  AppointmentSnapshot,
  DemographicsSnapshot,
  OverviewMetrics,
  PatientGrowthPoint,
} from '@workspace/types';
import {
  ANALYTICS_REPOSITORY_TOKEN,
  IAnalyticsRepository,
} from '@/domains/analytics/core/repositories/analytics.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Orchestrates analytics queries: caching, DTO shaping, and growth-rate math.
 * Prisma access lives in {@link IAnalyticsRepository}. Class name is kept for
 * backward DI compatibility — its concern is operational dashboards.
 */
@Injectable()
export class OperationalAnalyticsFactory {
  private readonly logger = new Logger(OperationalAnalyticsFactory.name);

  constructor(
    @Inject(ANALYTICS_REPOSITORY_TOKEN)
    private readonly repository: IAnalyticsRepository,
    private readonly configService: AppConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getOverview(clinicId: string, timezone: string = DEFAULT_TIMEZONE) {
    const cacheKey = `dashboard-overview-${clinicId}-${timezone}`;
    const cachedResult = await this.cacheManager.get<OverviewMetrics>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const now = this.clock.now();
    const thisMonthRange = getMonthRange(now, { timezone });
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthRange = getMonthRange(lastMonthDate, { timezone });

    const aggregates = await this.repository.getOverviewAggregates(
      clinicId,
      thisMonthRange,
      lastMonthRange,
    );

    const patientGrowth =
      aggregates.newPatientsLastMonth > 0
        ? ((aggregates.newPatientsThisMonth - aggregates.newPatientsLastMonth) /
            aggregates.newPatientsLastMonth) *
          100
        : 0;

    const revenueGrowth =
      aggregates.revenueLastMonth > 0
        ? ((aggregates.revenueThisMonth - aggregates.revenueLastMonth) /
            aggregates.revenueLastMonth) *
          100
        : 0;

    const result = {
      totalPatients: aggregates.totalPatients,
      newPatientsThisMonth: aggregates.newPatientsThisMonth,
      patientGrowth: Math.round(patientGrowth * 10) / 10,
      totalAppointments: aggregates.totalAppointments,
      appointmentsThisMonth: aggregates.appointmentsThisMonth,
      revenueThisMonth: aggregates.revenueThisMonth,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    };

    await this.cacheManager.set(cacheKey, result, 3600000);
    return result;
  }

  async getPatientGrowth(
    clinicId: string,
    days: number = 30,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    const cacheKey = `analytics:patient-growth:${clinicId}:${days}:${timezone}`;
    const cached = await this.cacheManager.get<PatientGrowthPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const dateRange = getLastNDaysRange(days, { timezone });
    const timestamps = await this.repository.getPatientCreationTimestamps(
      clinicId,
      dateRange.start,
    );

    const patientsByDate = new Map<string, number>();
    for (const createdAt of timestamps) {
      const dateKey = toISODateString(createdAt, { timezone });
      patientsByDate.set(dateKey, (patientsByDate.get(dateKey) ?? 0) + 1);
    }

    let cumulative = 0;
    const data = patientsByDate.map(({ date, count }) => {
      cumulative += count;
      return { date, count: cumulative };
    });

    await this.cacheManager.set(cacheKey, data, 3600 * 1000);
    return data;
  }

  async getAppointmentStats(
    clinicId: string,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    const monthRange = getMonthRange(this.clock.now(), { timezone });
    const breakdown = await this.repository.getAppointmentStatusBreakdown(
      clinicId,
      monthRange.start,
    );

    const byStatus = breakdown.statusCounts.reduce<Record<string, number>>(
      (acc, { status, count }) => {
        acc[status] = count;
        return acc;
      },
      {},
    );
    const byType = breakdown.typeCounts.reduce<Record<string, number>>(
      (acc, { type, count }) => {
        acc[type] = count;
        return acc;
      },
      {},
    );

    return {
      total: breakdown.total,
      byStatus,
      byType,
    };
  }

  async getAppointmentMetrics(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    const cacheKey = `appointment-metrics-${clinicId}-${period}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cached = await this.cacheManager.get<AppointmentSnapshot>(cacheKey);
    if (cached) return cached;

    const where: Prisma.AppointmentWhereInput = { clinicId };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const aggregates =
      await this.repository.getAppointmentMetricsAggregates(where);
    const result: AppointmentSnapshot = {
      total: aggregates.total,
      booked: aggregates.booked,
      completed: aggregates.completed,
      cancelled: aggregates.cancelled,
      noShow: aggregates.noShow,
      fillRate:
        aggregates.total > 0 ? (aggregates.booked / aggregates.total) * 100 : 0,
      completionRate:
        aggregates.total > 0
          ? (aggregates.completed / aggregates.total) * 100
          : 0,
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.getAnalyticsCacheTtl() * 1000,
    );
    return result;
  }

  async getPatientDemographics(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const cacheKey = `patient-demographics-${clinicId}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cached = await this.cacheManager.get<DemographicsSnapshot>(cacheKey);
    if (cached) return cached;

    const where: Prisma.PatientWhereInput = { clinicId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const now = this.clock.now();
    const cutoffs = {
      age18: new Date(now.getFullYear() - 18, now.getMonth(), now.getDate()),
      age35: new Date(now.getFullYear() - 35, now.getMonth(), now.getDate()),
      age50: new Date(now.getFullYear() - 50, now.getMonth(), now.getDate()),
      age65: new Date(now.getFullYear() - 65, now.getMonth(), now.getDate()),
    };

    const aggregates = await this.repository.getPatientDemographicsAggregates(
      where,
      cutoffs,
    );

    const genderDistribution = { MALE: 0, FEMALE: 0, OTHER: 0 };
    for (const row of aggregates.genders) {
      if (row.gender && row.gender in genderDistribution) {
        genderDistribution[row.gender] = row.count;
      }
    }

    const result = {
      totalPatients: aggregates.totalPatients,
      newPatients: aggregates.totalPatients,
      ageDistribution: {
        '0-18': aggregates.age0to18,
        '18-35': aggregates.age18to35,
        '35-50': aggregates.age35to50,
        '50-65': aggregates.age50to65,
        '65+': aggregates.age65plus,
      },
      genderDistribution,
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.getAnalyticsCacheTtl() * 1000,
    );
    return result;
  }

  async getUncodedVisitsStats(clinicId: string) {
    const now = this.clock.now();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { totalUncoded, uncodedOlderThan7Days } =
      await this.repository.getUncodedVisitsAggregates(clinicId, sevenDaysAgo);

    return {
      totalUncoded,
      uncodedOlderThan7Days,
      recentUncoded: totalUncoded - uncodedOlderThan7Days,
    };
  }
}

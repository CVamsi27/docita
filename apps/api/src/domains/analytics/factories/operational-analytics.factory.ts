import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Prisma, AppointmentStatus } from '@workspace/db';
import {
  getMonthRange,
  getLastNDaysRange,
  toISODateString,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import {
  PATIENT_ANALYTICS_SELECT,
  APPOINTMENT_ANALYTICS_SELECT,
} from '@/common/select-fragments';
import {
  OverviewMetrics,
  PatientGrowthPoint,
  AppointmentSnapshot,
  DemographicsSnapshot,
} from '@workspace/types';

@Injectable()
export class OperationalAnalyticsFactory {
  private readonly logger = new Logger(OperationalAnalyticsFactory.name);

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async getOverview(clinicId: string, timezone: string = DEFAULT_TIMEZONE) {
    const cacheKey = `dashboard-overview-${clinicId}-${timezone}`;
    const cachedResult = await this.cacheManager.get<OverviewMetrics>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const thisMonthRange = getMonthRange(new Date(), { timezone });
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthRange = getMonthRange(lastMonthDate, { timezone });

    const readClient = this.getReadClient();

    const [
      totalPatients,
      newPatientsThisMonth,
      newPatientsLastMonth,
      totalAppointments,
      appointmentsThisMonth,
      invoicesThisMonth,
      invoicesLastMonth,
    ] = await Promise.all([
      readClient.patient.count({ where: { clinicId } }),
      readClient.patient.count({
        where: { clinicId, createdAt: { gte: thisMonthRange.start } },
      }),
      readClient.patient.count({
        where: {
          clinicId,
          createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
        },
      }),
      readClient.appointment.count({ where: { clinicId } }),
      readClient.appointment.count({
        where: { clinicId, createdAt: { gte: thisMonthRange.start } },
      }),
      readClient.invoice.aggregate({
        where: {
          patient: { clinicId },
          createdAt: { gte: thisMonthRange.start },
        },
        _sum: { total: true },
      }),
      readClient.invoice.aggregate({
        where: {
          patient: { clinicId },
          createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
        },
        _sum: { total: true },
      }),
    ]);

    const revenueThisMonth = invoicesThisMonth._sum?.total || 0;
    const revenueLastMonth = invoicesLastMonth._sum?.total || 0;

    const patientGrowth =
      newPatientsLastMonth > 0
        ? ((newPatientsThisMonth - newPatientsLastMonth) /
            newPatientsLastMonth) *
          100
        : 0;

    const revenueGrowth =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

    const result = {
      totalPatients,
      newPatientsThisMonth,
      patientGrowth: Math.round(patientGrowth * 10) / 10,
      totalAppointments,
      appointmentsThisMonth,
      revenueThisMonth,
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
    const readClient = this.getReadClient();

    const patients = await readClient.patient.findMany({
      where: {
        clinicId,
        createdAt: { gte: dateRange.start },
      },
      select: PATIENT_ANALYTICS_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const patientsByDate = new Map<string, number>();

    patients.forEach((patient) => {
      const dateKey = toISODateString(patient.createdAt, { timezone });
      const current = patientsByDate.get(dateKey) || 0;
      patientsByDate.set(dateKey, current + 1);
    });

    let cumulative = 0;
    const data = Array.from(patientsByDate.entries()).map(([date, count]) => {
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
    const monthRange = getMonthRange(new Date(), { timezone });
    const readClient = this.getReadClient();

    const appointments = await readClient.appointment.findMany({
      where: { clinicId, createdAt: { gte: monthRange.start } },
      select: APPOINTMENT_ANALYTICS_SELECT,
    });

    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byType = appointments.reduce(
      (acc, apt) => {
        acc[apt.type] = (acc[apt.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: appointments.length,
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

    const readClient = this.getReadClient();

    const [total, booked, completed, cancelled, noShow] = await Promise.all([
      readClient.appointment.count({ where }),
      readClient.appointment.count({
        where: { ...where, status: AppointmentStatus.CONFIRMED },
      }),
      readClient.appointment.count({
        where: { ...where, status: AppointmentStatus.COMPLETED },
      }),
      readClient.appointment.count({
        where: { ...where, status: AppointmentStatus.CANCELLED },
      }),
      readClient.appointment.count({
        where: { ...where, status: AppointmentStatus.NO_SHOW },
      }),
    ]);

    const result: AppointmentSnapshot = {
      total,
      booked,
      completed,
      cancelled,
      noShow,
      fillRate: total > 0 ? (booked / total) * 100 : 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
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

    const readClient = this.getReadClient();

    const patients = await readClient.patient.findMany({
      where,
      select: { dateOfBirth: true, gender: true },
    });

    const now = new Date();
    const ageDistribution = {
      '0-18': 0,
      '18-35': 0,
      '35-50': 0,
      '50-65': 0,
      '65+': 0,
    };

    patients.forEach((p) => {
      if (!p.dateOfBirth) return;
      const age = now.getFullYear() - p.dateOfBirth.getFullYear();
      if (age < 18) ageDistribution['0-18']++;
      else if (age < 35) ageDistribution['18-35']++;
      else if (age < 50) ageDistribution['35-50']++;
      else if (age < 65) ageDistribution['50-65']++;
      else ageDistribution['65+']++;
    });

    const genderDistribution = {
      MALE: patients.filter((p) => p.gender === 'MALE').length,
      FEMALE: patients.filter((p) => p.gender === 'FEMALE').length,
      OTHER: patients.filter((p) => p.gender === 'OTHER').length,
    };

    const result = {
      totalPatients: patients.length,
      newPatients: patients.length,
      ageDistribution,
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
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const uncodedVisits = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: AppointmentStatus.COMPLETED,
        diagnoses: {
          none: {},
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const oldUncoded = uncodedVisits.filter(
      (v) => v.createdAt < sevenDaysAgo,
    ).length;

    return {
      totalUncoded: uncodedVisits.length,
      uncodedOlderThan7Days: oldUncoded,
      recentUncoded: uncodedVisits.length - oldUncoded,
    };
  }
}

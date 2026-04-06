import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Prisma, AppointmentStatus } from '@workspace/db';
import { DiseaseTrendPoint, TopCondition } from '@workspace/types';

@Injectable()
export class ClinicalAnalyticsFactory {
  private readonly logger = new Logger(ClinicalAnalyticsFactory.name);

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async getTopDiagnoses(clinicId: string, limit: number = 10) {
    const readClient = this.getReadClient();

    const appointments = await readClient.appointment.findMany({
      where: {
        clinicId,
        observations: { not: null },
      },
      select: {
        observations: true,
      },
      take: 1000,
    });

    const diagnosisCount = new Map<string, number>();

    appointments.forEach((apt) => {
      if (apt.observations) {
        const words = apt.observations.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 4) {
            const current = diagnosisCount.get(word) || 0;
            diagnosisCount.set(word, current + 1);
          }
        });
      }
    });

    const sorted = Array.from(diagnosisCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([diagnosis, count]) => ({ diagnosis, count }));

    return sorted;
  }

  async getDiseaseTrends(clinicId: string, startDate?: Date, endDate?: Date) {
    const cacheKey = `disease-trends-${clinicId}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cachedResult =
      await this.cacheManager.get<DiseaseTrendPoint[]>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const where: Prisma.DiagnosisWhereInput = {
      appointment: { clinicId },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const readClient = this.getReadClient();

    const diagnoses = await readClient.diagnosis.groupBy({
      by: ['icdCodeId'],
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

    const icdCodeIds = diagnoses
      .map((d) => d.icdCodeId)
      .filter((id): id is string => typeof id === 'string');

    const icdCodes = await readClient.icdCode.findMany({
      where: { id: { in: icdCodeIds } },
    });

    const icdCodeMap = new Map(icdCodes.map((code) => [code.id, code]));

    const result: DiseaseTrendPoint[] = diagnoses.map((d) => {
      const icdCodeId = typeof d.icdCodeId === 'string' ? d.icdCodeId : '';
      const core = icdCodeMap.get(icdCodeId);
      return {
        icdCode: core
          ? {
              code: core.code,
              description: core.description,
              category: core.category,
            }
          : undefined,
        count: d._count.id,
      };
    });

    await this.cacheManager.set(cacheKey, result, 86400000);
    return result;
  }

  async getDiseaseTrendsByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const trends = await this.getDiseaseTrends(clinicId, startDate, endDate);

    const byCategory = trends.reduce(
      (acc, item) => {
        if (item.icdCode) {
          const category = item.icdCode.category;
          acc[category] = (acc[category] || 0) + item.count;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(byCategory)
      .map(([category, count]: [string, number]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getDiseaseTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    const readClient = this.getReadClient();

    // Build a period expression that matches toTimeSeriesBucketKey output:
    //   day   -> 'YYYY-MM-DD'
    //   week  -> 'YYYY-MM-DD' of the Sunday that starts the week
    //   month -> 'YYYY-MM'
    const periodSql =
      groupBy === 'day'
        ? Prisma.sql`TO_CHAR(DATE_TRUNC('day', d."createdAt"), 'YYYY-MM-DD')`
        : groupBy === 'week'
          ? Prisma.sql`TO_CHAR(
              DATE_TRUNC('day', d."createdAt")
                - EXTRACT(DOW FROM d."createdAt")::int * INTERVAL '1 day',
              'YYYY-MM-DD'
            )`
          : Prisma.sql`TO_CHAR(DATE_TRUNC('month', d."createdAt"), 'YYYY-MM')`;

    // Aggregate entirely in the DB — no row limit, no data loss.
    const rows = await readClient.$queryRaw<
      Array<{ period: string; icd_code: string; count: number }>
    >`
      SELECT period, icd_code, COUNT(*)::int AS count
      FROM (
        SELECT
          ${periodSql} AS period,
          ic.code       AS icd_code
        FROM "Diagnosis" d
        JOIN "Appointment" a ON d."appointmentId" = a.id
        JOIN "IcdCode"    ic ON d."icdCodeId"     = ic.id
        WHERE a."clinicId"   = ${clinicId}
          AND d."createdAt" >= ${startDate}
          AND d."createdAt" <= ${endDate}
          AND d."icdCodeId" IS NOT NULL
      ) sub
      GROUP BY period, icd_code
      ORDER BY period ASC
    `;

    const timeSeriesData = new Map<string, Map<string, number>>();
    for (const row of rows) {
      if (!timeSeriesData.has(row.period)) {
        timeSeriesData.set(row.period, new Map());
      }
      timeSeriesData.get(row.period)!.set(row.icd_code, row.count);
    }

    return Array.from(timeSeriesData.entries()).map(([period, codes]) => ({
      period,
      diagnoses: Array.from(codes.entries()).map(([code, count]) => ({
        code,
        count,
      })),
    }));
  }

  async getCodingComplianceMetrics(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.AppointmentWhereInput = {
      clinicId,
      status: AppointmentStatus.COMPLETED,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const readClient = this.getReadClient();
    const appointmentScope: Prisma.AppointmentWhereInput = where;

    const [
      totalVisits,
      codedVisits,
      billedVisits,
      primaryDiagnosisCount,
      totalDiagnoses,
      totalProcedures,
      proceduresWithoutPrice,
    ] = await Promise.all([
      readClient.appointment.count({ where: appointmentScope }),
      readClient.appointment.count({
        where: {
          ...appointmentScope,
          diagnoses: { some: {} },
        },
      }),
      readClient.appointment.count({
        where: {
          ...appointmentScope,
          procedures: { some: {} },
        },
      }),
      readClient.appointment.count({
        where: {
          ...appointmentScope,
          diagnoses: { some: { isPrimary: true } },
        },
      }),
      readClient.diagnosis.count({
        where: {
          appointment: appointmentScope,
        },
      }),
      readClient.procedure.count({
        where: {
          appointment: appointmentScope,
        },
      }),
      readClient.procedure.count({
        where: {
          appointment: appointmentScope,
          OR: [{ cptCodeId: null }, { cptCode: { price: 0 } }],
        },
      }),
    ]);

    return {
      totalVisits,
      codedVisits,
      billedVisits,
      codingCompletenessRate:
        totalVisits > 0 ? (codedVisits / totalVisits) * 100 : 0,
      billingRate: totalVisits > 0 ? (billedVisits / totalVisits) * 100 : 0,
      primaryDiagnosisRate:
        codedVisits > 0 ? (primaryDiagnosisCount / codedVisits) * 100 : 0,
      avgDiagnosesPerVisit: totalVisits > 0 ? totalDiagnoses / totalVisits : 0,
      avgProceduresPerVisit:
        totalVisits > 0 ? totalProcedures / totalVisits : 0,
      proceduresWithoutPrice,
      unbilledProceduresRate:
        totalProcedures > 0
          ? (proceduresWithoutPrice / totalProcedures) * 100
          : 0,
    };
  }

  async getCodingTimeliness(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.AppointmentWhereInput = {
      clinicId,
      status: AppointmentStatus.COMPLETED,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const readClient = this.getReadClient();
    const diagnosisWhere: Prisma.DiagnosisWhereInput = {
      appointment: where,
    };
    const firstDiagnosisByAppointment = await readClient.diagnosis.groupBy({
      by: ['appointmentId'],
      where: diagnosisWhere,
      _min: { createdAt: true },
    });

    const appointmentIds = firstDiagnosisByAppointment
      .map((row) => row.appointmentId)
      .filter((id): id is string => typeof id === 'string');

    if (appointmentIds.length === 0) {
      return {
        avgTimeToCodeHours: 0,
        distribution: this.getCodingTimelinessDistribution([]),
        totalCoded: 0,
      };
    }

    const appointments = await readClient.appointment.findMany({
      where: {
        ...where,
        id: { in: appointmentIds },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const appointmentCreatedAtById = new Map(
      appointments.map((appointment) => [
        appointment.id,
        appointment.createdAt,
      ]),
    );

    const timeToCodeData = firstDiagnosisByAppointment
      .map((row) => {
        const appointmentCreatedAt = appointmentCreatedAtById.get(
          row.appointmentId,
        );
        const firstDiagnosisCreatedAt = row._min.createdAt;
        if (!appointmentCreatedAt || !firstDiagnosisCreatedAt) {
          return null;
        }

        const hoursToCode =
          (firstDiagnosisCreatedAt.getTime() - appointmentCreatedAt.getTime()) /
          (1000 * 60 * 60);
        return hoursToCode >= 0 ? hoursToCode : null;
      })
      .filter((value): value is number => value !== null);

    const avgTimeToCode =
      timeToCodeData.length > 0
        ? timeToCodeData.reduce((sum, t) => sum + t, 0) / timeToCodeData.length
        : 0;

    return {
      avgTimeToCodeHours: avgTimeToCode,
      distribution: this.getCodingTimelinessDistribution(timeToCodeData),
      totalCoded: timeToCodeData.length,
    };
  }

  async getTopConditions(clinicId: string, limit: number = 10) {
    const cacheKey = `top-conditions-${clinicId}-${limit}`;
    const cached = await this.cacheManager.get<TopCondition[]>(cacheKey);
    if (cached) return cached;

    const readClient = this.getReadClient();

    const conditions = await readClient.patientMedicalCondition.groupBy({
      by: ['conditionName'],
      where: { patient: { clinicId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const result = conditions.map((c) => ({
      condition: c.conditionName,
      count: c._count.id,
      percentage: 0,
    }));

    await this.cacheManager.set(
      cacheKey,
      result,
      this.configService.getAnalyticsCacheTtl() * 1000,
    );
    return result;
  }

  private getCodingTimelinessDistribution(timeToCodeData: number[]) {
    return {
      within24h: timeToCodeData.filter((timeToCode) => timeToCode < 24).length,
      within48h: timeToCodeData.filter(
        (timeToCode) => timeToCode >= 24 && timeToCode < 48,
      ).length,
      within72h: timeToCodeData.filter(
        (timeToCode) => timeToCode >= 48 && timeToCode < 72,
      ).length,
      over72h: timeToCodeData.filter((timeToCode) => timeToCode >= 72).length,
    };
  }
}

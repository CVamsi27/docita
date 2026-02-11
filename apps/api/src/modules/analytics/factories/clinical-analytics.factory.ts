import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, AppointmentStatus } from '@workspace/db';
import {
  DiseaseTrendPoint,
  TopCondition,
  ComplianceMetrics,
} from '@workspace/types';

@Injectable()
export class ClinicalAnalyticsFactory {
  private readonly logger = new Logger(ClinicalAnalyticsFactory.name);

  constructor(
    private prisma: PrismaService,
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

    const icdCodeIds = diagnoses.map((d) => d.icdCodeId).filter(Boolean);

    const icdCodes = await readClient.icdCode.findMany({
      where: { id: { in: icdCodeIds as string[] } },
    });

    const icdCodeMap = new Map(icdCodes.map((code) => [code.id, code]));

    const result: DiseaseTrendPoint[] = diagnoses.map((d) => ({
      icdCode: icdCodeMap.get(d.icdCodeId as string) as unknown as
        | { code: string; description: string; category: string }
        | undefined,
      count: d._count.id,
    }));

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

    const diagnoses = await readClient.diagnosis.findMany({
      where: {
        appointment: { clinicId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        icdCode: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const timeSeriesData = new Map<string, Map<string, number>>();

    diagnoses.forEach((diagnosis) => {
      if (!diagnosis.icdCode) return;

      const date = new Date(diagnosis.createdAt);
      let periodKey: string;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeSeriesData.has(periodKey)) {
        timeSeriesData.set(periodKey, new Map());
      }

      const periodData = timeSeriesData.get(periodKey)!;
      const codeKey = diagnosis.icdCode.code;
      periodData.set(codeKey, (periodData.get(codeKey) || 0) + 1);
    });

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

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        diagnoses: {
          select: {
            id: true,
            isPrimary: true,
            icdCodeId: true,
          },
        },
        procedures: {
          select: {
            id: true,
            cptCodeId: true,
            cptCode: {
              select: {
                price: true,
              },
            },
          },
        },
      },
    });

    const totalVisits = appointments.length;
    const codedVisits = appointments.filter(
      (a) => a.diagnoses.length > 0,
    ).length;
    const billedVisits = appointments.filter(
      (a) => a.procedures.length > 0,
    ).length;
    const primaryDiagnosisCount = appointments.filter((a) =>
      a.diagnoses.some((d) => d.isPrimary),
    ).length;

    const totalDiagnoses = appointments.reduce(
      (sum, a) => sum + a.diagnoses.length,
      0,
    );
    const totalProcedures = appointments.reduce(
      (sum, a) => sum + a.procedures.length,
      0,
    );

    const proceduresWithoutPrice = appointments.reduce((sum, a) => {
      return (
        sum +
        a.procedures.filter((p) => !p.cptCode || p.cptCode.price === 0).length
      );
    }, 0);

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
      diagnoses: {
        some: {},
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        diagnoses: {
          select: {
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const timeToCodeData = appointments
      .filter((a) => a.diagnoses.length > 0)
      .map((a) => {
        const appointmentDate = new Date(a.createdAt);
        const firstDiagnosisDate = new Date(a.diagnoses[0].createdAt);
        const hoursToCode =
          (firstDiagnosisDate.getTime() - appointmentDate.getTime()) /
          (1000 * 60 * 60);
        return hoursToCode;
      });

    const avgTimeToCode =
      timeToCodeData.length > 0
        ? timeToCodeData.reduce((sum, t) => sum + t, 0) / timeToCodeData.length
        : 0;

    const distribution = {
      within24h: timeToCodeData.filter((t) => t < 24).length,
      within48h: timeToCodeData.filter((t) => t >= 24 && t < 48).length,
      within72h: timeToCodeData.filter((t) => t >= 48 && t < 72).length,
      over72h: timeToCodeData.filter((t) => t >= 72).length,
    };

    return {
      avgTimeToCodeHours: avgTimeToCode,
      distribution,
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
      parseInt(process.env.ANALYTICS_CACHE_TTL || '300') * 1000,
    );
    return result;
  }
}

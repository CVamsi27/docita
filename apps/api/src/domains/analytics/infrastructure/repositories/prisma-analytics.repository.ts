import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus, Prisma } from '@workspace/db';
import { PATIENT_ANALYTICS_SELECT } from '@/shared/common/select-fragments';
import {
  AppointmentMetricsAggregates,
  AppointmentStatusBreakdown,
  DateRange,
  DemographicsAgeCutoffs,
  DemographicsAggregates,
  IAnalyticsRepository,
  OverviewAggregates,
  UncodedVisitsAggregates,
} from '@/domains/analytics/core/repositories/analytics.repository.interface';
import {
  mapAppointmentStatusGroupRows,
  mapAppointmentTypeGroupRows,
  mapPatientGenderGroupRows,
} from '@/domains/analytics/infrastructure/repositories/analytics-groupby.helpers';

@Injectable()
export class PrismaAnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private read() {
    return this.prisma.getReadClient();
  }

  async getOverviewAggregates(
    clinicId: string,
    thisMonth: DateRange,
    lastMonth: DateRange,
  ): Promise<OverviewAggregates> {
    const read = this.read();
    const [
      totalPatients,
      newPatientsThisMonth,
      newPatientsLastMonth,
      totalAppointments,
      appointmentsThisMonth,
      invoicesThisMonth,
      invoicesLastMonth,
    ] = await Promise.all([
      read.patient.count({ where: { clinicId } }),
      read.patient.count({
        where: { clinicId, createdAt: { gte: thisMonth.start } },
      }),
      read.patient.count({
        where: {
          clinicId,
          createdAt: { gte: lastMonth.start, lte: lastMonth.end },
        },
      }),
      read.appointment.count({ where: { clinicId } }),
      read.appointment.count({
        where: { clinicId, createdAt: { gte: thisMonth.start } },
      }),
      read.invoice.aggregate({
        where: {
          patient: { clinicId },
          createdAt: { gte: thisMonth.start },
        },
        _sum: { total: true },
      }),
      read.invoice.aggregate({
        where: {
          patient: { clinicId },
          createdAt: { gte: lastMonth.start, lte: lastMonth.end },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalPatients,
      newPatientsThisMonth,
      newPatientsLastMonth,
      totalAppointments,
      appointmentsThisMonth,
      revenueThisMonth: invoicesThisMonth._sum?.total ?? 0,
      revenueLastMonth: invoicesLastMonth._sum?.total ?? 0,
    };
  }

  async getPatientCreationTimestamps(
    clinicId: string,
    since: Date,
  ): Promise<Date[]> {
    const rows = await this.read().patient.findMany({
      where: { clinicId, createdAt: { gte: since } },
      select: PATIENT_ANALYTICS_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.createdAt);
  }

  async getAppointmentStatusBreakdown(
    clinicId: string,
    since: Date,
  ): Promise<AppointmentStatusBreakdown> {
    const read = this.read();
    const where = { clinicId, createdAt: { gte: since } };
    const [total, statusCounts, typeCounts] = await Promise.all([
      read.appointment.count({ where }),
      read.appointment.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      read.appointment.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      statusCounts: mapAppointmentStatusGroupRows(statusCounts),
      typeCounts: mapAppointmentTypeGroupRows(typeCounts),
    };
  }

  async getAppointmentMetricsAggregates(
    where: Prisma.AppointmentWhereInput,
  ): Promise<AppointmentMetricsAggregates> {
    const read = this.read();
    const [total, booked, completed, cancelled, noShow] = await Promise.all([
      read.appointment.count({ where }),
      read.appointment.count({
        where: { ...where, status: AppointmentStatus.CONFIRMED },
      }),
      read.appointment.count({
        where: { ...where, status: AppointmentStatus.COMPLETED },
      }),
      read.appointment.count({
        where: { ...where, status: AppointmentStatus.CANCELLED },
      }),
      read.appointment.count({
        where: { ...where, status: AppointmentStatus.NO_SHOW },
      }),
    ]);
    return { total, booked, completed, cancelled, noShow };
  }

  async getPatientDemographicsAggregates(
    where: Prisma.PatientWhereInput,
    cutoffs: DemographicsAgeCutoffs,
  ): Promise<DemographicsAggregates> {
    const read = this.read();
    const [
      totalPatients,
      genders,
      age0to18,
      age18to35,
      age35to50,
      age50to65,
      age65plus,
    ] = await Promise.all([
      read.patient.count({ where }),
      read.patient.groupBy({
        by: ['gender'],
        where,
        _count: { _all: true },
      }),
      read.patient.count({
        where: { ...where, dateOfBirth: { gt: cutoffs.age18 } },
      }),
      read.patient.count({
        where: {
          ...where,
          dateOfBirth: { gt: cutoffs.age35, lte: cutoffs.age18 },
        },
      }),
      read.patient.count({
        where: {
          ...where,
          dateOfBirth: { gt: cutoffs.age50, lte: cutoffs.age35 },
        },
      }),
      read.patient.count({
        where: {
          ...where,
          dateOfBirth: { gt: cutoffs.age65, lte: cutoffs.age50 },
        },
      }),
      read.patient.count({
        where: { ...where, dateOfBirth: { lte: cutoffs.age65 } },
      }),
    ]);

    return {
      totalPatients,
      genders: mapPatientGenderGroupRows(genders),
      age0to18,
      age18to35,
      age35to50,
      age50to65,
      age65plus,
    };
  }

  async getUncodedVisitsAggregates(
    clinicId: string,
    olderThanDate: Date,
  ): Promise<UncodedVisitsAggregates> {
    const read = this.read();
    const uncodedWhere: Prisma.AppointmentWhereInput = {
      clinicId,
      status: AppointmentStatus.COMPLETED,
      diagnoses: { none: {} },
    };
    const [totalUncoded, uncodedOlderThan7Days] = await Promise.all([
      read.appointment.count({ where: uncodedWhere }),
      read.appointment.count({
        where: { ...uncodedWhere, createdAt: { lt: olderThanDate } },
      }),
    ]);
    return { totalUncoded, uncodedOlderThan7Days };
  }
}

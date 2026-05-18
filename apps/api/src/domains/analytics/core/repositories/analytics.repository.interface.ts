import type { Prisma } from '@workspace/db';

export interface DateRange {
  start: Date;
  end?: Date;
}

export interface OverviewAggregates {
  totalPatients: number;
  newPatientsThisMonth: number;
  newPatientsLastMonth: number;
  totalAppointments: number;
  appointmentsThisMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
}

export interface AppointmentStatusBreakdown {
  total: number;
  statusCounts: Array<{ status: string; count: number }>;
  typeCounts: Array<{ type: string; count: number }>;
}

export interface AppointmentMetricsAggregates {
  total: number;
  booked: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface DemographicsAgeCutoffs {
  age18: Date;
  age35: Date;
  age50: Date;
  age65: Date;
}

export interface DemographicsAggregates {
  totalPatients: number;
  genders: Array<{ gender: 'MALE' | 'FEMALE' | 'OTHER' | null; count: number }>;
  age0to18: number;
  age18to35: number;
  age35to50: number;
  age50to65: number;
  age65plus: number;
}

export interface UncodedVisitsAggregates {
  totalUncoded: number;
  uncodedOlderThan7Days: number;
}

/**
 * Repository over all analytics aggregates. Keeps the service free of
 * `@prisma/client` so caching and DTO shaping stay testable independently.
 */
export interface IAnalyticsRepository {
  getOverviewAggregates(
    clinicId: string,
    thisMonth: DateRange,
    lastMonth: DateRange,
  ): Promise<OverviewAggregates>;

  /** Patient creation timestamps in date order, for service-side bucketing. */
  getPatientCreationTimestamps(clinicId: string, since: Date): Promise<Date[]>;

  getAppointmentStatusBreakdown(
    clinicId: string,
    since: Date,
  ): Promise<AppointmentStatusBreakdown>;

  getAppointmentMetricsAggregates(
    where: Prisma.AppointmentWhereInput,
  ): Promise<AppointmentMetricsAggregates>;

  getPatientDemographicsAggregates(
    where: Prisma.PatientWhereInput,
    cutoffs: DemographicsAgeCutoffs,
  ): Promise<DemographicsAggregates>;

  getUncodedVisitsAggregates(
    clinicId: string,
    olderThanDate: Date,
  ): Promise<UncodedVisitsAggregates>;
}

export const ANALYTICS_REPOSITORY_TOKEN = Symbol('IAnalyticsRepository');

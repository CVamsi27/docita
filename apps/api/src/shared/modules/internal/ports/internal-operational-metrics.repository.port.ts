export interface OperationalSnapshot {
  requests: number;
  errors: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  validLatencySamples: number;
  invalidLatencySamples: number;
  firstSampleAt: Date | null;
  lastSampleAt: Date | null;
  clinicsWithAppointments: number;
  appointments: number;
  completedAppointments: number;
  prescriptionsCreated: number;
  clinicPatientsSeen: number;
  invoices: number;
  jobs: number;
  failedJobs: number;
}
export interface InternalOperationalMetricsRepository {
  read(start: Date, end: Date): Promise<OperationalSnapshot>;
}
export const INTERNAL_OPERATIONAL_METRICS_REPOSITORY = Symbol(
  'InternalOperationalMetricsRepository',
);

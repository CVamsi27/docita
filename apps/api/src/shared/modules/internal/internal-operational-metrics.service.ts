import { Inject, Injectable } from '@nestjs/common';
import {
  internalOperationalMetricsSchema,
  type InternalOperationalMetrics,
} from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  INTERNAL_OPERATIONAL_METRICS_REPOSITORY,
  type InternalOperationalMetricsRepository,
} from './ports/internal-operational-metrics.repository.port';

@Injectable()
export class InternalOperationalMetricsService {
  constructor(
    @Inject(INTERNAL_OPERATIONAL_METRICS_REPOSITORY)
    private readonly repository: InternalOperationalMetricsRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getMetrics(): Promise<InternalOperationalMetrics> {
    const end = this.clock.now();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const data = await this.repository.read(start, end);
    return internalOperationalMetricsSchema.parse({
      definitionVersion: 2,
      window: {
        startInclusive: start.toISOString(),
        endExclusive: end.toISOString(),
        days: 30,
      },
      activity: {
        clinicsWithAppointments: data.clinicsWithAppointments,
        appointments: data.appointments,
        completedAppointments: data.completedAppointments,
        prescriptionsCreated: data.prescriptionsCreated,
        clinicPatientsSeen: data.clinicPatientsSeen,
        invoices: data.invoices,
        jobs: data.jobs,
        failedJobs: data.failedJobs,
      },
      telemetry: {
        requestScope: 'CUSTOMER',
        samples: data.requests,
        serverErrors: data.errors,
        errorRatePercent: data.requests
          ? (data.errors / data.requests) * 100
          : null,
        p50Ms: data.p50Ms,
        p95Ms: data.p95Ms,
        p99Ms: data.p99Ms,
        validLatencySamples: data.validLatencySamples,
        invalidLatencySamples: data.invalidLatencySamples,
        firstSampleAt: data.firstSampleAt?.toISOString() ?? null,
        lastSampleAt: data.lastSampleAt?.toISOString() ?? null,
      },
    });
  }
}

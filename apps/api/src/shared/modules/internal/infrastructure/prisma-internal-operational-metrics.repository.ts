import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { MAX_VALID_LATENCY_MS } from '@/shared/modules/monitoring/monitoring/rules/telemetry-observation.rules';
import type {
  InternalOperationalMetricsRepository,
  OperationalSnapshot,
} from '../ports/internal-operational-metrics.repository.port';

@Injectable()
export class PrismaInternalOperationalMetricsRepository implements InternalOperationalMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(start: Date, end: Date): Promise<OperationalSnapshot> {
    const rows = await this.prisma.$queryRaw<OperationalSnapshot[]>(Prisma.sql`
      WITH requests AS (
        SELECT "statusCode", duration, "observedAt",
          ("latencyValid" AND duration >= 0 AND duration <= ${MAX_VALID_LATENCY_MS}) AS "usableLatency"
        FROM "ApiRequest"
        WHERE "observedAt" >= ${start} AND "observedAt" < ${end}
          AND "routeCategory" = 'CUSTOMER'
      ), appointments AS (
        SELECT "clinicId", "patientId", status FROM "Appointment" WHERE "startTime" >= ${start} AND "startTime" < ${end}
      ), jobs AS (
        SELECT status FROM "QueueJob" WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
      )
      SELECT
        COUNT(*)::float8 AS requests,
        (COUNT(*) FILTER (WHERE "statusCode" >= 500 AND "statusCode" < 600))::float8 AS errors,
        (COUNT(*) FILTER (WHERE "usableLatency"))::float8 AS "validLatencySamples",
        (COUNT(*) FILTER (WHERE NOT "usableLatency"))::float8 AS "invalidLatencySamples",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) FILTER (WHERE "usableLatency") AS "p50Ms",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) FILTER (WHERE "usableLatency") AS "p95Ms",
        percentile_cont(0.99) WITHIN GROUP (ORDER BY duration) FILTER (WHERE "usableLatency") AS "p99Ms",
        MIN("observedAt") AS "firstSampleAt", MAX("observedAt") AS "lastSampleAt",
        (SELECT COUNT(DISTINCT "clinicId")::float8 FROM appointments) AS "clinicsWithAppointments",
        (SELECT COUNT(*)::float8 FROM appointments) AS appointments,
        (SELECT COUNT(*)::float8 FROM appointments WHERE status = 'COMPLETED') AS "completedAppointments",
        (SELECT COUNT(DISTINCT ("clinicId", "patientId"))::float8 FROM appointments WHERE status = 'COMPLETED') AS "clinicPatientsSeen",
        (SELECT COUNT(*)::float8 FROM "Prescription" WHERE "createdAt" >= ${start} AND "createdAt" < ${end}) AS "prescriptionsCreated",
        (SELECT COUNT(*)::float8 FROM "Invoice" WHERE "createdAt" >= ${start} AND "createdAt" < ${end}) AS invoices,
        (SELECT COUNT(*)::float8 FROM jobs) AS jobs,
        (SELECT COUNT(*)::float8 FROM jobs WHERE status = 'FAILED') AS "failedJobs"
      FROM requests
    `);
    if (!rows[0])
      throw new Error('Operational metrics query returned no summary');
    return rows[0];
  }
}

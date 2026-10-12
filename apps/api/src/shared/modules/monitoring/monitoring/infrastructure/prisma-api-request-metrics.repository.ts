import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  ApiRequestMetricsFilter,
  ApiRequestMetricsRepository,
  ResponseTimeDistributionRow,
} from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';

@Injectable()
export class PrismaApiRequestMetricsRepository implements ApiRequestMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Window and scope predicates for telemetry reads.
   *
   * `observedAt` rather than `createdAt`: a row buffered during a persistence
   * outage is written long after the request finished, and the old column made
   * that request appear in whichever hour it happened to be flushed.
   */
  private buildSqlWhere(filter: ApiRequestMetricsFilter): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];
    if (filter.startDate) {
      clauses.push(Prisma.sql`"observedAt" >= ${filter.startDate}`);
    }
    if (filter.endDate) {
      clauses.push(Prisma.sql`"observedAt" <= ${filter.endDate}`);
    }
    if (filter.clinicId) {
      clauses.push(Prisma.sql`"clinicId" = ${filter.clinicId}`);
    }
    if (filter.routeCategory) {
      clauses.push(Prisma.sql`"routeCategory" = ${filter.routeCategory}`);
    }
    return clauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`
      : Prisma.empty;
  }

  async getResponseTimeDistribution(
    filter: ApiRequestMetricsFilter,
  ): Promise<ResponseTimeDistributionRow[]> {
    const sqlWhere = this.buildSqlWhere(filter);
    return this.prisma.$queryRaw<ResponseTimeDistributionRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 0 AND duration < 100)::bigint AS "range_0_100",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 100 AND duration < 250)::bigint AS "range_100_250",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 250 AND duration < 500)::bigint AS "range_250_500",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 500 AND duration < 1000)::bigint AS "range_500_1000",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 1000 AND duration < 2000)::bigint AS "range_1000_2000",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 2000 AND duration < 5000)::bigint AS "range_2000_5000",
        COUNT(*) FILTER (WHERE "latencyValid" AND duration >= 5000)::bigint AS "range_5000_plus",
        COUNT(*) FILTER (WHERE NOT "latencyValid")::bigint AS "invalid_latency_samples"
      FROM "ApiRequest"
      ${sqlWhere}
    `);
  }

  async getThroughputByMinute(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ minute: string; count: bigint }>> {
    return this.prisma.$queryRaw<Array<{ minute: string; count: bigint }>>(
      Prisma.sql`
        SELECT
          to_char(date_trunc('minute', "observedAt"), 'YYYY-MM-DD"T"HH24:MI') AS "minute",
          COUNT(*)::bigint AS "count"
        FROM "ApiRequest"
        WHERE "observedAt" >= ${startDate}
          AND "observedAt" <= ${endDate}
        GROUP BY date_trunc('minute', "observedAt")
        ORDER BY date_trunc('minute', "observedAt") ASC
      `,
    );
  }

  async getRequestsByHour(
    filter: ApiRequestMetricsFilter,
  ): Promise<Array<{ hour: number; count: bigint }>> {
    const sqlWhere = this.buildSqlWhere(filter);
    return this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>(
      Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM "observedAt")::int AS "hour",
          COUNT(*)::bigint AS "count"
        FROM "ApiRequest"
        ${sqlWhere}
        GROUP BY EXTRACT(HOUR FROM "observedAt")
        ORDER BY EXTRACT(HOUR FROM "observedAt") ASC
      `,
    );
  }
}

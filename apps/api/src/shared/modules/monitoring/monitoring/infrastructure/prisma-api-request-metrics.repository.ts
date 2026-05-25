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

  private buildSqlWhere(filter: ApiRequestMetricsFilter): Prisma.Sql {
    const clauses: Prisma.Sql[] = [];
    if (filter.startDate) {
      clauses.push(Prisma.sql`"createdAt" >= ${filter.startDate}`);
    }
    if (filter.endDate) {
      clauses.push(Prisma.sql`"createdAt" <= ${filter.endDate}`);
    }
    if (filter.clinicId) {
      clauses.push(Prisma.sql`"clinicId" = ${filter.clinicId}`);
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
        COUNT(*) FILTER (WHERE duration >= 0 AND duration < 100)::bigint AS "range_0_100",
        COUNT(*) FILTER (WHERE duration >= 100 AND duration < 250)::bigint AS "range_100_250",
        COUNT(*) FILTER (WHERE duration >= 250 AND duration < 500)::bigint AS "range_250_500",
        COUNT(*) FILTER (WHERE duration >= 500 AND duration < 1000)::bigint AS "range_500_1000",
        COUNT(*) FILTER (WHERE duration >= 1000 AND duration < 2000)::bigint AS "range_1000_2000",
        COUNT(*) FILTER (WHERE duration >= 2000 AND duration < 5000)::bigint AS "range_2000_5000",
        COUNT(*) FILTER (WHERE duration >= 5000)::bigint AS "range_5000_plus"
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
          to_char(date_trunc('minute', "createdAt"), 'YYYY-MM-DD"T"HH24:MI') AS "minute",
          COUNT(*)::bigint AS "count"
        FROM "ApiRequest"
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        GROUP BY date_trunc('minute', "createdAt")
        ORDER BY date_trunc('minute', "createdAt") ASC
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
          EXTRACT(HOUR FROM "createdAt")::int AS "hour",
          COUNT(*)::bigint AS "count"
        FROM "ApiRequest"
        ${sqlWhere}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY EXTRACT(HOUR FROM "createdAt") ASC
      `,
    );
  }
}

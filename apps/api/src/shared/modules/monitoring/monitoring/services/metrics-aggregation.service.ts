import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MetricsAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async aggregateHourlyMetrics(): Promise<void> {
    const oneHourAgo = this.clock.now();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    oneHourAgo.setMinutes(0, 0, 0);

    const hourStart = oneHourAgo;
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    const [aggregates, successAggregates] = await Promise.all([
      this.prisma.apiRequest.groupBy({
        by: ['path', 'method'],
        where: {
          createdAt: { gte: hourStart, lt: hourEnd },
        },
        _count: { id: true },
        _avg: { duration: true },
        _min: { duration: true },
        _max: { duration: true },
      }),
      this.prisma.apiRequest.groupBy({
        by: ['path', 'method'],
        where: {
          createdAt: { gte: hourStart, lt: hourEnd },
          statusCode: { lt: 400 },
        },
        _count: { id: true },
      }),
    ]);

    const successCountByRoute = new Map(
      successAggregates.map((row) => [
        `${row.path}::${row.method}`,
        row._count.id,
      ]),
    );

    await Promise.all(
      aggregates.map((agg) => {
        const successCount =
          successCountByRoute.get(`${agg.path}::${agg.method}`) ?? 0;

        return this.prisma.performanceAggregate.upsert({
          where: {
            path_method_period_periodStart: {
              path: agg.path,
              method: agg.method,
              period: 'hourly',
              periodStart: hourStart,
            },
          },
          create: {
            path: agg.path,
            method: agg.method,
            period: 'hourly',
            periodStart: hourStart,
            totalRequests: agg._count.id,
            successCount,
            errorCount: agg._count.id - successCount,
            avgDuration: agg._avg.duration || 0,
            minDuration: agg._min.duration || 0,
            maxDuration: agg._max.duration || 0,
          },
          update: {
            totalRequests: agg._count.id,
            successCount,
            errorCount: agg._count.id - successCount,
            avgDuration: agg._avg.duration || 0,
            minDuration: agg._min.duration || 0,
            maxDuration: agg._max.duration || 0,
          },
        });
      }),
    );
  }


  async getAggregatedPerformance(
    period: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<unknown[]> {
    return this.prisma.performanceAggregate.findMany({
      where: {
        period,
        periodStart: { gte: startDate, lte: endDate },
      },
      orderBy: { periodStart: 'asc' },
    });
  }

  async cleanupOldMetrics(daysToKeep: number): Promise<number> {
    const cutoffDate = this.clock.now();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemMetric.deleteMany({
      where: { recordedAt: { lt: cutoffDate } },
    });

    return result.count;
  }

}


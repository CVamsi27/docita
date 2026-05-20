import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { MetricType, Prisma } from '@workspace/db';
import { MetricsPersistenceService } from './metrics-persistence.service';

@Injectable()
export class MetricsRecordingService {
  constructor(
    private readonly persistence: MetricsPersistenceService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async recordMetric(
    metricType: MetricType,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.persistence.create(
      {
        metricType,
        value,
        unit,
        metadata: metadata as Prisma.InputJsonValue,
      },
      'Failed to record metric',
    );
  }

  async recordSystemMetrics(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    await this.persistence.createMany(
      [
        {
          metricType: MetricType.MEMORY_USAGE,
          value: memoryUsage.rss / 1024 / 1024,
          unit: 'MB',
        },
        {
          metricType: MetricType.HEAP_USED,
          value: memoryUsage.heapUsed / 1024 / 1024,
          unit: 'MB',
        },
        {
          metricType: MetricType.HEAP_TOTAL,
          value: memoryUsage.heapTotal / 1024 / 1024,
          unit: 'MB',
        },
        {
          metricType: MetricType.CPU_USAGE,
          value: (cpuUsage.user + cpuUsage.system) / 1000000,
          unit: 'seconds',
        },
        {
          metricType: MetricType.UPTIME,
          value: uptime,
          unit: 'seconds',
        },
      ],
      'Failed to record system metrics',
    );
  }

  async recordFeatureUsage(
    featureName: string,
    clinicId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.persistence.create(
      {
        metricType: MetricType.REQUEST_COUNT,
        value: 1,
        unit: 'count',
        metadata: {
          featureName,
          metricCategory: 'feature_usage',
          clinicId,
          userId,
          timestamp: this.clock.now().toISOString(),
          ...metadata,
        } as Prisma.InputJsonValue,
      },
      `Failed to record feature usage for ${featureName}`,
    );
  }

  async recordCacheMetric(
    isHit: boolean,
    key: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.persistence.create(
      {
        metricType: MetricType.REQUEST_COUNT,
        value: 1,
        unit: 'count',
        metadata: {
          metricCategory: isHit ? 'cache_hit' : 'cache_miss',
          key,
          timestamp: this.clock.now().toISOString(),
          ...metadata,
        } as Prisma.InputJsonValue,
      },
      'Failed to record cache metric',
    );
  }

  async recordDatabaseMetric(
    operationType: string,
    duration: number,
    isError: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.persistence.create(
      {
        metricType: MetricType.DB_QUERY_TIME,
        value: duration,
        unit: 'ms',
        metadata: {
          operationType,
          duration,
          isError,
          timestamp: this.clock.now().toISOString(),
          ...metadata,
        } as Prisma.InputJsonValue,
      },
      'Failed to record database metric',
    );
  }
}

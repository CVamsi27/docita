import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MetricType, Prisma } from '@workspace/db';
import { WebVitalDto } from '@/shared/modules/monitoring/monitoring/dto/monitoring.dto';
import { MetricsPersistenceService } from './metrics-persistence.service';

function getMetadataPage(
  metadata: Prisma.JsonValue | null,
): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const page = Reflect.get(metadata, 'page');
  return typeof page === 'string' ? page : undefined;
}

const CORE_WEB_VITAL_NAMES = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);

@Injectable()
export class WebVitalsMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly persistence: MetricsPersistenceService,
  ) {}

  async recordWebVital(vital: WebVitalDto) {
    const rating = this.getRating(vital.name, vital.value);

    if (this.persistence.isDisabled()) {
      return { success: true, rating };
    }

    await this.persistence.create(
      {
        metricType: MetricType.AVG_RESPONSE_TIME,
        value: vital.value,
        unit: vital.name,
        metadata: {
          rating,
          page: vital.page,
          userId: vital.userId,
          sessionId: vital.sessionId,
          metricName: vital.name,
          ...(vital.feature ? { feature: vital.feature } : {}),
        } as Prisma.InputJsonValue,
      },
      'Failed to record web vital',
    );

    return { success: true, rating };
  }

  async getWebVitals(startDate?: Date, endDate?: Date, page?: string) {
    const where: Prisma.SystemMetricWhereInput = {
      metricType: MetricType.AVG_RESPONSE_TIME,
    };

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      where.recordedAt = dateFilter;
    }

    const vitals = await this.prisma.systemMetric.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });

    const filtered = vitals.filter(
      (vital) => !page || getMetadataPage(vital.metadata) === page,
    );

    const grouped = filtered.reduce(
      (acc, vital) => {
        const name = vital.unit || 'unknown';
        if (!CORE_WEB_VITAL_NAMES.has(name)) {
          return acc;
        }
        if (!acc[name]) acc[name] = [];
        acc[name].push(vital.value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(grouped).map(([name, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;
      const avg = sorted.reduce((a, b) => a + b, 0) / count;
      const p75Index = Math.floor(count * 0.75);
      const p95Index = Math.floor(count * 0.95);

      return {
        name,
        count,
        avg,
        min: sorted[0] || 0,
        max: sorted[count - 1] || 0,
        p75: sorted[p75Index] || 0,
        p95: sorted[p95Index] || 0,
        rating: this.getRating(name, avg),
      };
    });
  }

  private getRating(
    name: string,
    value: number,
  ): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      INP: { good: 200, poor: 500 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  }
}

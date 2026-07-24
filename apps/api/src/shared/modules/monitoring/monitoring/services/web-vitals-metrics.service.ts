import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MetricType, Prisma } from '@workspace/db';
import { WebVitalDto } from '@/shared/modules/monitoring/monitoring/dto/monitoring.dto';
import { MetricsPersistenceService } from './metrics-persistence.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';

const CORE_WEB_VITAL_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
type CoreWebVitalName = (typeof CORE_WEB_VITAL_NAMES)[number];

function isCoreWebVitalName(name: string): name is CoreWebVitalName {
  return CORE_WEB_VITAL_NAMES.some((vital) => vital === name);
}

function getMetadataPage(
  metadata: Prisma.JsonValue | null,
): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const page = Reflect.get(metadata, 'page');
  return typeof page === 'string' ? page : undefined;
}

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
        metadata: toPrismaInputJsonValue({
          rating,
          page: vital.page,
          userId: vital.userId,
          sessionId: vital.sessionId,
          metricName: vital.name,
          ...(vital.feature ? { feature: vital.feature } : {}),
        }),
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
      take: BULK_READ_LIMIT,
    });

    const filtered = vitals.filter(
      (vital) => !page || getMetadataPage(vital.metadata) === page,
    );

    const grouped = filtered.reduce<
      Partial<Record<CoreWebVitalName, number[]>>
    >((acc, vital) => {
      const name = vital.unit || 'unknown';
      if (!isCoreWebVitalName(name)) {
        return acc;
      }
      const bucket = acc[name] ?? [];
      bucket.push(vital.value);
      acc[name] = bucket;
      return acc;
    }, {});

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

    const threshold = isCoreWebVitalName(name) ? thresholds[name] : undefined;
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  }
}

import { Injectable } from '@nestjs/common';
import { MetricType } from '@workspace/db';
import { WebVitalDto } from '@/shared/modules/monitoring/monitoring/dto/monitoring.dto';
import { MetricsRecordingService } from './metrics-recording.service';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';
import { MetricsQueryService } from './metrics-query.service';
import { MetricsAggregationService } from './metrics-aggregation.service';

/** Facade for system metrics: recording, queries, web vitals, and aggregation. */
@Injectable()
export class MetricsService {
  constructor(
    private readonly recording: MetricsRecordingService,
    private readonly webVitals: WebVitalsMetricsService,
    private readonly query: MetricsQueryService,
    private readonly aggregation: MetricsAggregationService,
  ) {}

  recordMetric(
    metricType: MetricType,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.recording.recordMetric(metricType, value, unit, metadata);
  }

  recordSystemMetrics(): Promise<void> {
    return this.recording.recordSystemMetrics();
  }

  recordFeatureUsage(
    featureName: string,
    clinicId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.recording.recordFeatureUsage(
      featureName,
      clinicId,
      userId,
      metadata,
    );
  }

  recordCacheMetric(
    isHit: boolean,
    key: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.recording.recordCacheMetric(isHit, key, metadata);
  }

  recordDatabaseMetric(
    operationType: string,
    duration: number,
    isError: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.recording.recordDatabaseMetric(
      operationType,
      duration,
      isError,
      metadata,
    );
  }

  getSystemMetrics(
    startDate: Date,
    endDate: Date,
    metricType?: MetricType,
  ): Promise<unknown[]> {
    return this.query.getSystemMetrics(startDate, endDate, metricType);
  }

  getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date,
  ): ReturnType<MetricsQueryService['getPerformanceMetrics']> {
    return this.query.getPerformanceMetrics(startDate, endDate);
  }

  aggregateHourlyMetrics(): Promise<void> {
    return this.aggregation.aggregateHourlyMetrics();
  }

  getAggregatedPerformance(
    period: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<unknown[]> {
    return this.aggregation.getAggregatedPerformance(period, startDate, endDate);
  }

  recordWebVital(vital: WebVitalDto) {
    return this.webVitals.recordWebVital(vital);
  }

  getWebVitals(startDate?: Date, endDate?: Date, page?: string) {
    return this.webVitals.getWebVitals(startDate, endDate, page);
  }

  cleanupOldMetrics(daysToKeep: number): Promise<number> {
    return this.aggregation.cleanupOldMetrics(daysToKeep);
  }

  getSecurityMonitoringSummary(startDate: Date, endDate: Date) {
    return this.query.getSecurityMonitoringSummary(startDate, endDate);
  }

  getQueueHealthSummary() {
    return this.query.getQueueHealthSummary();
  }
}

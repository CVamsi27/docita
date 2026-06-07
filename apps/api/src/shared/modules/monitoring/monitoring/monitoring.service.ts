import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ApiRequestInput, ErrorLogInput } from './schemas/monitoring.schema';
import { WebVitalDto } from './dto/monitoring.dto';
import { MetricType } from '@workspace/db';

import { RequestLogService } from './services/request-log.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { MetricsService } from './services/metrics.service';
import { HealthCheckService } from './services/health-check.service';

@Injectable()
export class MonitoringService implements OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly requestLogService: RequestLogService,
    private readonly errorTrackingService: ErrorTrackingService,
    private readonly metricsService: MetricsService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  onModuleDestroy() {
    this.logger.log('MonitoringService shutting down...');
  }

  logRequest(data: ApiRequestInput): void {
    this.requestLogService.logRequest(data);
  }

  logError(data: ErrorLogInput): void {
    this.errorTrackingService.logError(data);
  }

  async recordMetric(
    metricType: MetricType,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.metricsService.recordMetric(metricType, value, unit, metadata);
  }

  async recordSystemMetrics(): Promise<void> {
    return this.metricsService.recordSystemMetrics();
  }

  async recordFeatureUsage(
    featureName: string,
    clinicId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.metricsService.recordFeatureUsage(
      featureName,
      clinicId,
      userId,
      metadata,
    );
  }

  async recordCacheMetric(
    isHit: boolean,
    key: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.metricsService.recordCacheMetric(isHit, key, metadata);
  }

  async recordDatabaseMetric(
    operationType: string,
    duration: number,
    isError: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.metricsService.recordDatabaseMetric(
      operationType,
      duration,
      isError,
      metadata,
    );
  }

  async getSystemMetrics(
    startDate: Date,
    endDate: Date,
    metricType?: MetricType,
  ): Promise<unknown[]> {
// jscpd:ignore-start
    return this.metricsService.getSystemMetrics(startDate, endDate, metricType);
  }

  async getRequestStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    requestsByPath: { path: string; count: number; avgDuration: number }[];
    requestsByStatus: { statusCode: number; count: number }[];
    requestsByHour: { hour: number; count: number }[];
  }> {
    return this.requestLogService.getRequestStats(startDate, endDate, clinicId);
  }

  async getErrorStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
  ): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsByType: { type: string; count: number }[];
    recentErrors: {
      id: string;
      type: string;
      message: string;
      path?: string;
      severity: string;
      createdAt: Date;
    }[];
    errorTrend: { date: string; count: number }[];
  }> {
    return this.errorTrackingService.getErrorStats(
// jscpd:ignore-end
      startDate,
      endDate,
      clinicId,
    );
  }

  async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    slowestEndpoints: {
      path: string;
      method: string;
      avgDuration: number;
      maxDuration: number;
      count: number;
    }[];
    responseTimeDistribution: { range: string; count: number }[];
    throughputByMinute: { minute: string; count: number }[];
  }> {
    return this.metricsService.getPerformanceMetrics(startDate, endDate);
  }

  async getSystemHealth() {
    return this.healthCheckService.getSystemHealth();
  }

  async resolveError(
    errorId: string,
    resolvedBy: string,
  ): Promise<{ success: boolean }> {
    return this.errorTrackingService.resolveError(errorId, resolvedBy);
  }

  async resolveMultipleErrors(
    errorIds: string[],
    resolvedBy: string,
  ): Promise<{ success: boolean; count: number }> {
    return this.errorTrackingService.resolveMultipleErrors(
      errorIds,
      resolvedBy,
    );
  }

  async cleanupOldData(daysToKeep: number = 30): Promise<{
    requestsDeleted: number;
    errorsDeleted: number;
    metricsDeleted: number;
  }> {
    const [requestsDeleted, errorsDeleted, metricsDeleted] = await Promise.all([
      this.requestLogService.cleanupOldRequests(daysToKeep),
      this.errorTrackingService.cleanupOldErrors(daysToKeep),
      this.metricsService.cleanupOldMetrics(daysToKeep),
    ]);

    return {
      requestsDeleted,
      errorsDeleted,
      metricsDeleted,
    };
  }

  async aggregateHourlyMetrics(): Promise<void> {
    return this.metricsService.aggregateHourlyMetrics();
  }

  async getAggregatedPerformance(
    period: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<unknown[]> {
    return this.metricsService.getAggregatedPerformance(
      period,
      startDate,
      endDate,
    );
  }

  async recordWebVital(vital: WebVitalDto) {
    return this.metricsService.recordWebVital(vital);
  }

  async getWebVitals(startDate?: Date, endDate?: Date, page?: string) {
    return this.metricsService.getWebVitals(startDate, endDate, page);
  }

  async getSecurityMonitoringSummary(startDate: Date, endDate: Date) {
    return this.metricsService.getSecurityMonitoringSummary(startDate, endDate);
  }

  async getQueueHealthSummary() {
    return this.metricsService.getQueueHealthSummary();
  }
}

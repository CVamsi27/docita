import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MonitoringController } from './monitoring.controller';
import { MonitoringRumController } from './monitoring-rum.controller';
import { MonitoringClientController } from './monitoring-client.controller';
import { MonitoringService } from './monitoring.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MonitoringFactory } from './factories/monitoring.factory';
import { PrismaHealthIndicator } from './health/prisma.health';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { RequestLogService } from './services/request-log.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { MetricsService } from './services/metrics.service';
import { MetricsPersistenceService } from './services/metrics-persistence.service';
import { MetricsRecordingService } from './services/metrics-recording.service';
import { WebVitalsMetricsService } from './services/web-vitals-metrics.service';
import { MetricsQueryService } from './services/metrics-query.service';
import { MetricsAggregationService } from './services/metrics-aggregation.service';
import { HealthCheckService } from './services/health-check.service';
import { OpsAlertService } from './services/ops-alert.service';
import { OpsAlertListener } from './listeners/ops-alert.listener';
import { BusinessMetricsService } from './services/business-metrics.service';
import { API_REQUEST_METRICS_REPOSITORY_TOKEN } from './ports/api-request-metrics.repository.port';
import { PrismaApiRequestMetricsRepository } from './infrastructure/prisma-api-request-metrics.repository';
import { AppConfigModule } from '@/shared/modules/config/config.module';

// Services other monitoring/health-dependent modules inject directly —
// listed once so `providers` and `exports` can't drift apart over which of
// the module's services are part of its public surface.
const MONITORING_EXPORTED_SERVICES = [
  MonitoringService,
  HealthService,
  PrismaHealthIndicator,
  RequestLogService,
  ErrorTrackingService,
  MetricsPersistenceService,
  MetricsRecordingService,
  WebVitalsMetricsService,
  MetricsQueryService,
  MetricsAggregationService,
  MetricsService,
  HealthCheckService,
  OpsAlertService,
] as const;

@Global()
@Module({
  imports: [TerminusModule, PrismaModule, ComplianceModule, AppConfigModule],
  controllers: [
    MonitoringController,
    MonitoringRumController,
    MonitoringClientController,
    HealthController,
  ],
  providers: [
    {
      provide: API_REQUEST_METRICS_REPOSITORY_TOKEN,
      useClass: PrismaApiRequestMetricsRepository,
    },
    ...MONITORING_EXPORTED_SERVICES,
    MonitoringFactory,
    OpsAlertListener,
    BusinessMetricsService,
  ],
  exports: [...MONITORING_EXPORTED_SERVICES],
})
export class MonitoringModule {}

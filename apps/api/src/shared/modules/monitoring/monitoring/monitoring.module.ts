import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MonitoringController } from './monitoring.controller';
import { MonitoringClientController } from './monitoring-client.controller';
import { MonitoringService } from './monitoring.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { HealthController } from './health.controller';
import { MetricsScheduler } from './metrics.scheduler';
import { HealthService } from './health.service';
import { MonitoringFactory } from './factories/monitoring.factory';
import { PrismaHealthIndicator } from './health/prisma.health';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { RequestLogService } from './services/request-log.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { MetricsService } from './services/metrics.service';
import { HealthCheckService } from './services/health-check.service';

@Global()
@Module({
  imports: [TerminusModule, PrismaModule, ComplianceModule],
  controllers: [
    MonitoringController,
    MonitoringClientController,
    HealthController,
  ],
  providers: [
    MonitoringService,
    MonitoringFactory,
    MetricsScheduler,
    HealthService,
    PrismaHealthIndicator,
    RequestLogService,
    ErrorTrackingService,
    MetricsService,
    HealthCheckService,
  ],
  exports: [
    MonitoringService,
    HealthService,
    PrismaHealthIndicator,
    RequestLogService,
    ErrorTrackingService,
    MetricsService,
    HealthCheckService,
  ],
})
export class MonitoringModule {}

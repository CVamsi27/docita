import { Module } from '@nestjs/common';
import { OutboxModule } from './modules/outbox/outbox.module';
import { AuthModule } from './modules/auth/auth/auth.module';
import { AuthorizationModule } from './modules/auth/authorization/authorization.module';
import { ImportsModule } from './modules/imports/imports.module';
import { InternalModule } from './modules/internal/internal.module';
import { AppConfigModule } from './modules/config/config.module';
import { MonitoringModule } from './modules/monitoring/monitoring/monitoring.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { ContactModule } from './modules/contact/contact.module';
import { AIModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit/audit.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { EventsModule } from './common/events/events.module';
import { CommonServicesModule } from './modules/services/common-services.module';
import { PublicModule } from './modules/public/public.module';
import { IdempotencyModule } from './modules/idempotency';
import { TenantRateLimitModule } from './modules/tenant-rate-limit';
import { WebhooksModule } from './modules/webhooks';
import { RlsModule } from './modules/rls';
import { FeatureFlagsModule } from './modules/feature-flags';

@Module({
  imports: [
    OutboxModule,
    AuthModule,
    AuthorizationModule,
    ImportsModule,
    InternalModule,
    AppConfigModule,
    MonitoringModule,
    FhirModule,
    ContactModule,
    AIModule,
    AuditModule,
    PerformanceModule,
    ComplianceModule,
    EventsModule,
    CommonServicesModule,
    PublicModule,
    IdempotencyModule,
    TenantRateLimitModule,
    WebhooksModule,
    RlsModule,
    FeatureFlagsModule,
  ],
  exports: [
    OutboxModule,
    AuthModule,
    AuthorizationModule,
    ImportsModule,
    InternalModule,
    AppConfigModule,
    MonitoringModule,
    FhirModule,
    ContactModule,
    AIModule,
    AuditModule,
    PerformanceModule,
    ComplianceModule,
    EventsModule,
    CommonServicesModule,
    PublicModule,
    IdempotencyModule,
    TenantRateLimitModule,
    WebhooksModule,
    RlsModule,
    FeatureFlagsModule,
  ],
})
export class SharedModule {}

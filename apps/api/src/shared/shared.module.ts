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

/**
 * Every module SharedModule assembles is also re-exported as-is — it's the
 * single aggregation point the rest of the API imports to reach all of these
 * at once. `imports` and `exports` must therefore stay identical; declaring
 * the list once keeps that a structural guarantee instead of two arrays that
 * could silently drift apart.
 */
const SHARED_MODULES = [
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
];

@Module({
  imports: SHARED_MODULES,
  exports: SHARED_MODULES,
})
export class SharedModule {}

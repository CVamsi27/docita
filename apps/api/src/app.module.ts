import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './domains/patients/patients.module';
import { AppointmentsModule } from './domains/appointments/appointments.module';
import { AuthModule } from './shared/modules/auth/auth/auth.module';
import { PrescriptionsModule } from './domains/prescriptions/prescriptions.module';
import { BillingModule } from './domains/billing/billing.module';
import { ImportsModule } from './shared/modules/imports/imports.module';
import { ConfigModule } from '@nestjs/config';

import { DashboardModule } from './domains/dashboards/dashboard/dashboard.module';
import { DocumentsModule } from './domains/documents/documents.module';
import { CustomFieldsModule } from './domains/custom-fields/custom-fields.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { RemindersModule } from './domains/reminders/reminders.module';
import { ClinicsModule } from './domains/clinics/clinics.module';
import { DoctorClinicsModule } from './domains/doctor-clinics/doctor-clinics.module';
import { DoctorsModule } from './domains/doctors/doctors.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';

import { join } from 'path';
import { WhatsAppModule } from './domains/whatsapp/whatsapp.module';
import { SuperAdminModule } from './shared/modules/super-admin/super-admin.module';
import { SubscriptionsModule } from './domains/subscriptions/subscriptions.module';
import { PrescriptionTemplatesModule } from './domains/prescriptions/prescription-templates/prescription-templates.module';
import { ClinicalModule } from './domains/clinical/clinical.module';
import { AppConfigModule } from './shared/modules/config/config.module';
import { AppConfigService } from './shared/modules/config/app-configuration.service';
import { PaymentWebSocketGateway } from './gateways/payment.websocket.gateway';
import { FeedbackModule } from './domains/feedback/feedback.module';
import { MonitoringModule } from './shared/modules/monitoring/monitoring/monitoring.module';
import { CacheConfigModule } from './cache/cache.module';
import { FhirModule } from './shared/modules/fhir/fhir.module';
import { UsersModule } from './domains/users/users.module';
import { ContactModule } from './shared/modules/contact/contact.module';
import { AIModule } from './shared/modules/ai/ai.module';
import { AuditModule } from './shared/modules/audit/audit/audit.module';
import { PerformanceModule } from './shared/modules/performance/performance.module';
import { ComplianceModule } from './shared/modules/compliance/compliance.module';
import { TenantContextInterceptor } from './shared/modules/interceptors/tenant-context.interceptor';
import { CacheInterceptor } from './shared/modules/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from './shared/modules/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from './shared/modules/interceptors/emergency-access.interceptor';
import { RequestIdInterceptor } from './shared/modules/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from './shared/modules/interceptors/request-context.interceptor';
import { JwtAuthGuard } from './shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from './shared/modules/auth/auth/roles.guard';
import { CsrfInterceptor } from './shared/modules/interceptors/csrf.interceptor';
import { RateLimitInterceptor } from './shared/modules/interceptors/rate-limit.interceptor';
import { TimeoutInterceptor } from './shared/modules/interceptors/timeout.interceptor';

import { EventsModule } from './common/events/events.module';
import { CommonServicesModule } from './shared/modules/services/common-services.module';
import { MockBullModule } from './common/mocks/mock-bull.module';

const BullModule = MockBullModule;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    AppConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        pinoHttp: {
          level: configService.isProduction() ? 'info' : 'debug',
          transport: !configService.isProduction()
            ? { target: 'pino-pretty' }
            : undefined,
          autoLogging: false,
          serializers: {
            req: (req: any) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
          },
        },
      }),
    }),
    PrometheusModule.register({
      path: '/metrics',
    }),
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: 10,
          },
          {
            name: 'medium',
            ttl: 60000,
            limit: 100,
          },
          {
            name: 'long',
            ttl: 3600000,
            limit: 1000,
          },
        ],
        skipIf: () => config.getEnvironment() === 'test',
      }),
    }),
    // Extensibility Infrastructure (must be early in the import list)
    EventsModule,
    CommonServicesModule,
    CacheConfigModule,
    BullModule.forRootAsync(),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    MonitoringModule,
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    PrescriptionsModule,
    ImportsModule,
    DashboardModule,
    DocumentsModule,
    CustomFieldsModule,
    AnalyticsModule,
    RemindersModule,
    ClinicsModule,
    DoctorClinicsModule,
    DoctorsModule,
    WhatsAppModule,
    SuperAdminModule,
    SubscriptionsModule,
    BillingModule,
    PrescriptionTemplatesModule,
    ClinicalModule,
    AppConfigModule,
    FeedbackModule,
    FhirModule,
    UsersModule,
    ContactModule,
    AIModule,
    AuditModule,
    PerformanceModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global CSRF Protection
    {
      provide: APP_INTERCEPTOR,
      useClass: CsrfInterceptor,
    },
    // Global Request Tracing
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
    // Global Request Context (Correlation ID) - for Sentry integration
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    // Global Tenant Context Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    // Global Cache Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    // Global Rate Limit Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    // Global Timeout Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    // Global Patient Audit Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: PatientDataAuditInterceptor,
    },
    // Global Break-the-Glass Interceptor (Emergency Access)
    {
      provide: APP_INTERCEPTOR,
      useClass: BreakTheGlassInterceptor,
    },
    // Per-endpoint Rate Limiting (works with @RateLimit() decorator)
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
  exports: [],
})
export class AppModule {}

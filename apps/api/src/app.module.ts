import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './domains/patients/patients.module';
import { AppointmentsModule } from './domains/appointments/appointments.module';
import { AuthModule } from './shared/modules/auth/auth/auth.module';
import { PrescriptionsModule } from './domains/prescriptions/prescriptions.module';
import { BillingModule } from './domains/billing/billing.module';
import { PaymentsModule } from './domains/payments/payments.module';
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
import { ConfigModule as PublicConfigModule } from './modules/config/config.module';
import { AppConfigService } from './shared/modules/config/app-configuration.service';
import { GatewaysModule } from './gateways/gateways.module';
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
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from './shared/modules/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from './shared/modules/interceptors/emergency-access.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { JwtAuthGuard } from './shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from './shared/modules/auth/auth/roles.guard';
import { SubscriptionStatusGuard } from './shared/modules/auth/guards/subscription-status.guard';
import { PasswordExpiredGuard } from './shared/modules/auth/guards/password-expired.guard';
import { EmailVerifiedGuard } from './shared/modules/auth/guards/email-verified.guard';
import { UserRateLimitGuard } from './shared/modules/auth/guards/user-rate-limit.guard';
import { CsrfInterceptor } from './shared/modules/interceptors/csrf.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { TimeoutInterceptor } from './shared/modules/interceptors/timeout.interceptor';

import { EventsModule } from './common/events/events.module';
import { CommonServicesModule } from './shared/modules/services/common-services.module';
import { MockBullModule } from './common/mocks/mock-bull.module';
import { FeedbackModule } from './domains/feedback/feedback.module';
import { PatientPortalModule } from './domains/patient-portal/patient-portal.module';
import { PublicModule } from './shared/modules/public/public.module';
import { MedicalDocumentsModule } from './domains/medical-documents/medical-documents.module';
import { InventoryModule } from './domains/inventory/inventory.module';
import { LeaveModule } from './domains/leave/leave.module';

const BullModule = MockBullModule;

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    AppConfigModule,
    PublicConfigModule,
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
            req: (req: Record<string, unknown>) => ({
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

    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: config.isProduction() ? 10 : 100,
          },
          {
            name: 'medium',
            ttl: 60000,
            limit: config.isProduction() ? 100 : 1000,
          },
          {
            name: 'long',
            ttl: 3600000,
            limit: config.isProduction() ? 1000 : 10000,
          },
        ],
        skipIf: () => config.getEnvironment() === 'test',
      }),
    }),

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
    PaymentsModule,
    SubscriptionsModule,
    BillingModule,
    PrescriptionTemplatesModule,
    ClinicalModule,
    FeedbackModule,
    FhirModule,
    UsersModule,
    ContactModule,
    AIModule,
    AuditModule,
    PerformanceModule,
    ComplianceModule,
    GatewaysModule,
    PatientPortalModule,
    PublicModule,
    MedicalDocumentsModule,
    InventoryModule,
    LeaveModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

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
    {
      provide: APP_GUARD,
      useClass: SubscriptionStatusGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PasswordExpiredGuard,
    },
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserRateLimitGuard,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: CsrfInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: PatientDataAuditInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: BreakTheGlassInterceptor,
    },
  ],
  exports: [GatewaysModule],
})
export class AppModule {}

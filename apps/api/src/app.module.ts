import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { PatientsModule } from './domains/patients/patients.module';
import { AppointmentsModule } from './domains/appointments/appointments.module';
import { PrescriptionsModule } from './domains/prescriptions/prescriptions.module';
import { BillingModule } from './domains/billing/billing.module';
import { InsuranceClaimsModule } from './domains/insurance-claims/insurance-claims.module';
import { PaymentsModule } from './domains/payments/payments.module';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from './domains/dashboards/dashboard/dashboard.module';
import { DocumentsModule } from './domains/documents/documents.module';
import { CustomFieldsModule } from './domains/custom-fields/custom-fields.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { RemindersModule } from './domains/reminders/reminders.module';
import { ClinicsModule } from './domains/clinics/clinics.module';
import { ClinicsOnboardingModule } from './domains/clinics/clinics-onboarding.module';
import { ClinicsSettingsModule } from './domains/clinics/clinics-settings.module';
import { ClinicsStaffModule } from './domains/clinics/clinics-staff.module';
import { DoctorClinicsModule } from './domains/doctor-clinics/doctor-clinics.module';
import { DoctorsModule } from './domains/doctors/doctors.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { WhatsAppModule } from './domains/whatsapp/whatsapp.module';
import { SubscriptionsModule } from './domains/subscriptions/subscriptions.module';
import { EnterpriseContractsModule } from './domains/enterprise-contracts/enterprise-contracts.module';
import { PrescriptionTemplatesModule } from './domains/prescriptions/prescription-templates/prescription-templates.module';
import { ClinicalModule } from './domains/clinical/clinical.module';
import { AppConfigModule } from './shared/modules/config/config.module';
import { ConfigModule as PublicConfigModule } from './modules/config/config.module';
import { AppConfigService } from './shared/modules/config/app-configuration.service';
import { WebsocketsModule } from './websockets/websockets.module';
import { CacheConfigModule } from './cache/cache.module';
import { UsersModule } from './domains/users/users.module';
import { FeedbackModule } from './domains/feedback/feedback.module';
import { PatientPortalModule } from './domains/patient-portal/patient-portal.module';
import { LabPortalModule } from './domains/lab-portal/lab-portal.module';
import { MedicalDocumentsModule } from './domains/medical-documents/medical-documents.module';
import { InventoryModule } from './domains/inventory/inventory.module';
import { LeaveModule } from './domains/leave/leave.module';
import { IpdModule } from './domains/ipd/ipd.module';
import { PublicBookingModule } from './domains/public-booking/public-booking.module';
import { TenantContextInterceptor } from './shared/common/interceptors/tenant-context.interceptor';
import { CacheInterceptor } from './shared/common/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from './shared/common/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from './shared/common/interceptors/emergency-access.interceptor';
import { PrismaRetryInterceptor } from './shared/common/interceptors/prisma-retry.interceptor';
import { RequestIdInterceptor } from './shared/common/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from './shared/common/interceptors/request-context.interceptor';
import { JwtAuthGuard } from './shared/modules/auth/auth/jwt-auth.guard';
import { StaffJwtAudienceGuard } from './shared/modules/auth/guards/staff-jwt-audience.guard';
import { RolesGuard } from './shared/modules/auth/auth/roles.guard';
import { TenantGuard } from './shared/modules/auth/guards/tenant.guard';
import { SubscriptionStatusGuard } from './shared/modules/auth/guards/subscription-status.guard';
import { PasswordExpiredGuard } from './shared/modules/auth/guards/password-expired.guard';
import { EmailVerifiedGuard } from './shared/modules/auth/guards/email-verified.guard';
import { UserRateLimitGuard } from './shared/modules/auth/guards/user-rate-limit.guard';
import { E2EThrottlerGuard } from './shared/modules/auth/guards/e2e-throttler.guard';
import { CsrfInterceptor } from './shared/common/interceptors/csrf.interceptor';
import { RateLimitInterceptor } from './shared/common/interceptors/rate-limit.interceptor';
import { TimeoutInterceptor } from './shared/common/interceptors/timeout.interceptor';
import { buildPinoOptions } from './shared/modules/observability/pino-options.factory';
import { IdempotencyInterceptor } from './shared/modules/idempotency';
import { TenantRateLimitGuard } from './shared/modules/tenant-rate-limit';
import { getClientIp } from '@/shared/common/http/client-ip';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    AppConfigModule,
    // jscpd:ignore-start
    PublicConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        pinoHttp: buildPinoOptions({
          isProduction: configService.isProduction(),
          isTest: configService.isTest(),
        }),
      }),
    }),
    PrometheusModule.register({
      // jscpd:ignore-end
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
        getTracker: (req) => getClientIp(req),
        skipIf: () => config.getEnvironment() === 'test',
      }),
    }),

    CacheConfigModule,
    SharedModule,
    ...(process.env.NODE_ENV === 'production'
      ? []
      : [
          ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
          }),
        ]),
    PrismaModule,
    PatientsModule,
    AppointmentsModule,
    PrescriptionsModule,
    DashboardModule,
    DocumentsModule,
    CustomFieldsModule,
    AnalyticsModule,
    RemindersModule,
    ClinicsModule,
    ClinicsOnboardingModule,
    ClinicsSettingsModule,
    ClinicsStaffModule,
    DoctorClinicsModule,
    DoctorsModule,
    WhatsAppModule,
    PaymentsModule,
    SubscriptionsModule,
    EnterpriseContractsModule,
    BillingModule,
    InsuranceClaimsModule,
    PrescriptionTemplatesModule,
    ClinicalModule,
    FeedbackModule,
    UsersModule,
    WebsocketsModule,
    PatientPortalModule,
    LabPortalModule,
    MedicalDocumentsModule,
    InventoryModule,
    LeaveModule,
    IpdModule,
    PublicBookingModule,
  ],
  controllers: [AppController],
  providers: [
    // Global pipeline order (first registered runs first on inbound request):
    // Guards: throttle → JWT → tenant → tenant rate limit → roles → subscription →
    // password expiry → email verified → user rate limit.
    // Interceptors: CSRF → request id → request context → tenant context → cache →
    // rate limit → timeout → patient PHI write audit → break-the-glass.
    {
      provide: APP_GUARD,
      useClass: E2EThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: StaffJwtAudienceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantRateLimitGuard,
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
      useClass: IdempotencyInterceptor,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: PrismaRetryInterceptor,
    },
  ],
  exports: [WebsocketsModule],
})
export class AppModule {}

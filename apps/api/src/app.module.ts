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
import { InvoicesModule } from './domains/invoices/invoices.module';
// import { DocumentsModule } from './domains/documents/documents.module'; // TODO: Create documents module
import { ImportsModule } from './shared/modules/imports/imports.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DashboardModule } from './domains/dashboards/dashboard/dashboard.module';
import { UploadsModule } from './domains/documents/uploads/uploads.module';
import { TemplatesModule } from './domains/documents/templates/templates.module';
import { CustomFieldsModule } from './domains/custom-fields/custom-fields.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { RemindersModule } from './domains/reminders/reminders.module';
import { ClinicsModule } from './domains/clinics/clinics.module';
import { DoctorClinicsModule } from './domains/doctor-clinics/doctor-clinics.module';
import { DoctorsModule } from './domains/doctors/doctors.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';

import { join } from 'path';
import { PaymentsModule } from './domains/payments/payments.module';
import { WhatsappModule } from './shared/modules/messaging/whatsapp/whatsapp.module';
import { SuperAdminModule } from './shared/modules/super-admin/super-admin.module';
import { SubscriptionModule } from './domains/subscription/subscription.module';
import { BillingModule } from './domains/billing/billing.module';
import { PrescriptionTemplatesModule } from './domains/prescriptions/prescription-templates/prescription-templates.module';
import { MedicalCodingModule } from './domains/clinical/medical-coding.module';
import { AppConfigModule } from './shared/modules/config/config.module';
import { PaymentWebSocketGateway } from './gateways/payment.websocket.gateway';
import { LabTestsModule } from './domains/clinical/lab-tests.module';
// import { InventoryModule } from './domains/inventory/inventory.module'; // TODO: Create inventory module
import { FeedbackModule } from './domains/feedback/feedback.module';
import { MonitoringModule } from './shared/modules/monitoring/monitoring/monitoring.module';
import { CacheConfigModule } from './cache/cache.module';
import { FhirModule } from './shared/modules/fhir/fhir.module';
import { UsersModule } from './domains/users/users.module';
import { ContactModule } from './shared/modules/contact/contact.module';
import { AIModule } from './shared/modules/ai/ai.module';
import { AuditModule } from './shared/modules/audit/audit/audit.module';
import { OnboardingModule } from './domains/onboarding/onboarding.module';
// import { IpdModule } from './domains/ipd/ipd.module'; // TODO: Create IPD module
// import { QueueModule } from './domains/queue/queue.module'; // TODO: Create queue module
import { PerformanceModule } from './shared/modules/performance/performance.module';
import { ComplianceModule } from './shared/modules/compliance/compliance.module';
import { PatientPortalModule } from './domains/patients/patient-portal/patient-portal.module';
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

// Extensibility Infrastructure
import { EventsModule } from './shared/modules/events';
import { CommonServicesModule } from './shared/modules/services';
import { MockBullModule } from './shared/modules/mocks/mock-bull.module';

const BullModule = MockBullModule;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        autoLogging: false, // We use our own interceptor or turn this on
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
        },
      },
    }),
    PrometheusModule.register({
      path: '/metrics',
    }),
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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
        skipIf: () => config.get('NODE_ENV') === 'test',
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
    InvoicesModule,
    // DocumentsModule, // TODO: Create documents module
    ImportsModule,
    DashboardModule,
    UploadsModule,
    TemplatesModule,
    CustomFieldsModule,
    AnalyticsModule,
    RemindersModule,
    ClinicsModule,
    DoctorClinicsModule,
    DoctorsModule,
    PaymentsModule,
    WhatsappModule,
    SuperAdminModule,
    SubscriptionModule,
    BillingModule,
    PrescriptionTemplatesModule,
    MedicalCodingModule,
    AppConfigModule,
    LabTestsModule,
    // InventoryModule, // TODO: Create inventory module
    FeedbackModule,
    FhirModule,
    UsersModule,
    ContactModule,
    AIModule,
    AuditModule,
    OnboardingModule,
    // IpdModule, // TODO: Create IPD module
    // QueueModule, // TODO: Create queue module
    PerformanceModule,
    ComplianceModule,
    PatientPortalModule,
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

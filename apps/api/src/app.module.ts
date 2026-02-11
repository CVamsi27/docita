import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ImportsModule } from './modules/imports/imports.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { DoctorClinicsModule } from './modules/doctor-clinics/doctor-clinics.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PaymentsModule } from './modules/payments/payments.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { BillingModule } from './modules/billing/billing.module';
import { PrescriptionTemplatesModule } from './modules/prescription-templates/prescription-templates.module';
import { MedicalCodingModule } from './modules/medical-coding/medical-coding.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { PaymentWebSocketGateway } from './gateways/payment.websocket.gateway';
import { LabTestsModule } from './modules/lab-tests/lab-tests.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { CacheConfigModule } from './cache/cache.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { UsersModule } from './modules/users/users.module';
import { ContactModule } from './modules/contact/contact.module';
import { AIModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { IpdModule } from './modules/ipd/ipd.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { PatientDataAuditInterceptor } from './common/interceptors/patient-audit.interceptor';
import { BreakTheGlassInterceptor } from './common/interceptors/emergency-access.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './modules/auth/roles.guard';
import { CsrfInterceptor } from './common/interceptors/csrf.interceptor';

// Extensibility Infrastructure
import { EventsModule } from './common/events';
import { CommonServicesModule } from './common/services';

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('REDIS_URL') || 'redis://localhost:6379',
      }),
      inject: [ConfigService],
    }),
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
    DocumentsModule,
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
    InventoryModule,
    FeedbackModule,
    FhirModule,
    UsersModule,
    ContactModule,
    AIModule,
    AuditModule,
    OnboardingModule,
    IpdModule,
    PerformanceModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
  ],
  exports: [],
})
export class AppModule {}

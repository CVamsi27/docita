import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DocumentsModule } from './documents/documents.module';
import { ImportsModule } from './imports/imports.module';
import { ConfigModule } from '@nestjs/config';

import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { TemplatesModule } from './templates/templates.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RemindersModule } from './reminders/reminders.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorClinicsModule } from './doctor-clinics/doctor-clinics.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PaymentsModule } from './modules/payments/payments.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { BillingModule } from './modules/billing/billing.module';
import { PrescriptionTemplatesModule } from './prescription-templates/prescription-templates.module';
import { MedicalCodingModule } from './medical-coding/medical-coding.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { PaymentGateway } from './gateways/payment.gateway';
import { QueueModule } from './queue/queue.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { InventoryModule } from './inventory/inventory.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CacheConfigModule } from './cache/cache.module';
import { FhirModule } from './fhir/fhir.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    CacheConfigModule,
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
    QueueModule,
    LabTestsModule,
    InventoryModule,
    FeedbackModule,
    FhirModule,
  ],
  controllers: [AppController],
  providers: [AppService, PaymentGateway],
})
export class AppModule { }

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EventsModule } from '@/shared/common/events/events.module';
import { CacheConfigModule } from '@/cache/cache.module';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { DocumentsWorkerModule } from '@/domains/documents/documents.worker.module';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { PrescriptionsWorkerModule } from '@/domains/prescriptions/prescriptions.worker.module';
import { ClinicalSchedulerModule } from '@/domains/clinical/clinical.scheduler.module';
import { RemindersSchedulerModule } from '@/domains/reminders/reminders.scheduler.module';
import { ComplianceSchedulerModule } from '@/shared/modules/compliance/compliance.scheduler.module';
import { MonitoringSchedulerModule } from '@/shared/modules/monitoring/monitoring/monitoring.scheduler.module';
import { SubscriptionsWorkerModule } from '@/domains/subscriptions/subscriptions.worker.module';
import { EnterpriseContractsWorkerModule } from '@/domains/enterprise-contracts/enterprise-contracts.worker.module';
import { DoctorsVerificationWorkerModule } from '@/domains/doctors/doctors-verification.worker.module';
import { WhatsappReconciliationWorkerModule } from '@/domains/whatsapp/whatsapp-reconciliation.worker.module';
import { WhatsappCampaignWorkerModule } from '@/domains/whatsapp/whatsapp-campaign.worker.module';
import { AdminAlertsSchedulerModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.scheduler.module';
import { EphemeralStoreSchedulerModule } from '@/shared/modules/ephemeral-store/ephemeral-store.scheduler.module';
import { OutboxModule } from '@/shared/modules/outbox/outbox.module';
import { CronHeartbeatModule } from '@/shared/modules/schedule/cron-heartbeat.module';
import { buildPinoOptions } from '@/shared/modules/observability/pino-options.factory';

const ENABLE_SCHEDULERS = process.env.ENABLE_SCHEDULERS !== 'false';

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
        pinoHttp: buildPinoOptions({
          isProduction: configService.isProduction(),
          isTest: configService.isTest(),
        }),
      }),
    }),
    CacheConfigModule,
    ...(ENABLE_SCHEDULERS ? [ScheduleModule.forRoot()] : []),
    EventsModule,
    PrismaWorkerModule,
    DocumentsWorkerModule,
    BillingWorkerModule,
    PrescriptionsWorkerModule,
    ClinicalSchedulerModule,
    RemindersSchedulerModule,
    ComplianceSchedulerModule,
    EphemeralStoreSchedulerModule,
    MonitoringSchedulerModule,
    AdminAlertsSchedulerModule,
    SubscriptionsWorkerModule,
    EnterpriseContractsWorkerModule,
    DoctorsVerificationWorkerModule,
    WhatsappReconciliationWorkerModule,
    WhatsappCampaignWorkerModule,
    OutboxModule,
    CronHeartbeatModule,
  ],
})
export class WorkerModule {}

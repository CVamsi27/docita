import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { DocumentsWorkerModule } from '@/domains/documents/documents.worker.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { WhatsAppWorkerModule } from '@/domains/whatsapp/whatsapp.worker.module';
import { NotificationsWorkerModule } from '@/shared/modules/messaging/notifications/notifications.worker.module';
import { QueueWorkerModule } from '@/shared/modules/queue/queue.worker.module';
import { BillingScheduledPaymentRemindersCron } from './application/cron/billing-scheduled-payment-reminders.cron';
import { BillingUsageAggregationCron } from './application/cron/billing-usage-aggregation.cron';
import {
  BILLING_SHARED_PROVIDERS,
  BILLING_SHARED_EXPORTS,
} from './billing-shared-module-config';

@Module({
  imports: [
    PrismaWorkerModule,
    DocumentsWorkerModule,
    PaymentsModule,
    WhatsAppWorkerModule,
    NotificationsWorkerModule,
    QueueWorkerModule,
  ],
  providers: [
    ...BILLING_SHARED_PROVIDERS,
    BillingScheduledPaymentRemindersCron,
    BillingUsageAggregationCron,
  ],
  exports: BILLING_SHARED_EXPORTS,
})
export class BillingWorkerModule {}

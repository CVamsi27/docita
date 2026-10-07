import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import {
  DeskController,
  InvoicesController,
  PaymentsController,
  WebhooksController,
} from './presentation/controllers';
import { PricingController } from './presentation/controllers/pricing.controller';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { WhatsAppModule } from '@/domains/whatsapp/whatsapp.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { NotificationsModule } from '@/shared/modules/messaging/notifications/notifications.module';
import { WebhooksModule } from '@/domains/webhooks/webhooks.module';
import { QueueModule } from '@/shared/modules/queue/queue.module';
import { InvoiceEventsListener } from './infrastructure/listeners/invoice-events.listener';
import {
  BILLING_SHARED_PROVIDERS,
  BILLING_SHARED_EXPORTS,
} from './billing-shared-module-config';

@Module({
  imports: [
    PrismaModule,
    DocumentsModule,
    PaymentsModule,
    WhatsAppModule,
    AuditModule,
    MessagingModule,
    NotificationsModule,
    WebhooksModule,
    QueueModule,
  ],
  controllers: [
    InvoicesController,
    DeskController,
    PaymentsController,
    WebhooksController,
    PricingController,
  ],
  providers: [
    ...BILLING_SHARED_PROVIDERS,
    InvoiceEventsListener,
  ],
  exports: BILLING_SHARED_EXPORTS,
})
export class BillingModule {}

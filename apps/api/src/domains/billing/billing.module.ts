import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import {
  PrismaTierPricingRepository,
  PrismaClaimValidationRepository,
} from './infrastructure/repositories';
import {
  DeskController,
  InvoicesController,
  PaymentsController,
  WebhooksController,
} from './presentation/controllers';
import { PricingController } from './presentation/controllers/pricing.controller';
import { TIER_PRICING_REPOSITORY_TOKEN } from './core/repositories/tier-pricing.repository';
import { CLAIM_VALIDATION_REPOSITORY_TOKEN } from './core/repositories/claim-validation.repository';
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
    {
      provide: TIER_PRICING_REPOSITORY_TOKEN,
      useClass: PrismaTierPricingRepository,
    },
    {
      provide: CLAIM_VALIDATION_REPOSITORY_TOKEN,
      useClass: PrismaClaimValidationRepository,
    },
    InvoiceEventsListener,
  ],
  exports: BILLING_SHARED_EXPORTS,
})
export class BillingModule {}

import { Module } from '@nestjs/common';
import {
  ResumeSubscriptionPaymentUseCase,
  SchedulePlanChangeUseCase,
} from './application/use-cases';
import {
  SUBSCRIPTIONS_COMMON_PROVIDERS,
  SUBSCRIPTIONS_COMMON_EXPORTS,
} from './subscriptions-common.providers';
import { SubscriptionsBillingQueryController } from './presentation/controllers/subscriptions-billing-query.controller';
import { SubscriptionsBillingMutationController } from './presentation/controllers/subscriptions-billing-mutation.controller';
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller';
import { SubscriptionsWebhookController } from './presentation/controllers/subscriptions-webhook.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { AdminAlertsModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.module';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    PaymentsModule,
    EmailModule,
    AdminAlertsModule,
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionsBillingQueryController,
    SubscriptionsBillingMutationController,
    SubscriptionsWebhookController,
  ],
  providers: [
    ...SUBSCRIPTIONS_COMMON_PROVIDERS,
    ResumeSubscriptionPaymentUseCase,
    SchedulePlanChangeUseCase,
  ],
  exports: [...SUBSCRIPTIONS_COMMON_EXPORTS, SchedulePlanChangeUseCase],
})
export class SubscriptionsModule {}

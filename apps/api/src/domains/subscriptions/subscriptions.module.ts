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
import { PartnerAuthController } from './presentation/controllers/partner-auth.controller';
import { PartnerPortalController } from './presentation/controllers/partner-portal.controller';
import { PartnerAuthGuard } from './presentation/guards/partner-auth.guard';
import { PartnerAuthService } from './application/services/partner-auth.service';
import { PartnerPortalService } from './application/services/partner-portal.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { AdminAlertsModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { CommonModule } from '@/shared/common/common.module';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    PaymentsModule,
    EmailModule,
    AdminAlertsModule,
    AuthModule,
    CommonModule,
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionsBillingQueryController,
    SubscriptionsBillingMutationController,
    SubscriptionsWebhookController,
    PartnerAuthController,
    PartnerPortalController,
  ],
  providers: [
    ...SUBSCRIPTIONS_COMMON_PROVIDERS,
    ResumeSubscriptionPaymentUseCase,
    SchedulePlanChangeUseCase,
    PartnerAuthService,
    PartnerPortalService,
    PartnerAuthGuard,
  ],
  exports: [...SUBSCRIPTIONS_COMMON_EXPORTS, SchedulePlanChangeUseCase],
})
export class SubscriptionsModule {}

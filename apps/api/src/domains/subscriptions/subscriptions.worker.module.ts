import { Module } from '@nestjs/common';
import {
  SubscriptionPricingService,
  ProratingService,
  SubscriptionValidationService,
  ReferralService,
} from './core/services';
import {
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
  ActivateSubscriptionUseCase,
  CreateCheckoutUseCase,
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  NotifyExpiringSubscriptionsUseCase,
} from './application/use-cases';
import { SubscriptionsQueryService } from './application/services/subscriptions-query.service';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  PAYMENT_GATEWAY_TOKEN,
  CLINIC_OPERATIONS_TOKEN,
} from './application/ports';
import { PrismaSubscriptionRepository } from './infrastructure/repositories';
import { PaymentGatewayFacade } from './infrastructure/adapters/payment-gateway-facade.adapter';
import { ClinicOperationsAdapter } from './infrastructure/adapters/clinic-operations.adapter';
import { SubscriptionReminderScheduler } from './infrastructure/schedulers/subscription-reminder.scheduler';
import { OverageBillingScheduler } from './infrastructure/schedulers/overage-billing.scheduler';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';

/**
 * Subscription use-cases and schedulers for the worker process only (no HTTP controllers).
 * Uses BillingWorkerModule instead of BillingModule to avoid duplicate billing providers.
 */
@Module({
  imports: [
    PrismaWorkerModule,
    BillingWorkerModule,
    PaymentsModule,
    EmailModule,
    CommonServicesModule,
  ],
  providers: [
    SubscriptionPricingService,
    ProratingService,
    SubscriptionValidationService,
    ReferralService,
    CreateSubscriptionUseCase,
    UpgradeSubscriptionUseCase,
    CancelSubscriptionUseCase,
    ActivateSubscriptionUseCase,
    CreateCheckoutUseCase,
    ExpireSubscriptionUseCase,
    EnterGracePeriodUseCase,
    ProcessWebhookUseCase,
    NotifyExpiringSubscriptionsUseCase,
    SubscriptionsQueryService,
    SubscriptionReminderScheduler,
    OverageBillingScheduler,
    {
      provide: SUBSCRIPTION_REPOSITORY_TOKEN,
      useClass: PrismaSubscriptionRepository,
    },
    {
      provide: PAYMENT_GATEWAY_TOKEN,
      useClass: PaymentGatewayFacade,
    },
    {
      provide: CLINIC_OPERATIONS_TOKEN,
      useClass: ClinicOperationsAdapter,
    },
  ],
})
export class SubscriptionsWorkerModule {}

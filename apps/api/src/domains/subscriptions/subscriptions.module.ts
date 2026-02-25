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
import { RazorpayGateway } from './infrastructure/gateways/razorpay.gateway';
import { ClinicOperationsAdapter } from './infrastructure/adapters/clinic-operations.adapter';
import { SubscriptionReminderScheduler } from './infrastructure/schedulers/subscription-reminder.scheduler';
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller';
import { SubscriptionsWebhookController } from './presentation/controllers/subscriptions-webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [SubscriptionsController, SubscriptionsWebhookController],
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
    {
      provide: SUBSCRIPTION_REPOSITORY_TOKEN,
      useClass: PrismaSubscriptionRepository,
    },
    {
      provide: PAYMENT_GATEWAY_TOKEN,
      useClass: RazorpayGateway,
    },
    {
      provide: CLINIC_OPERATIONS_TOKEN,
      useClass: ClinicOperationsAdapter,
    },
  ],
  exports: [
    SubscriptionPricingService,
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
    SubscriptionsQueryService,
  ],
})
export class SubscriptionsModule {}

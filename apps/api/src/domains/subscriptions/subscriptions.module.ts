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
  ApplyPlanChangeWithoutPaymentUseCase,
  CreateCheckoutUseCase,
  ResumeSubscriptionPaymentUseCase,
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  NotifyExpiringSubscriptionsUseCase,
  NotifySubscriptionGraceDeadlineUseCase,
  SchedulePlanChangeUseCase,
} from './application/use-cases';
import { SubscriptionsQueryService } from './application/services/subscriptions-query.service';
import { SubscriptionCheckoutPricingService } from './application/services/subscription-checkout-pricing.service';
import { SubscriptionActivationPolicyService } from './application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from './application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionPaymentService } from './application/services/activate-subscription-payment.service';
import { ActivateSubscriptionClinicSyncService } from './application/services/activate-subscription-clinic-sync.service';
import { razorpayWebhookHandlerProviders } from './application/webhooks/razorpay/razorpay-webhook-handler.registry';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  PAYMENT_GATEWAY_TOKEN,
  CLINIC_OPERATIONS_TOKEN,
} from './application/ports';
import {
  PrismaSubscriptionRepository,
  PrismaSubscriptionCoreRepository,
  PrismaSubscriptionPaymentRepository,
  SubscriptionPaymentTaxCalculator,
} from './infrastructure/repositories';
import { PaymentGatewayFacade } from './infrastructure/adapters/payment-gateway-facade.adapter';
import { ClinicOperationsAdapter } from './infrastructure/adapters/clinic-operations.adapter';
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
    SubscriptionPricingService,
    SubscriptionCheckoutPricingService,
    SubscriptionActivationPolicyService,
    SubscriptionBillingSnapshotService,
    ActivateSubscriptionPaymentService,
    ActivateSubscriptionClinicSyncService,
    ProratingService,
    SubscriptionValidationService,
    ReferralService,
    CreateSubscriptionUseCase,
    UpgradeSubscriptionUseCase,
    CancelSubscriptionUseCase,
    ActivateSubscriptionUseCase,
    ApplyPlanChangeWithoutPaymentUseCase,
    CreateCheckoutUseCase,
    ResumeSubscriptionPaymentUseCase,
    ExpireSubscriptionUseCase,
    EnterGracePeriodUseCase,
    ProcessWebhookUseCase,
    ...razorpayWebhookHandlerProviders,
    NotifyExpiringSubscriptionsUseCase,
    NotifySubscriptionGraceDeadlineUseCase,
    SchedulePlanChangeUseCase,
    SubscriptionsQueryService,
    SubscriptionPaymentTaxCalculator,
    PrismaSubscriptionCoreRepository,
    PrismaSubscriptionPaymentRepository,
    PrismaSubscriptionRepository,
    {
      provide: SUBSCRIPTION_REPOSITORY_TOKEN,
      useExisting: PrismaSubscriptionRepository,
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
    SchedulePlanChangeUseCase,
    SubscriptionsQueryService,
    PAYMENT_GATEWAY_TOKEN,
    SUBSCRIPTION_REPOSITORY_TOKEN,
  ],
})
export class SubscriptionsModule {}

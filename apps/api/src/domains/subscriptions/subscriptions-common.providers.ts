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
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  NotifyExpiringSubscriptionsUseCase,
  NotifySubscriptionGraceDeadlineUseCase,
} from './application/use-cases';
import { SubscriptionsQueryService } from './application/services/subscriptions-query.service';
import { SubscriptionCheckoutPricingService } from './application/services/subscription-checkout-pricing.service';
import { CheckoutPaymentOrderService } from './application/services/checkout-payment-order.service';
import { SubscriptionActivationPolicyService } from './application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from './application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionPaymentService } from './application/services/activate-subscription-payment.service';
import { ReferralPayoutService } from './application/services/referral-payout.service';
import { ReferralAccrualService } from './application/services/referral-accrual.service';
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

export const SUBSCRIPTIONS_COMMON_PROVIDERS = [
  SubscriptionPricingService,
  SubscriptionCheckoutPricingService,
  CheckoutPaymentOrderService,
  SubscriptionActivationPolicyService,
  SubscriptionBillingSnapshotService,
  ActivateSubscriptionPaymentService,
  ActivateSubscriptionClinicSyncService,
  ProratingService,
  SubscriptionValidationService,
  ReferralService,
  ReferralPayoutService,
  ReferralAccrualService,
  CreateSubscriptionUseCase,
  UpgradeSubscriptionUseCase,
  CancelSubscriptionUseCase,
  ActivateSubscriptionUseCase,
  ApplyPlanChangeWithoutPaymentUseCase,
  CreateCheckoutUseCase,
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  ...razorpayWebhookHandlerProviders,
  NotifyExpiringSubscriptionsUseCase,
  NotifySubscriptionGraceDeadlineUseCase,
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
] as const;

export const SUBSCRIPTIONS_COMMON_EXPORTS = [
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
  PAYMENT_GATEWAY_TOKEN,
  SUBSCRIPTION_REPOSITORY_TOKEN,
] as const;

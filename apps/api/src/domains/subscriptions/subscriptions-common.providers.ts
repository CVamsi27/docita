import {
  SubscriptionPricingService,
  ProratingService,
  SubscriptionValidationService,
  ReferralService,
  ReferralFirstPaymentCreditService,
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
import { ReferralCodeResolverService } from './core/services/referral-code-resolver.service';
import { PartnerShowcasePdfService } from './application/services/partner-showcase-pdf.service';
import { PartnerTemplateService } from './application/services/partner-template.service';
import { ReferrerWelcomeService } from './core/services/referrer-welcome.service';
import { PartnerAuthService } from './core/services/partner-auth.service';
import { ReferrerCodeBackfillService } from './core/services/referrer-code-backfill.service';
import { REFERRAL_PAYOUT_REPOSITORY_TOKEN } from './application/ports/referral-payout.repository.port';
import { PrismaReferralPayoutRepository } from './infrastructure/repositories/prisma-referral-payout.repository';
import {
  PARTNER_PERSISTENCE_PORT,
} from './application/ports/partner-persistence.port';
import { PrismaService } from '@/prisma/prisma.service';
import { ActivateSubscriptionClinicSyncService } from './application/services/activate-subscription-clinic-sync.service';
import { ActivateSubscriptionPricingResolver } from './application/services/activate-subscription-pricing.resolver';
import { razorpayWebhookHandlerProviders } from './application/webhooks/razorpay/razorpay-webhook-handler.registry';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  PAYMENT_GATEWAY_TOKEN,
  CLINIC_OPERATIONS_TOKEN,
} from './application/ports';
import {
  withAdvisoryLock,
  WITH_ADVISORY_LOCK_TOKEN,
} from '@/shared/common/utils/postgres-advisory-lock';
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
  ActivateSubscriptionPricingResolver,
  ProratingService,
  SubscriptionValidationService,
  ReferralService,
  ReferralFirstPaymentCreditService,
  ReferralPayoutService,
  ReferralAccrualService,
  ReferralCodeResolverService,
  PartnerShowcasePdfService,
  PartnerTemplateService,
  ReferrerWelcomeService,
  PartnerAuthService,
  ReferrerCodeBackfillService,
  {
    provide: REFERRAL_PAYOUT_REPOSITORY_TOKEN,
    useClass: PrismaReferralPayoutRepository,
  },
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
  {
    provide: WITH_ADVISORY_LOCK_TOKEN,
    useValue: withAdvisoryLock,
  },
  {
    provide: PARTNER_PERSISTENCE_PORT,
    useExisting: PrismaService,
  },
] as const;

export const SUBSCRIPTIONS_COMMON_EXPORTS = [
  SubscriptionPricingService,
  SubscriptionValidationService,
  ReferralService,
  ReferralCodeResolverService,
  ReferrerWelcomeService,
  PartnerAuthService,
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

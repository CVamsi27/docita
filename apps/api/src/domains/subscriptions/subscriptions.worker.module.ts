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
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  NotifyExpiringSubscriptionsUseCase,
  NotifySubscriptionGraceDeadlineUseCase,
  BillMonthlyOveragesUseCase,
  NotifyUsageThresholdsUseCase,
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
import { SubscriptionReminderScheduler } from './infrastructure/schedulers/subscription-reminder.scheduler';
import { OverageInvoiceComposer } from './infrastructure/schedulers/overage-invoice.composer';
import { SubscriptionOverageMeterService } from './application/services/subscription-overage-meter.service';
import { SubscriptionOveragePaymentService } from './application/services/subscription-overage-payment.service';
import { OverageBillingScheduler } from './infrastructure/schedulers/overage-billing.scheduler';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
import { SUBSCRIPTION_PERSISTENCE_PORT } from './application/ports/subscription-persistence.port';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { AdminAlertsModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.module';

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
    AdminAlertsModule,
    CommonServicesModule,
  ],
  providers: [
    { provide: SUBSCRIPTION_PERSISTENCE_PORT, useExisting: PrismaService },
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
    ExpireSubscriptionUseCase,
    EnterGracePeriodUseCase,
    ProcessWebhookUseCase,
    ...razorpayWebhookHandlerProviders,
    NotifyExpiringSubscriptionsUseCase,
    NotifySubscriptionGraceDeadlineUseCase,
    SubscriptionsQueryService,
    SubscriptionReminderScheduler,
    OverageInvoiceComposer,
    SubscriptionOveragePaymentService,
    SubscriptionOverageMeterService,
    BillMonthlyOveragesUseCase,
    NotifyUsageThresholdsUseCase,
    OverageBillingScheduler,
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
})
export class SubscriptionsWorkerModule {}

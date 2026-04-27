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
  ResumeSubscriptionPaymentUseCase,
  ExpireSubscriptionUseCase,
  EnterGracePeriodUseCase,
  ProcessWebhookUseCase,
  NotifyExpiringSubscriptionsUseCase,
} from './application/use-cases';
import { SubscriptionsQueryService } from './application/services/subscriptions-query.service';
import { SubscriptionPaymentPdfService } from './application/services/subscription-payment-pdf.service';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  PAYMENT_GATEWAY_TOKEN,
  CLINIC_OPERATIONS_TOKEN,
} from './application/ports';
import { PrismaSubscriptionRepository } from './infrastructure/repositories';
import { PaymentGatewayFacade } from './infrastructure/adapters/payment-gateway-facade.adapter';
import { ClinicOperationsAdapter } from './infrastructure/adapters/clinic-operations.adapter';
import { SubscriptionsController } from './presentation/controllers/subscriptions.controller';
import { SubscriptionsWebhookController } from './presentation/controllers/subscriptions-webhook.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';

@Module({
  imports: [PrismaModule, BillingModule, PaymentsModule, EmailModule],
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
    ResumeSubscriptionPaymentUseCase,
    ExpireSubscriptionUseCase,
    EnterGracePeriodUseCase,
    ProcessWebhookUseCase,
    NotifyExpiringSubscriptionsUseCase,
    SubscriptionsQueryService,
    SubscriptionPaymentPdfService,
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
    PAYMENT_GATEWAY_TOKEN,
  ],
})
export class SubscriptionsModule {}

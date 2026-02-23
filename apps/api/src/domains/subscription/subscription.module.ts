import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionBillingService } from './subscription-billing.service';
import { SubscriptionWebhooksController } from './subscription-webhooks.controller';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import { SubscriptionReminderScheduler } from './subscription-reminder.scheduler';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { RazorpaySubscriptionGateway } from '../../gateways/razorpay-subscription.gateway';
import { ReferralsModule } from '../referrals';
import { PaymentsModule } from '../payments/payments.module';

// Import new specialized services
import { BillingCalculationService } from './billing-calculation.service';
import { SubscriptionCheckoutService } from './subscription-checkout.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { ReferralService } from './referral.service';
import { BillingHistoryService } from './billing-history.service';
import { ProrationService } from './proration.service';
import { WebhookErrorHandlingService } from '../webhooks/webhooks/webhook-error-handling.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ReferralsModule,
    PaymentsModule,
  ],
  controllers: [SubscriptionController, SubscriptionWebhooksController],
  providers: [
    // Specialized domain services
    BillingCalculationService,
    SubscriptionCheckoutService,
    SubscriptionLifecycleService,
    ReferralService,
    BillingHistoryService,
    ProrationService,
    // Facade service that orchestrates the specialized services
    SubscriptionBillingService,
    // Other services
    SubscriptionService,
    SubscriptionWebhookService,
    SubscriptionReminderScheduler,
    PaymentGatewayFactory,
    RazorpaySubscriptionGateway,
    WebhookErrorHandlingService,
    // PaymentWebSocketGateway is provided and exported by PaymentsModule
  ],
  exports: [SubscriptionService, SubscriptionBillingService],
})
export class SubscriptionModule {}

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
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), ReferralsModule],
  controllers: [SubscriptionController, SubscriptionWebhooksController],
  providers: [
    SubscriptionService,
    SubscriptionBillingService,
    SubscriptionWebhookService,
    SubscriptionReminderScheduler,
    PaymentGatewayFactory,
    RazorpaySubscriptionGateway,
    PaymentWebSocketGateway,
  ],
  exports: [SubscriptionService, SubscriptionBillingService],
})
export class SubscriptionModule {}

import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bull';
import { MockBullModule as BullModule } from '../../common/mocks/mock-bull.module';
import { PaymentsService } from './payments.service';
import { PaymentRetryService } from './payment-retry.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappModule } from '../../shared/modules/messaging/whatsapp/whatsapp.module';
import { AuditModule } from '../../shared/modules/audit/audit/audit.module';
import { NotificationsModule } from '../../shared/modules/messaging/notifications';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { PaymentReminderSchedulerService } from './payment-reminder-scheduler.service';

import { RazorpayPaymentProvider } from './providers/razorpay.provider';
import { AuthModule } from '../../shared/modules/auth/auth/auth.module';
import { WebhookErrorHandlingService } from '../webhooks/webhooks/webhook-error-handling.service';

@Module({
  imports: [
    AuthModule,
    WhatsappModule,
    AuditModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'payment-retry',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
      },
    }),
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    PaymentsService,
    PaymentRetryService,
    PaymentReminderSchedulerService,
    PrismaService,
    PaymentWebSocketGateway,
    WebhookErrorHandlingService,
    {
      provide: 'IPaymentProvider',
      useClass: RazorpayPaymentProvider,
    },
  ],
  exports: [PaymentsService, PaymentRetryService, PaymentWebSocketGateway],
})
export class PaymentsModule {}

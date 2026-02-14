import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bull';
import { MockBullModule as BullModule } from '../../common/mocks/mock-bull.module';
import { PaymentsService } from './payments.service';
import { PaymentRetryService } from './payment-retry.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';

import { RazorpayPaymentProvider } from './providers/razorpay.provider';
import { AuthModule } from '../auth/auth.module';
import { WebhookErrorHandlingService } from '../webhooks/webhook-error-handling.service';

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

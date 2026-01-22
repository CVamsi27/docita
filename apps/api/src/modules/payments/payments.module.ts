import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
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

@Module({
  imports: [
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
    {
      provide: 'IPaymentProvider',
      useClass: RazorpayPaymentProvider,
    },
  ],
  exports: [PaymentsService, PaymentRetryService],
})
export class PaymentsModule {}

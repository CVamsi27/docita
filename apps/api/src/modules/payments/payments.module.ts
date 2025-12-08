import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsService } from './payments.service';
import { PaymentRetryService } from './payment-retry.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentGateway } from '../../gateways/payment.gateway';

@Module({
  imports: [
    WhatsappModule,
    AuditModule,
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
    PaymentGateway,
  ],
  exports: [PaymentsService, PaymentRetryService],
})
export class PaymentsModule {}

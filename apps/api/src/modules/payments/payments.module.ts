import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PaymentGateway } from '../../gateways/payment.gateway';

@Module({
  imports: [WhatsappModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, PrismaService, PaymentGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}

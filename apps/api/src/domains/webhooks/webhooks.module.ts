import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WebhookErrorHandlingService } from './application/services/webhook-error-handling.service';
import { WEBHOOK_EVENT_REPOSITORY_TOKEN } from './application/ports/webhook-event.repository.port';
import { PrismaWebhookEventRepository } from './infrastructure/repositories/prisma-webhook-event.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    WebhookErrorHandlingService,
    {
      provide: WEBHOOK_EVENT_REPOSITORY_TOKEN,
      useClass: PrismaWebhookEventRepository,
    },
  ],
  exports: [WebhookErrorHandlingService],
})
export class WebhooksModule {}

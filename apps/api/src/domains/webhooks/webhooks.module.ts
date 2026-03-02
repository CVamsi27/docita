import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WebhookErrorHandlingService } from './application/services/webhook-error-handling.service';

@Module({
  imports: [PrismaModule],
  providers: [WebhookErrorHandlingService],
  exports: [WebhookErrorHandlingService],
})
export class WebhooksModule {}

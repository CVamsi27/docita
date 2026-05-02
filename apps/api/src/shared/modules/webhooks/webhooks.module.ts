import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WebhookReplayDedupeRepository } from '@/shared/modules/webhooks/webhook-replay-dedupe.repository';
import { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [WebhookReplayDedupeRepository, WebhookVerifierService],
  exports: [WebhookVerifierService],
})
export class WebhooksModule {}

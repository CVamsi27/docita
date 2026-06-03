import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WebhookReplayDedupeRepository } from '@/shared/modules/webhooks/webhook-replay-dedupe.repository';
import { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';
import { OutgoingWebhookRepository } from '@/shared/modules/webhooks/outgoing/outgoing-webhook.repository';
import { OutgoingWebhookService } from '@/shared/modules/webhooks/outgoing/outgoing-webhook.service';
import { OutgoingWebhookModule } from '@/shared/modules/webhooks/outgoing/outgoing-webhook.module';

@Global()
@Module({
  imports: [PrismaModule, OutgoingWebhookModule],
  providers: [
    WebhookReplayDedupeRepository,
    WebhookVerifierService,
    OutgoingWebhookRepository,
    OutgoingWebhookService,
  ],
  exports: [WebhookVerifierService, OutgoingWebhookService],
})
export class WebhooksModule {}

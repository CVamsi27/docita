import { Global, Module } from '@nestjs/common';
import { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';

@Global()
@Module({
  providers: [WebhookVerifierService],
  exports: [WebhookVerifierService],
})
export class WebhooksModule {}

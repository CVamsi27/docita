import { Injectable } from '@nestjs/common';
import { WhatsAppWebhookPayload } from '@workspace/types';
import { WhatsAppWebhookIngressService } from '@/domains/whatsapp/application/services/whatsapp-webhook-ingress.service';

interface WebhookRequest {
  payload: WhatsAppWebhookPayload;
}

@Injectable()
export class HandleWebhookUseCase {
  constructor(private readonly ingress: WhatsAppWebhookIngressService) {}

  async execute(request: WebhookRequest): Promise<void> {
    const { payload } = request;

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (value.messages?.length) {
          await this.ingress.processIncomingMessages(value);
        }
        if (value.statuses?.length) {
          await this.ingress.processStatusUpdates(value);
        }
      }
    }
  }
}

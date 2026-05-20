import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppWebhookIngressService } from '@/domains/whatsapp/application/services/whatsapp-webhook-ingress.service';
import { WhatsappClientService } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.service';
import { verifyMetaWebhookSignature } from '@/shared/whatsapp/meta-webhook-signature.util';
import { WhatsAppWebhookPayload } from '@workspace/types';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly whatsappClient: WhatsappClientService,
    private readonly ingress: WhatsAppWebhookIngressService,
  ) {}

  validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return verifyMetaWebhookSignature(
      rawBody,
      signature,
      this.whatsappClient.AppSecret,
    );
  }

  getVerifyToken(): string {
    return this.whatsappClient.VerifyToken;
  }

  async processIncomingMessages(
    value: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  ): Promise<void> {
    return this.ingress.processIncomingMessages(value);
  }

  async processStatusUpdates(
    value: WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'],
  ): Promise<void> {
    return this.ingress.processStatusUpdates(value);
  }
}

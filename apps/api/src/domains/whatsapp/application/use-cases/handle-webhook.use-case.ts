import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { WhatsAppMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import { WhatsAppWebhookPayload } from '@workspace/types';

export interface WebhookRequest {
  payload: WhatsAppWebhookPayload;
}

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
  ) {}

  async execute(request: WebhookRequest): Promise<void> {
    const { payload } = request;

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const statuses = value.statuses || [];

        for (const statusObj of statuses) {
          const externalId = statusObj.id;
          const status = statusObj.status;

          await this.processStatusUpdate(externalId, status, statusObj.errors);
        }
      }
    }
  }

  private async processStatusUpdate(
    externalId: string,
    status: string,
    errors?: Array<Record<string, unknown>>,
  ): Promise<void> {
    const message = await this.repository.findMessageByExternalId(externalId);
    if (!message) {
      this.logger.warn(`Message with external ID ${externalId} not found`);
      return;
    }

    let domainStatus: WhatsAppMessageStatus;
    switch (status) {
      case 'sent':
        domainStatus = WhatsAppMessageStatus.SENT;
        break;
      case 'delivered':
        domainStatus = WhatsAppMessageStatus.DELIVERED;
        break;
      case 'read':
        domainStatus = WhatsAppMessageStatus.READ;
        break;
      case 'failed':
        domainStatus = WhatsAppMessageStatus.FAILED;
        break;
      default:
        return;
    }

    if (
      domainStatus === WhatsAppMessageStatus.FAILED &&
      errors &&
      errors.length > 0
    ) {
      const error = errors[0];
      message.setError(
        String(error.code),
        typeof error.message === 'string' ? error.message : 'Unknown error',
      );
    } else {
      message.updateStatus(domainStatus);
    }

    await this.repository.saveMessage(message);
    this.logger.log(`Updated message ${message.id} status to ${domainStatus}`);
  }
}

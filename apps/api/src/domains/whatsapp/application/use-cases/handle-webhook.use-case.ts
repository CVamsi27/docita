import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '../ports/whatsapp.repository.port';
import { WhatsAppMessageStatus } from '../../core/entities/whatsapp-message.entity';

export interface WebhookRequest {
  payload: Record<string, unknown>;
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

    const entries = (payload.entry as Array<Record<string, unknown>>) || [];
    for (const entry of entries) {
      const changes = (entry.changes as Array<Record<string, unknown>>) || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value as Record<string, unknown>;
        const statuses =
          (value.statuses as Array<Record<string, unknown>>) || [];

        for (const statusObj of statuses) {
          const externalId = statusObj.id as string;
          const status = statusObj.status as string;

          await this.processStatusUpdate(
            externalId,
            status,
            statusObj.errors as Array<Record<string, unknown>>,
          );
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
      message.setError(String(error.code), error.message as string);
    } else {
      message.updateStatus(domainStatus);
    }

    await this.repository.saveMessage(message);
    this.logger.log(`Updated message ${message.id} status to ${domainStatus}`);
  }
}

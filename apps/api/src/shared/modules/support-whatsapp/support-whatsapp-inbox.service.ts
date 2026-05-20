import { Injectable } from '@nestjs/common';
import {
  SupportWhatsAppMessage,
  SupportWhatsAppThreadSummary,
} from '@workspace/types';
import { SupportWhatsAppThreadQueryService } from './support-whatsapp-thread-query.service';
import { SupportWhatsAppReplyService } from './support-whatsapp-reply.service';
import { SupportWhatsAppWebhookIngestService } from './support-whatsapp-webhook-ingest.service';
import type { WebhookValue } from './support-whatsapp-shared';

@Injectable()
export class SupportWhatsAppInboxService {
  constructor(
    private readonly threadQuery: SupportWhatsAppThreadQueryService,
    private readonly replyService: SupportWhatsAppReplyService,
    private readonly webhookIngest: SupportWhatsAppWebhookIngestService,
  ) {}

  recordIncomingMessages(value: WebhookValue): Promise<void> {
    return this.webhookIngest.recordIncomingMessages(value);
  }

  listThreads(limit?: number): Promise<SupportWhatsAppThreadSummary[]> {
    return this.threadQuery.listThreads(limit);
  }

  listThreadMessages(
    threadPhoneNumber: string,
    limit?: number,
  ): Promise<SupportWhatsAppMessage[]> {
    return this.threadQuery.listThreadMessages(threadPhoneNumber, limit);
  }

  markThreadAsRead(threadPhoneNumber: string): Promise<number> {
    return this.threadQuery.markThreadAsRead(threadPhoneNumber);
  }

  replyToThread(
    threadPhoneNumber: string,
    message: string,
    replyToProviderMessageId?: string,
  ): Promise<SupportWhatsAppMessage> {
    return this.replyService.replyToThread(
      threadPhoneNumber,
      message,
      replyToProviderMessageId,
    );
  }

  updateMessageStatus(
    providerMessageId: string,
    status: string,
    error?: { code?: number; title?: string; message?: string },
  ): Promise<void> {
    return this.webhookIngest.updateMessageStatus(
      providerMessageId,
      status,
      error,
    );
  }
}

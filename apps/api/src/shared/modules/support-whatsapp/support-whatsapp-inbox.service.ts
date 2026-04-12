import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SupportWhatsAppMessage,
  WhatsAppWebhookPayload,
} from '@workspace/types';
import { Prisma } from '@workspace/db';

type WebhookValue = WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'];
type WebhookMessage = NonNullable<WebhookValue['messages']>[number];

@Injectable()
export class SupportWhatsAppInboxService {
  private readonly logger = new Logger(SupportWhatsAppInboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordIncomingMessages(value: WebhookValue): Promise<void> {
    const messages = value.messages ?? [];
    if (messages.length === 0) {
      return;
    }

    await Promise.all(
      messages.map(async (message) => {
        try {
          await this.upsertIncomingMessage(value, message);
        } catch (error) {
          this.logger.warn(
            `Failed to persist inbound WhatsApp message ${message.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }),
    );
  }

  async listMessages(limit = 100): Promise<SupportWhatsAppMessage[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const messages = await this.prisma.supportWhatsAppMessage.findMany({
      orderBy: { receivedAt: 'desc' },
      take,
      select: {
        id: true,
        providerMessageId: true,
        supportPhoneNumber: true,
        senderPhoneNumber: true,
        senderName: true,
        messageType: true,
        messageBody: true,
        status: true,
        receivedAt: true,
        respondedAt: true,
      },
    });

    return messages;
  }

  private async upsertIncomingMessage(
    value: WebhookValue,
    message: WebhookMessage,
  ): Promise<void> {
    const senderName =
      value.contacts?.find((contact) => contact.wa_id === message.from)?.profile
        .name ??
      value.contacts?.[0]?.profile?.name ??
      null;
    const receivedAt = this.parseTimestamp(message.timestamp);
    const messageBody = this.extractMessageBody(message);

    await this.prisma.supportWhatsAppMessage.upsert({
      where: { providerMessageId: message.id },
      update: {
        supportPhoneNumber: value.metadata.display_phone_number,
        senderPhoneNumber: message.from,
        senderName,
        messageType: message.type,
        messageBody,
        rawPayload: this.toJsonValue({ metadata: value.metadata, message }),
      },
      create: {
        providerMessageId: message.id,
        supportPhoneNumber: value.metadata.display_phone_number,
        senderPhoneNumber: message.from,
        senderName,
        messageType: message.type,
        messageBody,
        receivedAt,
        rawPayload: this.toJsonValue({
          metadata: value.metadata,
          contacts: value.contacts,
          message,
        }),
      },
    });
  }

  private extractMessageBody(message: WebhookMessage): string {
    if (message.type === 'text') {
      return message.text?.body?.trim() || '[text]';
    }

    if (message.type === 'interactive') {
      const reply =
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        message.interactive?.button_reply?.id ??
        message.interactive?.list_reply?.id;

      return reply?.trim() || '[interactive]';
    }

    if (message.type === 'button') {
      return (
        message.button?.text?.trim() ||
        message.button?.payload?.trim() ||
        '[button]'
      );
    }

    return `[${message.type}]`;
  }

  private parseTimestamp(timestamp: string): Date {
    const parsed = Number(timestamp);
    if (Number.isFinite(parsed) && parsed > 0) {
      return new Date(parsed * 1000);
    }

    return new Date();
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

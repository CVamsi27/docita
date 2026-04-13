import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';
import {
  SupportWhatsAppMessage,
  SupportWhatsAppMessageStatus,
  SupportWhatsAppThreadSummary,
  WhatsAppWebhookPayload,
} from '@workspace/types';
import { Prisma } from '@workspace/db';
import { randomUUID } from 'crypto';

type WebhookValue = WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'];
type WebhookMessage = NonNullable<WebhookValue['messages']>[number];
type ThreadSummaryAccumulator = SupportWhatsAppThreadSummary & {
  senderName: string | null;
};

const threadMessageSelect = {
  id: true,
  providerMessageId: true,
  providerSentMessageId: true,
  threadPhoneNumber: true,
  supportPhoneNumber: true,
  senderPhoneNumber: true,
  senderName: true,
  direction: true,
  messageType: true,
  messageBody: true,
  status: true,
  receivedAt: true,
  respondedAt: true,
  replyToProviderMessageId: true,
  errorMessage: true,
} as const;

@Injectable()
export class SupportWhatsAppInboxService {
  private readonly logger = new Logger(SupportWhatsAppInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
  ) {}

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

  async listThreads(limit = 100): Promise<SupportWhatsAppThreadSummary[]> {
    const threadLimit = Math.min(Math.max(limit, 1), 200);
    const fetchLimit = Math.min(threadLimit * 20, 1000);

    const messages = await this.prisma.supportWhatsAppMessage.findMany({
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: fetchLimit,
      select: threadMessageSelect,
    });

    const threads = new Map<string, ThreadSummaryAccumulator>();

    for (const message of messages) {
      const threadKey = message.threadPhoneNumber || message.senderPhoneNumber;
      const existing = threads.get(threadKey);

      if (!existing) {
        threads.set(threadKey, {
          threadPhoneNumber: threadKey,
          supportPhoneNumber: message.supportPhoneNumber,
          senderName:
            message.direction === 'INBOUND' && message.senderName
              ? message.senderName
              : null,
          lastMessageId: message.id,
          lastMessageBody: message.messageBody,
          lastMessageType: message.messageType,
          lastMessageDirection: message.direction,
          lastMessageStatus: message.status,
          lastMessageAt: message.receivedAt,
          messageCount: 1,
          unreadCount:
            message.direction === 'INBOUND' && message.status === 'NEW' ? 1 : 0,
        });
        continue;
      }

      existing.messageCount += 1;
      if (message.direction === 'INBOUND' && message.status === 'NEW') {
        existing.unreadCount += 1;
      }

      if (!existing.senderName && message.direction === 'INBOUND') {
        existing.senderName = message.senderName ?? null;
      }
    }

    return Array.from(threads.values()).slice(0, threadLimit);
  }

  async listThreadMessages(
    threadPhoneNumber: string,
    limit = 500,
  ): Promise<SupportWhatsAppMessage[]> {
    const normalizedThreadPhoneNumber =
      this.normalizePhoneNumber(threadPhoneNumber);
    const take = Math.min(Math.max(limit, 1), 1000);

    const messages = await this.prisma.supportWhatsAppMessage.findMany({
      where: { threadPhoneNumber: normalizedThreadPhoneNumber },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: threadMessageSelect,
    });

    return messages.reverse();
  }

  async markThreadAsRead(threadPhoneNumber: string): Promise<number> {
    const normalizedThreadPhoneNumber =
      this.normalizePhoneNumber(threadPhoneNumber);

    const result = await this.prisma.supportWhatsAppMessage.updateMany({
      where: {
        threadPhoneNumber: normalizedThreadPhoneNumber,
        direction: 'INBOUND',
        status: 'NEW',
      },
      data: {
        status: 'READ',
      },
    });

    return result.count;
  }

  async replyToThread(
    threadPhoneNumber: string,
    message: string,
    replyToProviderMessageId?: string,
  ): Promise<SupportWhatsAppMessage> {
    const normalizedThreadPhoneNumber =
      this.normalizePhoneNumber(threadPhoneNumber);
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new BadRequestException('Reply message cannot be empty');
    }

    const latestInboundMessage =
      await this.prisma.supportWhatsAppMessage.findFirst({
        where: {
          threadPhoneNumber: normalizedThreadPhoneNumber,
          direction: 'INBOUND',
        },
        orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          providerMessageId: true,
          supportPhoneNumber: true,
        },
      });

    if (!latestInboundMessage) {
      throw new NotFoundException('No incoming WhatsApp messages found');
    }

    const linkedReplyToProviderMessageId =
      replyToProviderMessageId?.trim() ||
      latestInboundMessage.providerMessageId ||
      undefined;
    const sentAt = new Date();
    const draftProviderMessageId = `draft-${randomUUID()}`;

    const draftReply = await this.prisma.supportWhatsAppMessage.create({
      data: {
        providerMessageId: draftProviderMessageId,
        providerSentMessageId: null,
        threadPhoneNumber: normalizedThreadPhoneNumber,
        supportPhoneNumber: latestInboundMessage.supportPhoneNumber,
        senderPhoneNumber: latestInboundMessage.supportPhoneNumber,
        senderName: null,
        direction: 'OUTBOUND',
        messageType: 'text',
        messageBody: trimmedMessage,
        status: 'PENDING',
        receivedAt: sentAt,
        replyToProviderMessageId: linkedReplyToProviderMessageId,
        rawPayload: this.toJsonValue({
          draftProviderMessageId,
          sentAt: sentAt.toISOString(),
          replyToProviderMessageId: linkedReplyToProviderMessageId,
        }),
      },
      select: threadMessageSelect,
    });

    let result: { success: boolean; messageId?: string };
    try {
      result = await this.whatsappClient.sendMessage({
        to: normalizedThreadPhoneNumber,
        message: trimmedMessage,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      try {
        await this.markDraftReplyFailed(
          draftProviderMessageId,
          errorMessage,
          sentAt,
        );
      } catch (persistError) {
        this.logger.warn(
          `Failed to persist failed WhatsApp reply draft ${draftProviderMessageId}: ${
            persistError instanceof Error
              ? persistError.message
              : 'Unknown error'
          }`,
        );
      }
      this.logger.error(
        `Failed to send WhatsApp reply to ${normalizedThreadPhoneNumber}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException(
        'Unable to send WhatsApp reply right now. Please try again.',
      );
    }

    if (!result.success || !result.messageId) {
      const errorMessage = 'WhatsApp reply could not be sent';
      try {
        await this.markDraftReplyFailed(
          draftProviderMessageId,
          errorMessage,
          sentAt,
        );
      } catch (persistError) {
        this.logger.warn(
          `Failed to persist failed WhatsApp reply draft ${draftProviderMessageId}: ${
            persistError instanceof Error
              ? persistError.message
              : 'Unknown error'
          }`,
        );
      }
      this.logger.error(
        `Failed to send WhatsApp reply to ${normalizedThreadPhoneNumber}: ${errorMessage}`,
      );
      throw new ServiceUnavailableException(
        'Unable to send WhatsApp reply right now. Please try again.',
      );
    }

    try {
      const finalizedReply = await this.prisma.supportWhatsAppMessage.update({
        where: { providerMessageId: draftProviderMessageId },
        data: {
          providerSentMessageId: result.messageId,
          status: 'SENT',
          respondedAt: sentAt,
          errorMessage: null,
          rawPayload: this.toJsonValue({
            sentAt: sentAt.toISOString(),
            result,
            draftProviderMessageId,
          }),
        },
        select: threadMessageSelect,
      });

      try {
        await this.markThreadAsReplied(normalizedThreadPhoneNumber, sentAt);
      } catch (error) {
        this.logger.warn(
          `Failed to mark thread ${normalizedThreadPhoneNumber} as replied: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      return finalizedReply;
    } catch (error) {
      this.logger.error(
        `Failed to finalize WhatsApp reply for ${normalizedThreadPhoneNumber}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return draftReply;
    }
  }

  async updateMessageStatus(
    providerMessageId: string,
    status: string,
    error?: { code?: number; title?: string; message?: string },
  ): Promise<void> {
    const mappedStatus = this.mapProviderStatus(status);
    if (!mappedStatus) {
      return;
    }

    const updateData: Prisma.SupportWhatsAppMessageUpdateManyMutationInput = {
      status: mappedStatus,
    };

    if (mappedStatus === 'FAILED' && error) {
      updateData.errorMessage = [
        error.code !== undefined ? `${error.code}` : null,
        error.title,
        error.message,
      ]
        .filter(Boolean)
        .join(': ');
    }

    await this.prisma.supportWhatsAppMessage.updateMany({
      where: {
        direction: 'OUTBOUND',
        OR: [
          { providerMessageId },
          { providerSentMessageId: providerMessageId },
        ],
      },
      data: updateData,
    });
  }

  private async upsertIncomingMessage(
    value: WebhookValue,
    message: WebhookMessage,
  ): Promise<void> {
    const threadPhoneNumber = this.normalizePhoneNumber(message.from);
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
        threadPhoneNumber,
        supportPhoneNumber: value.metadata.display_phone_number,
        senderPhoneNumber: message.from,
        senderName,
        direction: 'INBOUND',
        messageType: message.type,
        messageBody,
        rawPayload: this.toJsonValue({
          metadata: value.metadata,
          contacts: value.contacts,
          message,
        }),
      },
      create: {
        providerMessageId: message.id,
        threadPhoneNumber,
        supportPhoneNumber: value.metadata.display_phone_number,
        senderPhoneNumber: message.from,
        senderName,
        direction: 'INBOUND',
        messageType: message.type,
        messageBody,
        receivedAt,
        status: 'NEW',
        rawPayload: this.toJsonValue({
          metadata: value.metadata,
          contacts: value.contacts,
          message,
        }),
      },
    });
  }

  private async markDraftReplyFailed(
    draftProviderMessageId: string,
    errorMessage: string,
    occurredAt: Date,
  ): Promise<void> {
    await this.prisma.supportWhatsAppMessage.update({
      where: {
        providerMessageId: draftProviderMessageId,
      },
      data: {
        status: 'FAILED',
        errorMessage,
        rawPayload: this.toJsonValue({
          occurredAt: occurredAt.toISOString(),
          error: errorMessage,
          draftProviderMessageId,
        }),
      },
    });
  }

  private async markThreadAsReplied(
    threadPhoneNumber: string,
    respondedAt: Date,
  ): Promise<void> {
    await this.prisma.supportWhatsAppMessage.updateMany({
      where: {
        threadPhoneNumber,
        direction: 'INBOUND',
        status: { in: ['NEW', 'READ'] },
      },
      data: {
        status: 'REPLIED',
        respondedAt,
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

  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  private mapProviderStatus(
    status: string,
  ): SupportWhatsAppMessageStatus | null {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'SENT';
      case 'delivered':
        return 'DELIVERED';
      case 'read':
        return 'READ';
      case 'failed':
        return 'FAILED';
      default:
        return null;
    }
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { SupportWhatsAppReplyService } from './support-whatsapp-reply.service';
import {
  AUTO_REPLY_COOLDOWN_MS,
  SUPPORT_EMAIL,
  WebhookMessage,
  WebhookValue,
  extractMessageBody,
  mapProviderStatus,
  normalizePhoneNumber,
  parseTimestamp,
  toJsonValue,
} from './support-whatsapp-shared';

@Injectable()
export class SupportWhatsAppWebhookIngestService {
  private readonly logger = new Logger(SupportWhatsAppWebhookIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly replyService: SupportWhatsAppReplyService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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

  async updateMessageStatus(
    providerMessageId: string,
    status: string,
    error?: { code?: number; title?: string; message?: string },
  ): Promise<void> {
    const mappedStatus = mapProviderStatus(status);
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
    const alreadyStored = await this.prisma.supportWhatsAppMessage.findUnique({
      where: { providerMessageId: message.id },
      select: { id: true },
    });
    if (alreadyStored) {
      return;
    }

    const threadPhoneNumber = normalizePhoneNumber(message.from);
    const senderName =
      value.contacts?.find((contact) => contact.wa_id === message.from)?.profile
        .name ??
      value.contacts?.[0]?.profile?.name ??
      null;
    const receivedAt = parseTimestamp(message.timestamp, this.clock.now());
    const messageBody = extractMessageBody(message);

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
        rawPayload: toJsonValue({
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
        rawPayload: toJsonValue({
          metadata: value.metadata,
          contacts: value.contacts,
          message,
        }),
      },
    });

    await this.maybeSendAutoReply({
      threadPhoneNumber,
      inboundProviderMessageId: message.id,
      messageBody,
      messageType: message.type,
    });
  }

  private async maybeSendAutoReply(input: {
    threadPhoneNumber: string;
    inboundProviderMessageId: string;
    messageBody: string;
    messageType: string;
  }): Promise<void> {
    if (input.messageType !== 'text' && input.messageType !== 'interactive') {
      return;
    }

    const normalizedBody = input.messageBody.trim().toLowerCase();
    if (!normalizedBody || normalizedBody.startsWith('[')) {
      return;
    }

    const recentOutbound = await this.prisma.supportWhatsAppMessage.findFirst({
      where: {
        threadPhoneNumber: input.threadPhoneNumber,
        direction: 'OUTBOUND',
        receivedAt: { gt: new Date(Date.now() - AUTO_REPLY_COOLDOWN_MS) },
      },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    if (recentOutbound) {
      return;
    }

    const isGreeting = /^(hi|hello|hey|hii|namaste)\b/.test(normalizedBody);
    const isPricing = /\b(price|pricing|plan|subscription|cost)\b/.test(
      normalizedBody,
    );
    const isSupport = /\b(help|support|issue|problem|bug|error)\b/.test(
      normalizedBody,
    );
    const looksComplex =
      normalizedBody.length > 200 ||
      /\b(crash|failed|unable|cannot|refund|payment|invoice|gst|tax)\b/.test(
        normalizedBody,
      );

    let reply: string | null = null;
    if (isGreeting) {
      reply =
        `Thanks for messaging Docita.\n` +
        `Reply with:\n` +
        `1) Pricing\n` +
        `2) Demo\n` +
        `3) Support\n\n` +
        `If your query is complex, email ${SUPPORT_EMAIL}`;
    } else if (isPricing) {
      reply =
        `For pricing and plan details, please share your clinic name and city.\n` +
        `If you prefer email, write to ${SUPPORT_EMAIL}`;
    } else if (isSupport) {
      reply =
        `Please share a short description of the issue and a screenshot if possible.\n` +
        `For complex issues, email ${SUPPORT_EMAIL}`;
    } else if (looksComplex) {
      reply = `Thanks. For complex queries, please email ${SUPPORT_EMAIL} and our team will reply`;
    }

    if (!reply) {
      return;
    }

    try {
      await this.replyService.replyToThread(
        input.threadPhoneNumber,
        reply,
        input.inboundProviderMessageId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send auto-reply to ${input.threadPhoneNumber}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

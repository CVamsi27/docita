import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { SupportWhatsAppMessage } from '@workspace/types';
import { randomUUID } from 'crypto';
import { WhatsappClientAdapter } from '@/domains/whatsapp/infrastructure/clients/whatsapp-client.adapter';
import {
  normalizePhoneNumber,
  threadMessageSelect,
  toJsonValue,
} from './support-whatsapp-shared';

@Injectable()
export class SupportWhatsAppReplyService {
  private readonly logger = new Logger(SupportWhatsAppReplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientAdapter,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async replyToThread(
    threadPhoneNumber: string,
    message: string,
    replyToProviderMessageId?: string,
  ): Promise<SupportWhatsAppMessage> {
    const normalizedThreadPhoneNumber = normalizePhoneNumber(threadPhoneNumber);
    const trimmedMessage = message.trim();
    if (!trimmedMessage)
      throw new BadRequestException('Reply message cannot be empty');

    const latestInboundMessage = await this.prisma.supportWhatsAppMessage.findFirst({
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

    if (!latestInboundMessage)
      throw new NotFoundException('No incoming WhatsApp messages found');

    const linkedReplyToProviderMessageId =
      replyToProviderMessageId?.trim() ||
      latestInboundMessage.providerMessageId ||
      undefined;
    const sentAt = this.clock.now();
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
        rawPayload: toJsonValue({
          draftProviderMessageId,
          sentAt: sentAt.toISOString(),
          replyToProviderMessageId: linkedReplyToProviderMessageId,
        }),
      },
      select: threadMessageSelect,
    });

    let result: { success: boolean; messageId?: string };
    try {
      result = await this.whatsappClient.sendTextMessage({
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
          rawPayload: toJsonValue({
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
          `Failed to mark thread ${normalizedThreadPhoneNumber} replied: ${
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

  async markDraftReplyFailed(
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
        rawPayload: toJsonValue({
          occurredAt: occurredAt.toISOString(),
          error: errorMessage,
          draftProviderMessageId,
        }),
      },
    });
  }

  async markThreadAsReplied(
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
}

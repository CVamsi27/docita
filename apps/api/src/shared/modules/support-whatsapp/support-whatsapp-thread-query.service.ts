import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SupportWhatsAppMessage,
  SupportWhatsAppThreadSummary,
} from '@workspace/types';
import {
  threadMessageSelect,
  normalizePhoneNumber,
} from './support-whatsapp-shared';

type ThreadSummaryAccumulator = SupportWhatsAppThreadSummary & {
  senderName: string | null;
};

@Injectable()
export class SupportWhatsAppThreadQueryService {
  constructor(private readonly prisma: PrismaService) {}

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
    const normalizedThreadPhoneNumber = normalizePhoneNumber(threadPhoneNumber);
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
    const normalizedThreadPhoneNumber = normalizePhoneNumber(threadPhoneNumber);

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
}

import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsAppMessage } from '@/domains/whatsapp/core/entities';
import type { IWhatsAppMessageRepository } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  MESSAGE_WITH_CONVERSATION_INCLUDE,
  type PrismaWhatsAppDatabase,
  type PrismaWhatsAppMessageWithConversation,
  type PrismaWhatsAppReadClient,
} from './prisma-whatsapp.types';
import {
  toDomainMessageStatus,
  toPrismaMessageStatus,
} from './prisma-whatsapp.mappers';

@Injectable()
export class PrismaWhatsAppMessageRepository implements IWhatsAppMessageRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaWhatsAppDatabase,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient(): PrismaWhatsAppReadClient {
    return this.prisma.getReadClient();
  }

  async ensureConversation(
    clinicId: string,
    recipientPhone: string,
  ): Promise<string> {
    const contactPhone = recipientPhone.replace(/\D/g, '');
    const patient = await this.prisma.patient.findFirst({
      where: { clinicId, phoneNumber: contactPhone, deletedAt: null },
      select: { id: true },
    });
    const now = this.clock.now();
    const conversation = await this.prisma.whatsappConversation.upsert({
      where: { clinicId_contactPhone: { clinicId, contactPhone } },
      create: {
        clinicId,
        patientId: patient?.id ?? null,
        contactPhone,
        lastMessageAt: now,
      },
      update: {
        patientId: patient?.id ?? undefined,
        lastMessageAt: now,
      },
      select: { id: true },
    });
    return conversation.id;
  }

  async saveMessage(message: WhatsAppMessage): Promise<void> {
    const data = message.toSnapshot();
    await this.prisma.whatsappMessage.upsert({
      where: { id: data.id },
      update: {
        status: toPrismaMessageStatus(data.status),
        providerMsgId: data.externalMessageId,
      },
      create: {
        id: data.id,
        conversationId: data.conversationId,
        content: data.content || '',
        status: toPrismaMessageStatus(data.status),
        providerMsgId: data.externalMessageId,
        direction: 'OUTBOUND',
        messageType: data.templateName ? 'TEMPLATE' : 'TEXT',
      },
    });
  }

  private async toDomainMessage(
    raw: PrismaWhatsAppMessageWithConversation | null,
  ): Promise<WhatsAppMessage | null> {
    if (!raw) return null;

    return new WhatsAppMessage({
      id: raw.id,
      clinicId: raw.conversation.clinicId,
      conversationId: raw.conversationId,
      recipientPhone: raw.conversation.patient?.phoneNumber || '',
      content: raw.content,
      status: toDomainMessageStatus(raw.status),
      externalMessageId: raw.providerMsgId || undefined,
      sentAt: raw.createdAt,
    });
  }

  async findMessageById(id: string): Promise<WhatsAppMessage | null> {
    const readClient = this.getReadClient();
    const raw = await readClient.whatsappMessage.findUnique({
      where: { id },
      include: MESSAGE_WITH_CONVERSATION_INCLUDE,
    });
    return this.toDomainMessage(raw);
  }

  async findMessageByExternalId(
    externalId: string,
  ): Promise<WhatsAppMessage | null> {
    const readClient = this.getReadClient();
    const raw = await readClient.whatsappMessage.findFirst({
      where: { providerMsgId: externalId },
      include: MESSAGE_WITH_CONVERSATION_INCLUDE,
    });
    return this.toDomainMessage(raw);
  }
}

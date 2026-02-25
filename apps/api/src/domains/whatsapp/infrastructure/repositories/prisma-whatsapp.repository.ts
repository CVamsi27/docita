import { Injectable } from '@nestjs/common';
import { IWhatsAppRepository } from '../../application/ports/whatsapp.repository.port';
import { WhatsAppMessage, WhatsAppTemplate } from '../../core/entities';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WhatsAppMessageStatus as DomainMessageStatus } from '../../core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplateStatus as DomainTemplateStatus,
  WhatsAppTemplateCategory as DomainTemplateCategory,
} from '../../core/entities/whatsapp-template.entity';
import {
  WhatsappTemplateStatus as PrismaTemplateStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappMessageStatus as PrismaMessageStatus,
  Prisma,
} from '@workspace/db';

@Injectable()
export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(message: WhatsAppMessage): Promise<void> {
    const data = message.toSnapshot();
    await this.prisma.whatsappMessage.upsert({
      where: { id: data.id },
      update: {
        status: this.toPrismaMessageStatus(data.status),
        providerMsgId: data.externalMessageId,
      },
      create: {
        id: data.id,
        conversationId: data.conversationId,
        content: data.content || '',
        status: this.toPrismaMessageStatus(data.status),
        providerMsgId: data.externalMessageId,
        direction: 'OUTBOUND',
        messageType: data.templateName ? 'TEMPLATE' : 'TEXT',
      },
    });
  }

  async findMessageById(id: string): Promise<WhatsAppMessage | null> {
    const raw = await this.prisma.whatsappMessage.findUnique({
      where: { id },
      include: { conversation: true },
    });
    if (!raw) return null;

    const patient = await this.prisma.patient.findUnique({
      where: { id: raw.conversation.patientId },
      select: { phoneNumber: true },
    });

    return new WhatsAppMessage({
      id: raw.id,
      clinicId: raw.conversation.clinicId,
      conversationId: raw.conversationId,
      recipientPhone: patient?.phoneNumber || '',
      content: raw.content,
      status: this.toDomainMessageStatus(raw.status),
      externalMessageId: raw.providerMsgId || undefined,
      sentAt: raw.createdAt,
    });
  }

  async findMessageByExternalId(
    externalId: string,
  ): Promise<WhatsAppMessage | null> {
    const raw = await this.prisma.whatsappMessage.findFirst({
      where: { providerMsgId: externalId },
      include: { conversation: true },
    });
    if (!raw) return null;

    const patient = await this.prisma.patient.findUnique({
      where: { id: raw.conversation.patientId },
      select: { phoneNumber: true },
    });

    return new WhatsAppMessage({
      id: raw.id,
      clinicId: raw.conversation.clinicId,
      conversationId: raw.conversationId,
      recipientPhone: patient?.phoneNumber || '',
      content: raw.content,
      status: this.toDomainMessageStatus(raw.status),
      externalMessageId: raw.providerMsgId || undefined,
      sentAt: raw.createdAt,
    });
  }

  async saveTemplate(template: WhatsAppTemplate): Promise<void> {
    const data = template.toSnapshot();
    await this.prisma.whatsappTemplate.upsert({
      where: { id: data.id },
      update: {
        status: this.toPrismaStatus(data.status),
        content: data.content,
        buttons: data.buttons as Prisma.InputJsonValue,
        category: this.toPrismaCategory(data.category),
        updatedAt: data.updatedAt,
      },
      create: {
        id: data.id,
        clinicId: data.clinicId,
        name: data.name,
        category: this.toPrismaCategory(data.category),
        content: data.content,
        status: this.toPrismaStatus(data.status),
        buttons: data.buttons as Prisma.InputJsonValue,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findTemplateById(id: string): Promise<WhatsAppTemplate | null> {
    const raw = await this.prisma.whatsappTemplate.findUnique({
      where: { id },
    });
    if (!raw) return null;
    return new WhatsAppTemplate({
      id: raw.id,
      clinicId: raw.clinicId || '',
      name: raw.name,
      category: this.toDomainCategory(raw.category),
      content: raw.content || '',
      status: this.toDomainStatus(raw.status),
      buttons: raw.buttons as Record<string, unknown>,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findTemplateByName(
    clinicId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null> {
    const raw = await this.prisma.whatsappTemplate.findFirst({
      where: { clinicId, name },
    });
    if (!raw) return null;
    return new WhatsAppTemplate({
      id: raw.id,
      clinicId: raw.clinicId || '',
      name: raw.name,
      category: this.toDomainCategory(raw.category),
      content: raw.content || '',
      status: this.toDomainStatus(raw.status),
      buttons: raw.buttons as Record<string, unknown>,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async listTemplatesByClinic(clinicId: string): Promise<WhatsAppTemplate[]> {
    const raws = await this.prisma.whatsappTemplate.findMany({
      where: { clinicId },
    });
    return raws.map(
      (raw) =>
        new WhatsAppTemplate({
          id: raw.id,
          clinicId: raw.clinicId || '',
          name: raw.name,
          category: this.toDomainCategory(raw.category),
          content: raw.content || '',
          status: this.toDomainStatus(raw.status),
          buttons: raw.buttons as Record<string, unknown>,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
    );
  }

  async isAutomationEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    ) {
      return true;
    }

    const automation = clinic.whatsappAutomation as { enabled?: boolean };
    return automation.enabled !== false;
  }

  private toPrismaStatus(status: DomainTemplateStatus): PrismaTemplateStatus {
    switch (status) {
      case DomainTemplateStatus.APPROVED:
        return PrismaTemplateStatus.APPROVED;
      case DomainTemplateStatus.REJECTED:
        return PrismaTemplateStatus.REJECTED;
      case DomainTemplateStatus.PENDING:
        return PrismaTemplateStatus.PENDING_APPROVAL;
      default:
        return PrismaTemplateStatus.DRAFT;
    }
  }

  private toDomainStatus(status: PrismaTemplateStatus): DomainTemplateStatus {
    switch (status) {
      case PrismaTemplateStatus.APPROVED:
        return DomainTemplateStatus.APPROVED;
      case PrismaTemplateStatus.REJECTED:
        return DomainTemplateStatus.REJECTED;
      case PrismaTemplateStatus.PENDING_APPROVAL:
        return DomainTemplateStatus.PENDING;
      default:
        return DomainTemplateStatus.PAUSED;
    }
  }

  private toPrismaCategory(
    category: DomainTemplateCategory,
  ): PrismaTemplateCategory {
    switch (category) {
      case DomainTemplateCategory.MARKETING:
        return PrismaTemplateCategory.MARKETING;
      default:
        return PrismaTemplateCategory.STAFF_NOTIFICATION;
    }
  }

  private toDomainCategory(
    category: PrismaTemplateCategory,
  ): DomainTemplateCategory {
    switch (category) {
      case PrismaTemplateCategory.MARKETING:
        return DomainTemplateCategory.MARKETING;
      default:
        return DomainTemplateCategory.UTILITY;
    }
  }

  private toPrismaMessageStatus(
    status: DomainMessageStatus,
  ): PrismaMessageStatus {
    switch (status) {
      case DomainMessageStatus.DISPATCHED:
        return PrismaMessageStatus.QUEUED;
      case DomainMessageStatus.SENT:
        return PrismaMessageStatus.SENT;
      case DomainMessageStatus.DELIVERED:
        return PrismaMessageStatus.DELIVERED;
      case DomainMessageStatus.READ:
        return PrismaMessageStatus.READ;
      case DomainMessageStatus.FAILED:
        return PrismaMessageStatus.FAILED;
      default:
        return PrismaMessageStatus.FAILED;
    }
  }

  private toDomainMessageStatus(
    status: PrismaMessageStatus,
  ): DomainMessageStatus {
    switch (status) {
      case PrismaMessageStatus.QUEUED:
      case PrismaMessageStatus.PENDING:
        return DomainMessageStatus.DISPATCHED;
      case PrismaMessageStatus.SENT:
        return DomainMessageStatus.SENT;
      case PrismaMessageStatus.DELIVERED:
        return DomainMessageStatus.DELIVERED;
      case PrismaMessageStatus.READ:
        return DomainMessageStatus.READ;
      case PrismaMessageStatus.FAILED:
        return DomainMessageStatus.FAILED;
      default:
        return DomainMessageStatus.FAILED;
    }
  }
}

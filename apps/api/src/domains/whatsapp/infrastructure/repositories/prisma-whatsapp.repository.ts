import { Inject, Injectable } from '@nestjs/common';
import { IWhatsAppRepository } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';
import {
  TemplateButton,
  TemplateVariable,
} from '@/domains/whatsapp/core/services/default-templates.service';
import { WhatsAppMessageStatus as DomainMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplateStatus as DomainTemplateStatus,
  WhatsAppTemplateCategory as DomainTemplateCategory,
  WhatsAppTemplateButtonType,
} from '@/domains/whatsapp/core/entities/whatsapp-template.entity';
import {
  WhatsappTemplateStatus as PrismaTemplateStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappMessageStatus as PrismaMessageStatus,
  Prisma,
} from '@workspace/db';

type JsonRecord = Record<string, Prisma.JsonValue>;

export type PrismaWhatsAppMessageRecord = {
  id: string;
  conversationId: string;
  content: string;
  status: PrismaMessageStatus;
  providerMsgId: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: string;
  createdAt: Date;
  conversation: {
    clinicId: string;
    patientId: string;
  };
};

export type PrismaWhatsAppTemplateRecord = {
  id: string;
  clinicId: string | null;
  name: string;
  category: PrismaTemplateCategory;
  content: string;
  status: PrismaTemplateStatus;
  variables: Prisma.JsonValue | null;
  buttons: Prisma.JsonValue | null;
  buttonType: WhatsAppTemplateButtonType;
  metaTemplateId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateVariableJson = {
  name: string;
  required: boolean;
  defaultValue: string | null;
};

type TemplateButtonJson = {
  id: string;
  text: string;
  action: string | null;
};

export interface PrismaWhatsAppReadClient {
  whatsappMessage: {
    findUnique(args: {
      where: { id: string };
      include: { conversation: true };
    }): Promise<PrismaWhatsAppMessageRecord | null>;
    findFirst(args: {
      where: { providerMsgId: string };
      include: { conversation: true };
    }): Promise<PrismaWhatsAppMessageRecord | null>;
  };
  patient: {
    findUnique(args: {
      where: { id: string };
      select: { phoneNumber: true };
    }): Promise<{ phoneNumber: string } | null>;
  };
  whatsappTemplate: {
    findUnique(args: {
      where: { id: string };
    }): Promise<PrismaWhatsAppTemplateRecord | null>;
    findFirst(args: {
      where: { clinicId: string; name: string };
    }): Promise<PrismaWhatsAppTemplateRecord | null>;
    findMany(args: {
      where: { clinicId: string };
    }): Promise<PrismaWhatsAppTemplateRecord[]>;
  };
  clinic: {
    findUnique(args: {
      where: { id: string };
      select: { whatsappAutomation: true };
    }): Promise<{ whatsappAutomation: Prisma.JsonValue | null } | null>;
  };
}

export interface PrismaWhatsAppDatabase {
  getReadClient(): PrismaWhatsAppReadClient;
  whatsappMessage: {
    upsert(args: {
      where: { id: string };
      update: {
        status: PrismaMessageStatus;
        providerMsgId: string | undefined;
      };
      create: {
        id: string;
        conversationId: string;
        content: string;
        status: PrismaMessageStatus;
        providerMsgId: string | undefined;
        direction: 'OUTBOUND';
        messageType: 'TEXT' | 'TEMPLATE';
      };
    }): Promise<PrismaWhatsAppMessageRecord>;
  };
  whatsappTemplate: {
    upsert(args: {
      where: { id: string };
      update: {
        status: PrismaTemplateStatus;
        content: string;
        variables: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
        buttons: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
        buttonType: WhatsAppTemplateButtonType;
        category: PrismaTemplateCategory;
        metaTemplateId: string | null;
        updatedAt: Date;
      };
      create: {
        id: string;
        clinicId: string;
        name: string;
        category: PrismaTemplateCategory;
        content: string;
        status: PrismaTemplateStatus;
        variables: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
        buttons: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
        buttonType: WhatsAppTemplateButtonType;
        metaTemplateId: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    }): Promise<PrismaWhatsAppTemplateRecord>;
  };
}

function isRecord(
  value: Prisma.JsonValue | null | undefined,
): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toTemplateVariables(
  value: Prisma.JsonValue | null,
): TemplateVariable[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const variables = value
    .filter((item): item is JsonRecord => isRecord(item))
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      required: item.required === true,
      defaultValue:
        typeof item.defaultValue === 'string' ? item.defaultValue : undefined,
    }))
    .filter((item) => item.name.length > 0);

  return variables.length > 0 ? variables : undefined;
}

function toTemplateButtons(
  value: Prisma.JsonValue | null,
): TemplateButton[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const buttons = value
    .filter((item): item is JsonRecord => isRecord(item))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      text: typeof item.text === 'string' ? item.text : '',
      action: typeof item.action === 'string' ? item.action : undefined,
    }))
    .filter((item) => item.id.length > 0 && item.text.length > 0);

  return buttons.length > 0 ? buttons : undefined;
}

function toTemplateVariablesInput(
  value: TemplateVariable[] | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!value || value.length === 0) {
    return Prisma.JsonNull;
  }

  return value.map(
    (item): TemplateVariableJson => ({
      name: item.name,
      required: item.required,
      defaultValue: item.defaultValue ?? null,
    }),
  );
}

function toTemplateButtonsInput(
  value: TemplateButton[] | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!value || value.length === 0) {
    return Prisma.JsonNull;
  }

  return value.map(
    (item): TemplateButtonJson => ({
      id: item.id,
      text: item.text,
      action: item.action ?? null,
    }),
  );
}

@Injectable()
export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaWhatsAppDatabase,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

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
    const readClient = this.getReadClient();
    const raw = await readClient.whatsappMessage.findUnique({
      where: { id },
      include: { conversation: true },
    });
    if (!raw) return null;

    const patient = await readClient.patient.findUnique({
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
    const readClient = this.getReadClient();
    const raw = await readClient.whatsappMessage.findFirst({
      where: { providerMsgId: externalId },
      include: { conversation: true },
    });
    if (!raw) return null;

    const patient = await readClient.patient.findUnique({
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
        variables: toTemplateVariablesInput(data.variables),
        buttons: toTemplateButtonsInput(data.buttons),
        buttonType: data.buttonType ?? 'NONE',
        metaTemplateId: data.metaTemplateId ?? null,
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
        variables: toTemplateVariablesInput(data.variables),
        buttons: toTemplateButtonsInput(data.buttons),
        buttonType: data.buttonType ?? 'NONE',
        metaTemplateId: data.metaTemplateId ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findTemplateById(id: string): Promise<WhatsAppTemplate | null> {
    const raw = await this.getReadClient().whatsappTemplate.findUnique({
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
      variables: toTemplateVariables(raw.variables),
      buttons: toTemplateButtons(raw.buttons),
      buttonType: raw.buttonType,
      metaTemplateId: raw.metaTemplateId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findTemplateByName(
    clinicId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null> {
    const raw = await this.getReadClient().whatsappTemplate.findFirst({
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
      variables: toTemplateVariables(raw.variables),
      buttons: toTemplateButtons(raw.buttons),
      buttonType: raw.buttonType,
      metaTemplateId: raw.metaTemplateId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async listTemplatesByClinic(clinicId: string): Promise<WhatsAppTemplate[]> {
    const raws = await this.getReadClient().whatsappTemplate.findMany({
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
          variables: toTemplateVariables(raw.variables),
          buttons: toTemplateButtons(raw.buttons),
          buttonType: raw.buttonType,
          metaTemplateId: raw.metaTemplateId || undefined,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
    );
  }

  async isAutomationEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (!clinic?.whatsappAutomation || !isRecord(clinic.whatsappAutomation)) {
      return true;
    }

    return clinic.whatsappAutomation.enabled !== false;
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

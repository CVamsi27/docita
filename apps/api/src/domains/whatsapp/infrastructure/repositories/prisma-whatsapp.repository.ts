import { Injectable } from '@nestjs/common';
import { IWhatsAppRepository } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';
import { WhatsAppTemplateButtonType } from '@/domains/whatsapp/core/entities/whatsapp-template.entity';
import {
  WhatsappTemplateStatus as PrismaTemplateStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappMessageStatus as PrismaMessageStatus,
  Prisma,
  ClinicTier,
  IntelligenceAddon,
} from '@workspace/db';
import { PrismaWhatsAppMessageRepository } from './prisma-whatsapp-message.repository';
import { PrismaWhatsAppTemplateRepository } from './prisma-whatsapp-template.repository';
import type { WhatsAppClinicMessageContext } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';

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
      select: {
        whatsappAutomation?: true;
        tier?: true;
        intelligenceAddon?: true;
        features?: true;
        name?: true;
        branding?: true;
      };
    }): Promise<{
      whatsappAutomation?: Prisma.JsonValue | null;
      tier?: ClinicTier;
      intelligenceAddon?: IntelligenceAddon;
      features?: Prisma.JsonValue | null;
      name?: string;
      branding?: Prisma.JsonValue | null;
    } | null>;
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

@Injectable()
export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  constructor(
    private readonly messages: PrismaWhatsAppMessageRepository,
    private readonly templates: PrismaWhatsAppTemplateRepository,
  ) {}

  saveMessage(message: WhatsAppMessage): Promise<void> {
    return this.messages.saveMessage(message);
  }

  findMessageById(id: string): Promise<WhatsAppMessage | null> {
    return this.messages.findMessageById(id);
  }

  findMessageByExternalId(externalId: string): Promise<WhatsAppMessage | null> {
    return this.messages.findMessageByExternalId(externalId);
  }

  findClinicMessageContext(
    clinicId: string,
  ): Promise<WhatsAppClinicMessageContext | null> {
    return this.templates.findClinicMessageContext(clinicId);
  }

  saveTemplate(template: WhatsAppTemplate): Promise<void> {
    return this.templates.saveTemplate(template);
  }

  findTemplateById(id: string): Promise<WhatsAppTemplate | null> {
    return this.templates.findTemplateById(id);
  }

  findTemplateByName(
    clinicId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null> {
    return this.templates.findTemplateByName(clinicId, name);
  }

  listTemplatesByClinic(clinicId: string): Promise<WhatsAppTemplate[]> {
    return this.templates.listTemplatesByClinic(clinicId);
  }

  isAutomationEnabled(clinicId: string): Promise<boolean> {
    return this.templates.isAutomationEnabled(clinicId);
  }
}

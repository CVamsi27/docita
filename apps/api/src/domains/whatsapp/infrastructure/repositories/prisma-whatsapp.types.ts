import {
  WhatsappTemplateStatus as PrismaTemplateStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappMessageStatus as PrismaMessageStatus,
  Prisma,
  ClinicTier,
  IntelligenceAddon,
} from '@workspace/db';
import { WhatsAppTemplateButtonType } from '@/domains/whatsapp/core/entities/whatsapp-template.entity';

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
    patientId: string | null;
    patient?: { phoneNumber: string | null } | null;
  };
};

export const MESSAGE_WITH_CONVERSATION_INCLUDE = {
  conversation: {
    include: {
      patient: { select: { phoneNumber: true } },
    },
  },
} as const;

export type PrismaWhatsAppMessageWithConversation = PrismaWhatsAppMessageRecord;

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
      include: typeof MESSAGE_WITH_CONVERSATION_INCLUDE;
    }): Promise<PrismaWhatsAppMessageWithConversation | null>;
    findFirst(args: {
      where: { providerMsgId: string };
      include: typeof MESSAGE_WITH_CONVERSATION_INCLUDE;
    }): Promise<PrismaWhatsAppMessageWithConversation | null>;
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
  patient: {
    findFirst(args: {
      where: { clinicId: string; phoneNumber: string; deletedAt: null };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  whatsappConversation: {
    upsert(args: {
      where: {
        clinicId_contactPhone: { clinicId: string; contactPhone: string };
      };
      create: {
        clinicId: string;
        patientId: string | null;
        contactPhone: string;
        lastMessageAt: Date;
      };
      update: { patientId: string | undefined; lastMessageAt: Date };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
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

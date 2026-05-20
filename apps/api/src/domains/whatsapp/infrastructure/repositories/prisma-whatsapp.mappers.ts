import {
  whatsappTemplateButtonsSchema,
  whatsappTemplateVariablesSchema,
} from '@workspace/types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  TemplateButton,
  TemplateVariable,
} from '@/domains/whatsapp/core/services/default-templates.service';
import { WhatsAppMessageStatus as DomainMessageStatus } from '@/domains/whatsapp/core/entities/whatsapp-message.entity';
import {
  WhatsAppTemplateStatus as DomainTemplateStatus,
  WhatsAppTemplateCategory as DomainTemplateCategory,
} from '@/domains/whatsapp/core/entities/whatsapp-template.entity';
import {
  WhatsappTemplateStatus as PrismaTemplateStatus,
  WhatsappTemplateCategory as PrismaTemplateCategory,
  WhatsappMessageStatus as PrismaMessageStatus,
  Prisma,
} from '@workspace/db';

type JsonRecord = Record<string, Prisma.JsonValue>;

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

export function isWhatsAppJsonRecord(
  value: Prisma.JsonValue | null | undefined,
): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function toTemplateVariables(
  value: Prisma.JsonValue | null,
): TemplateVariable[] | undefined {
  const parsed = parsePrismaJsonColumn(value, whatsappTemplateVariablesSchema);
  if (!parsed?.length) {
    return undefined;
  }

  return parsed
    .filter((item) => item.name.length > 0)
    .map((item) => ({
      name: item.name,
      required: item.required,
      defaultValue: item.defaultValue ?? undefined,
    }));
}

export function toTemplateButtons(
  value: Prisma.JsonValue | null,
): TemplateButton[] | undefined {
  const parsed = parsePrismaJsonColumn(value, whatsappTemplateButtonsSchema);
  if (!parsed?.length) {
    return undefined;
  }

  return parsed
    .filter((item) => item.id.length > 0 && item.text.length > 0)
    .map((item) => ({
      id: item.id,
      text: item.text,
      action: item.action ?? undefined,
    }));
}

export function toTemplateVariablesInput(
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

export function toTemplateButtonsInput(
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

const DOMAIN_TO_PRISMA_TEMPLATE_STATUS: Record<
  DomainTemplateStatus,
  PrismaTemplateStatus
> = {
  [DomainTemplateStatus.APPROVED]: PrismaTemplateStatus.APPROVED,
  [DomainTemplateStatus.REJECTED]: PrismaTemplateStatus.REJECTED,
  [DomainTemplateStatus.PENDING]: PrismaTemplateStatus.PENDING_APPROVAL,
  [DomainTemplateStatus.PAUSED]: PrismaTemplateStatus.DRAFT,
};

const PRISMA_TO_DOMAIN_TEMPLATE_STATUS: Record<
  PrismaTemplateStatus,
  DomainTemplateStatus
> = {
  [PrismaTemplateStatus.APPROVED]: DomainTemplateStatus.APPROVED,
  [PrismaTemplateStatus.REJECTED]: DomainTemplateStatus.REJECTED,
  [PrismaTemplateStatus.PENDING_APPROVAL]: DomainTemplateStatus.PENDING,
  [PrismaTemplateStatus.DRAFT]: DomainTemplateStatus.PAUSED,
};

const DOMAIN_TO_PRISMA_TEMPLATE_CATEGORY: Record<
  DomainTemplateCategory,
  PrismaTemplateCategory
> = {
  [DomainTemplateCategory.MARKETING]: PrismaTemplateCategory.MARKETING,
  [DomainTemplateCategory.UTILITY]: PrismaTemplateCategory.STAFF_NOTIFICATION,
};

const PRISMA_TO_DOMAIN_TEMPLATE_CATEGORY: Partial<
  Record<PrismaTemplateCategory, DomainTemplateCategory>
> = {
  [PrismaTemplateCategory.MARKETING]: DomainTemplateCategory.MARKETING,
  [PrismaTemplateCategory.STAFF_NOTIFICATION]: DomainTemplateCategory.UTILITY,
  [PrismaTemplateCategory.APPOINTMENT]: DomainTemplateCategory.UTILITY,
  [PrismaTemplateCategory.PRESCRIPTION]: DomainTemplateCategory.UTILITY,
  [PrismaTemplateCategory.INVOICE]: DomainTemplateCategory.UTILITY,
  [PrismaTemplateCategory.PAYMENT]: DomainTemplateCategory.UTILITY,
  [PrismaTemplateCategory.FOLLOW_UP]: DomainTemplateCategory.UTILITY,
};

const DOMAIN_TO_PRISMA_MESSAGE_STATUS: Record<
  DomainMessageStatus,
  PrismaMessageStatus
> = {
  [DomainMessageStatus.DISPATCHED]: PrismaMessageStatus.QUEUED,
  [DomainMessageStatus.SENT]: PrismaMessageStatus.SENT,
  [DomainMessageStatus.DELIVERED]: PrismaMessageStatus.DELIVERED,
  [DomainMessageStatus.READ]: PrismaMessageStatus.READ,
  [DomainMessageStatus.FAILED]: PrismaMessageStatus.FAILED,
};

const PRISMA_TO_DOMAIN_MESSAGE_STATUS: Record<
  PrismaMessageStatus,
  DomainMessageStatus
> = {
  [PrismaMessageStatus.QUEUED]: DomainMessageStatus.DISPATCHED,
  [PrismaMessageStatus.PENDING]: DomainMessageStatus.DISPATCHED,
  [PrismaMessageStatus.SENT]: DomainMessageStatus.SENT,
  [PrismaMessageStatus.DELIVERED]: DomainMessageStatus.DELIVERED,
  [PrismaMessageStatus.READ]: DomainMessageStatus.READ,
  [PrismaMessageStatus.FAILED]: DomainMessageStatus.FAILED,
};

export function toPrismaTemplateStatus(
  status: DomainTemplateStatus,
): PrismaTemplateStatus {
  return DOMAIN_TO_PRISMA_TEMPLATE_STATUS[status] ?? PrismaTemplateStatus.DRAFT;
}

export function toDomainTemplateStatus(
  status: PrismaTemplateStatus,
): DomainTemplateStatus {
  return (
    PRISMA_TO_DOMAIN_TEMPLATE_STATUS[status] ?? DomainTemplateStatus.PAUSED
  );
}

export function toPrismaTemplateCategory(
  category: DomainTemplateCategory,
): PrismaTemplateCategory {
  return (
    DOMAIN_TO_PRISMA_TEMPLATE_CATEGORY[category] ??
    PrismaTemplateCategory.STAFF_NOTIFICATION
  );
}

export function toDomainTemplateCategory(
  category: PrismaTemplateCategory,
): DomainTemplateCategory {
  return (
    PRISMA_TO_DOMAIN_TEMPLATE_CATEGORY[category] ??
    DomainTemplateCategory.UTILITY
  );
}

export function toPrismaMessageStatus(
  status: DomainMessageStatus,
): PrismaMessageStatus {
  return DOMAIN_TO_PRISMA_MESSAGE_STATUS[status] ?? PrismaMessageStatus.FAILED;
}

export function toDomainMessageStatus(
  status: PrismaMessageStatus,
): DomainMessageStatus {
  return PRISMA_TO_DOMAIN_MESSAGE_STATUS[status] ?? DomainMessageStatus.FAILED;
}

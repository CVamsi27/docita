import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';

export type WhatsAppClinicMessageContext = {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: unknown;
  name: string;
  branding: unknown;
};

export interface IWhatsAppRepository {
  ensureConversation(clinicId: string, recipientPhone: string): Promise<string>;
  saveMessage(message: WhatsAppMessage): Promise<void>;
  findMessageById(id: string): Promise<WhatsAppMessage | null>;
  findMessageByExternalId(externalId: string): Promise<WhatsAppMessage | null>;
  findClinicMessageContext(
    clinicId: string,
  ): Promise<WhatsAppClinicMessageContext | null>;

  saveTemplate(template: WhatsAppTemplate): Promise<void>;
  findTemplateById(id: string): Promise<WhatsAppTemplate | null>;
  findTemplateByName(
    clinicId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null>;
  listTemplatesByClinic(clinicId: string): Promise<WhatsAppTemplate[]>;
  isAutomationEnabled(clinicId: string): Promise<boolean>;
}

export const WHATSAPP_REPOSITORY_TOKEN = 'IWhatsAppRepository';

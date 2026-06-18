import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import type {
  ClinicWhatsappCampaignPreviewResponse,
  ClinicWhatsappCampaignSummary,
  ClinicWhatsappConversation,
  ClinicWhatsappConversationMessage,
  CreateClinicWhatsappCampaignRequest,
} from '@workspace/types';

export type WhatsAppClinicMessageContext = {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: unknown;
  name: string;
  branding: unknown;
};

export interface IWhatsAppMessageRepository {
  ensureConversation(clinicId: string, recipientPhone: string): Promise<string>;
  saveMessage(message: WhatsAppMessage): Promise<void>;
  findMessageById(id: string): Promise<WhatsAppMessage | null>;
  findMessageByExternalId(externalId: string): Promise<WhatsAppMessage | null>;
}

export interface IWhatsAppTemplateRepository {
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

export interface IWhatsAppRepository
  extends IWhatsAppMessageRepository, IWhatsAppTemplateRepository {}

export const WHATSAPP_REPOSITORY_TOKEN = 'IWhatsAppRepository';

export interface IWhatsappOperationsRepository {
  listConversations(clinicId: string): Promise<ClinicWhatsappConversation[]>;
  getConversation(
    clinicId: string,
    id: string,
  ): Promise<{ contactPhone: string } | null>;
  listMessages(
    clinicId: string,
    conversationId: string,
  ): Promise<ClinicWhatsappConversationMessage[]>;
  markRead(clinicId: string, conversationId: string): Promise<boolean>;
  previewCampaign(
    clinicId: string,
    patientIds: string[],
  ): Promise<ClinicWhatsappCampaignPreviewResponse>;
  hasApprovedCampaignTemplate(
    clinicId: string,
    templateName: string,
  ): Promise<boolean>;
  createCampaign(
    clinicId: string,
    userId: string,
    input: CreateClinicWhatsappCampaignRequest,
  ): Promise<ClinicWhatsappCampaignSummary>;
  listCampaigns(clinicId: string): Promise<ClinicWhatsappCampaignSummary[]>;
  cancelCampaign(
    clinicId: string,
    userId: string,
    id: string,
  ): Promise<boolean>;
}

export const WHATSAPP_MESSAGE_REPOSITORY_TOKEN = 'IWhatsAppMessageRepository';
export const WHATSAPP_TEMPLATE_REPOSITORY_TOKEN = 'IWhatsAppTemplateRepository';
export const WHATSAPP_OPERATIONS_REPOSITORY_TOKEN =
  'IWhatsappOperationsRepository';

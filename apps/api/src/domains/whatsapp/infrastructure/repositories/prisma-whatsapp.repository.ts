import { Inject, Injectable } from '@nestjs/common';
import {
  type IWhatsAppMessageRepository,
  type IWhatsAppRepository,
  type IWhatsAppTemplateRepository,
  type WhatsAppClinicMessageContext,
  WHATSAPP_MESSAGE_REPOSITORY_TOKEN,
  WHATSAPP_TEMPLATE_REPOSITORY_TOKEN,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';

@Injectable()
export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  constructor(
    @Inject(WHATSAPP_MESSAGE_REPOSITORY_TOKEN)
    private readonly messages: IWhatsAppMessageRepository,
    @Inject(WHATSAPP_TEMPLATE_REPOSITORY_TOKEN)
    private readonly templates: IWhatsAppTemplateRepository,
  ) {}

  ensureConversation(
    clinicId: string,
    recipientPhone: string,
  ): Promise<string> {
    return this.messages.ensureConversation(clinicId, recipientPhone);
  }

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

import { Injectable } from '@nestjs/common';
import { IWhatsAppRepository } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import {
  WhatsAppMessage,
  WhatsAppTemplate,
} from '@/domains/whatsapp/core/entities';
import { PrismaWhatsAppMessageRepository } from './prisma-whatsapp-message.repository';
import { PrismaWhatsAppTemplateRepository } from './prisma-whatsapp-template.repository';
import type { WhatsAppClinicMessageContext } from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import type {
  PrismaWhatsAppDatabase,
  PrismaWhatsAppMessageRecord,
  PrismaWhatsAppReadClient,
  PrismaWhatsAppTemplateRecord,
} from './prisma-whatsapp.types';

export type {
  PrismaWhatsAppDatabase,
  PrismaWhatsAppMessageRecord,
  PrismaWhatsAppReadClient,
  PrismaWhatsAppTemplateRecord,
};

@Injectable()
export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  constructor(
    private readonly messages: PrismaWhatsAppMessageRepository,
    private readonly templates: PrismaWhatsAppTemplateRepository,
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

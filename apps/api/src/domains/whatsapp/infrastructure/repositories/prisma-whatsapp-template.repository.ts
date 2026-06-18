import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsAppTemplate } from '@/domains/whatsapp/core/entities';
import type {
  IWhatsAppTemplateRepository,
  WhatsAppClinicMessageContext,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import type {
  PrismaWhatsAppDatabase,
  PrismaWhatsAppReadClient,
  PrismaWhatsAppTemplateRecord,
} from './prisma-whatsapp.types';
import { isWhatsAppJsonRecord } from './prisma-whatsapp.mappers';
import {
  toDomainTemplateCategory,
  toDomainTemplateStatus,
  toPrismaTemplateCategory,
  toPrismaTemplateStatus,
  toTemplateButtons,
  toTemplateButtonsInput,
  toTemplateVariables,
  toTemplateVariablesInput,
} from './prisma-whatsapp.mappers';

@Injectable()
export class PrismaWhatsAppTemplateRepository implements IWhatsAppTemplateRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaWhatsAppDatabase,
  ) {}

  private getReadClient(): PrismaWhatsAppReadClient {
    return this.prisma.getReadClient();
  }

  async saveTemplate(template: WhatsAppTemplate): Promise<void> {
    const data = template.toSnapshot();
    await this.prisma.whatsappTemplate.upsert({
      where: { id: data.id },
      update: {
        status: toPrismaTemplateStatus(data.status),
        content: data.content,
        variables: toTemplateVariablesInput(data.variables),
        buttons: toTemplateButtonsInput(data.buttons),
        buttonType: data.buttonType ?? 'NONE',
        metaTemplateId: data.metaTemplateId ?? null,
        category: toPrismaTemplateCategory(data.category),
        updatedAt: data.updatedAt,
      },
      create: {
        id: data.id,
        clinicId: data.clinicId,
        name: data.name,
        category: toPrismaTemplateCategory(data.category),
        content: data.content,
        status: toPrismaTemplateStatus(data.status),
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
    return raw ? this.toDomainTemplate(raw) : null;
  }

  async findTemplateByName(
    clinicId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null> {
    const raw = await this.getReadClient().whatsappTemplate.findFirst({
      where: { clinicId, name },
    });
    return raw ? this.toDomainTemplate(raw) : null;
  }

  async listTemplatesByClinic(clinicId: string): Promise<WhatsAppTemplate[]> {
    const raws = await this.getReadClient().whatsappTemplate.findMany({
      where: { clinicId },
    });
    return raws.map((raw) => this.toDomainTemplate(raw));
  }

  async isAutomationEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      !isWhatsAppJsonRecord(clinic.whatsappAutomation)
    ) {
      return true;
    }

    return clinic.whatsappAutomation.enabled !== false;
  }

  async findClinicMessageContext(
    clinicId: string,
  ): Promise<WhatsAppClinicMessageContext | null> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: {
        tier: true,
        intelligenceAddon: true,
        features: true,
        name: true,
        branding: true,
      },
    });

    if (
      !clinic?.tier ||
      !clinic.intelligenceAddon ||
      typeof clinic.name !== 'string'
    )
      return null;

    return {
      tier: clinic.tier,
      intelligenceAddon: clinic.intelligenceAddon,
      features: clinic.features,
      name: clinic.name,
      branding: clinic.branding,
    };
  }

  private toDomainTemplate(
    raw: PrismaWhatsAppTemplateRecord,
  ): WhatsAppTemplate {
    return new WhatsAppTemplate({
      id: raw.id,
      clinicId: raw.clinicId || '',
      name: raw.name,
      category: toDomainTemplateCategory(raw.category),
      content: raw.content || '',
      status: toDomainTemplateStatus(raw.status),
      variables: toTemplateVariables(raw.variables),
      buttons: toTemplateButtons(raw.buttons),
      buttonType: raw.buttonType,
      metaTemplateId: raw.metaTemplateId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}

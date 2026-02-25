import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_REPOSITORY_TOKEN,
  IWhatsAppRepository,
} from '../ports/whatsapp.repository.port';

@Injectable()
export class WhatsAppQueryService {
  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
  ) {}

  async listTemplates(clinicId: string) {
    const templates = await this.repository.listTemplatesByClinic(clinicId);
    return templates.map((t) => t.toSnapshot());
  }

  async getTemplate(clinicId: string, name: string) {
    const template = await this.repository.findTemplateByName(clinicId, name);
    if (!template) {
      throw new NotFoundException(`Template ${name} not found`);
    }
    return template.toSnapshot();
  }
}

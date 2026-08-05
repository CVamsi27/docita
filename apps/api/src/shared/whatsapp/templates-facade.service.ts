import { Injectable, Logger } from '@nestjs/common';
import type {
  WhatsappButtonType,
  WhatsappTemplateCategory,
  WhatsappTemplateStatus,
} from '@workspace/db';
import type { WhatsAppDefaultTemplateDefinition } from '@workspace/types';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import {
  TemplateResolutionService,
  type ResolvedTemplate,
} from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';

/** Docita catalogue definition minus the partner set. */
type SeedableTemplateDefinition = Omit<
  WhatsAppDefaultTemplateDefinition,
  'category'
> & {
  category: WhatsappTemplateCategory;
};

@Injectable()
export class TemplatesFacadeService {
  private readonly logger = new Logger(TemplatesFacadeService.name);

  constructor(
    private defaultTemplates: DefaultTemplatesService,
    private templateData: TemplateDataService,
    private templateVariable: TemplateVariableService,
    private templateResolution: TemplateResolutionService,
    private templateMode: TemplateModeService,
  ) {}

  getDefaultTemplateNames(): string[] {
    return this.defaultTemplates.getDefaultTemplateNames();
  }

  async getTemplate(templateId: string, clinicId?: string) {
    return this.templateResolution.getTemplate(templateId, clinicId);
  }

  // jscpd:ignore-start
  async resolveTemplate(
    templateId: string,
    variables: Record<string, string>,
    clinicId?: string,
  ): Promise<ResolvedTemplate | null> {
    return this.templateResolution.resolveTemplate(
      templateId,
      variables,
      clinicId,
    );
  }

  getMessageForMode(resolved: ResolvedTemplate): string {
    // jscpd:ignore-end
    return this.templateMode.getMessageForMode(resolved);
  }

  async seedDefaultTemplates(clinicId: string): Promise<void> {
    // Partner templates (Docita-internal) must NOT be cloned into the
    // clinic's per-clinic `WhatsappTemplate` table — they're built into
    // the partner surface and have no clinic-side editor. The
    // `defaultTemplates.templates` map is the full Docita catalogue
    // (including the partner set), so we filter down to the
    // clinic-seedable subset here. The predicate narrows `category` to
    // the Prisma enum: the Docita category schema is exactly the
    // `WhatsappTemplateCategory` enum plus `PARTNER`, so excluding it
    // leaves only values the Prisma layer accepts (checked at runtime
    // by the filter body).
    const seedable = Object.fromEntries(
      Object.entries(this.defaultTemplates.templates).filter(
        (entry): entry is [string, SeedableTemplateDefinition] =>
          entry[1].category !== 'PARTNER',
      ),
    );
    return this.templateData.seedDefaultTemplates(clinicId, seedable);
  }

  async listTemplates(clinicId: string) {
    return this.templateData.listTemplates(clinicId);
  }

  async getTemplateById(id: string) {
    return this.templateData.getTemplateById(id);
  }

  async createTemplate(data: {
    clinicId: string;
    name: string;
    category: WhatsappTemplateCategory;
    content: string;
    buttonType: WhatsappButtonType;
  }) {
    return this.templateData.createTemplate(data);
  }

  async updateTemplate(
    id: string,
    data: { content?: string; category?: WhatsappTemplateCategory },
  ) {
    return this.templateData.updateTemplate(id, data);
  }

  async deleteTemplate(id: string) {
    return this.templateData.deleteTemplate(id);
  }

  async updateTemplateStatus(
    templateId: string,
    status: WhatsappTemplateStatus,
    metaTemplateId?: string,
  ) {
    return this.templateData.updateTemplateStatus(
      templateId,
      status,
      metaTemplateId,
    );
  }

  replaceVariables(content: string, variables: Record<string, string>): string {
    return this.templateVariable.replaceVariables(content, variables);
  }

  isProductionMode(): boolean {
    return this.templateMode.isProductionMode();
  }
}

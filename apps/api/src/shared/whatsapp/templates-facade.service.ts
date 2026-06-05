import { Injectable, Logger } from '@nestjs/common';
import type {
  WhatsappButtonType,
  WhatsappTemplateCategory,
  WhatsappTemplateStatus,
} from '@workspace/db';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import {
  TemplateResolutionService,
  type ResolvedTemplate,
} from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';

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
    return this.templateMode.getMessageForMode(resolved);
  }

  async seedDefaultTemplates(clinicId: string): Promise<void> {
    return this.templateData.seedDefaultTemplates(
      clinicId,
      this.defaultTemplates.templates,
    );
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

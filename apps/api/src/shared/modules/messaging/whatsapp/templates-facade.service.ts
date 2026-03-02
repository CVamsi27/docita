import { Injectable, Logger } from '@nestjs/common';
import type {
  WhatsappTemplateCategory,
  WhatsappButtonType,
  WhatsappTemplateStatus,
} from '@workspace/db';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import {
  TemplateResolutionService,
  ResolvedTemplate,
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

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

/**
 * TemplatesFacadeService - Main facade for WhatsApp templates
 * Responsibilities:
 * - Orchestrate all template specialized services
 * - Maintain public API identical to original TemplatesService
 * - Provide high-level template operations
 */
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

  /**
   * Get all default template names
   * Delegates to DefaultTemplatesService
   */
  getDefaultTemplateNames(): string[] {
    return this.defaultTemplates.getDefaultTemplateNames();
  }

  /**
   * Get a template by ID (custom or default)
   * Delegates to TemplateResolutionService
   */
  async getTemplate(templateId: string, clinicId?: string) {
    return this.templateResolution.getTemplate(templateId, clinicId);
  }

  /**
   * Resolve a template with variables for sending
   * Delegates to TemplateResolutionService
   */
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

  /**
   * Get the message to send based on mode (production vs sandbox)
   * Delegates to TemplateModeService
   */
  getMessageForMode(resolved: ResolvedTemplate): string {
    return this.templateMode.getMessageForMode(resolved);
  }

  /**
   * Seed default templates for a clinic
   * Delegates to TemplateDataService
   */
  async seedDefaultTemplates(clinicId: string): Promise<void> {
    return this.templateData.seedDefaultTemplates(
      clinicId,
      this.defaultTemplates.templates,
    );
  }

  /**
   * List all templates for a clinic
   * Delegates to TemplateDataService
   */
  async listTemplates(clinicId: string) {
    return this.templateData.listTemplates(clinicId);
  }

  /**
   * Update template status
   * Delegates to TemplateDataService
   */
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

  /**
   * Replace variables in content
   * Delegates to TemplateVariableService
   */
  replaceVariables(content: string, variables: Record<string, string>): string {
    return this.templateVariable.replaceVariables(content, variables);
  }

  /**
   * Check if running in production mode
   * Delegates to TemplateModeService
   */
  isProductionMode(): boolean {
    return this.templateMode.isProductionMode();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';

interface TemplateButton {
  id: string;
  text: string;
  action?: string;
}

interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Resolved template ready for sending
 */
export interface ResolvedTemplate {
  content: string;
  buttons?: TemplateButton[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  textFallback: string;
  metaTemplateId?: string;
}

/**
 * TemplateResolutionService - Resolves templates with variables for sending
 * Responsibilities:
 * - Loading template (custom or default)
 * - Validating variables
 * - Resolving variables in content and buttons
 * - Preparing template for sending
 */
@Injectable()
export class TemplateResolutionService {
  private readonly logger = new Logger(TemplateResolutionService.name);

  constructor(
    private defaultTemplates: DefaultTemplatesService,
    private templateData: TemplateDataService,
    private templateVariable: TemplateVariableService,
  ) {}

  /**
   * Get a template (custom first, then default fallback)
   */
  async getTemplate(templateId: string, clinicId?: string) {
    // First, check if clinic has a custom template
    if (clinicId) {
      const customTemplate = await this.templateData.getCustomTemplate(
        templateId,
        clinicId,
      );

      if (customTemplate) {
        return {
          name: customTemplate.name,
          category: customTemplate.category,
          content: customTemplate.content,
          variables:
            (customTemplate.variables as unknown as TemplateVariable[]) || [],
          buttonType: customTemplate.buttonType,
          buttons: customTemplate.buttons as unknown as
            | TemplateButton[]
            | undefined,
          textFallback: customTemplate.content,
          metaTemplateId: customTemplate.metaTemplateId || undefined,
        };
      }
    }

    // Fall back to default templates
    const defaultTemplate =
      this.defaultTemplates.getDefaultTemplate(templateId);
    if (defaultTemplate) {
      return defaultTemplate;
    }

    return null;
  }

  /**
   * Resolve a template with variables - the core abstraction
   * Always use this method, never construct messages directly
   */
  async resolveTemplate(
    templateId: string,
    variables: Record<string, string>,
    clinicId?: string,
  ): Promise<ResolvedTemplate | null> {
    const template = await this.getTemplate(templateId, clinicId);
    if (!template) {
      this.logger.warn(`Template not found: ${templateId}`);
      return null;
    }

    // Validate required variables
    const { valid } = this.templateVariable.validateRequiredVariables(
      templateId,
      variables,
      template.variables,
    );

    if (!valid) {
      return null;
    }

    // Fill in default values
    const filledVariables = this.templateVariable.fillDefaults(
      variables,
      template.variables,
    );

    // Resolve content with variables
    const resolvedContent = this.templateVariable.replaceVariables(
      template.content,
      filledVariables,
    );
    const resolvedFallback = this.templateVariable.replaceVariables(
      template.textFallback,
      filledVariables,
    );

    // Resolve buttons if present
    let resolvedButtons: TemplateButton[] | undefined;
    if (template.buttons) {
      resolvedButtons = template.buttons.map((button) => ({
        ...button,
        action: button.action
          ? this.templateVariable.replaceVariables(button.action, filledVariables)
          : undefined,
      }));
    }

    this.logger.debug(`Resolved template ${templateId} with variables`);

    return {
      content: resolvedContent,
      buttons: resolvedButtons,
      buttonType: (template.buttonType === 'NONE' ? 'QUICK_REPLY' : template.buttonType) as 'QUICK_REPLY' | 'CALL_TO_ACTION',
      textFallback: resolvedFallback,
      metaTemplateId: (template as any).metaTemplateId,
    };
  }
}

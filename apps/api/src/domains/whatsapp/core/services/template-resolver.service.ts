import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  IWhatsAppRepository,
  WHATSAPP_REPOSITORY_TOKEN,
} from '../../application/ports/whatsapp.repository.port';
import {
  DefaultTemplatesService,
  TemplateVariable,
  TemplateButton,
} from './default-templates.service';

export interface ResolvedTemplate {
  content: string;
  buttons?: TemplateButton[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  textFallback: string;
  metaTemplateId?: string;
}

@Injectable()
export class TemplateResolverService {
  private readonly logger = new Logger(TemplateResolverService.name);

  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN)
    private readonly repository: IWhatsAppRepository,
    private readonly defaultTemplates: DefaultTemplatesService,
  ) {}

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

    const { valid } = this.validateRequiredVariables(
      templateId,
      variables,
      template.variables,
    );

    if (!valid) {
      return null;
    }

    const filledVariables = this.fillDefaults(variables, template.variables);
    const resolvedContent = this.replaceVariables(
      template.content,
      filledVariables,
    );
    const resolvedFallback = this.replaceVariables(
      template.textFallback,
      filledVariables,
    );

    let resolvedButtons: TemplateButton[] | undefined;
    if (template.buttons) {
      resolvedButtons = template.buttons.map((button) => ({
        ...button,
        action: button.action
          ? this.replaceVariables(button.action, filledVariables)
          : undefined,
      }));
    }

    return {
      content: resolvedContent,
      buttons: resolvedButtons,
      buttonType:
        template.buttonType === 'NONE'
          ? 'QUICK_REPLY'
          : (template.buttonType as 'QUICK_REPLY' | 'CALL_TO_ACTION'),
      textFallback: resolvedFallback,
      metaTemplateId: template.metaTemplateId,
    };
  }

  private async getTemplate(
    templateId: string,
    clinicId?: string,
  ): Promise<{
    name: string;
    category: string;
    content: string;
    variables: TemplateVariable[];
    buttonType: string;
    buttons?: TemplateButton[];
    textFallback: string;
    metaTemplateId?: string;
  } | null> {
    if (clinicId) {
      const customTemplate = await this.repository.findTemplateByName(
        clinicId,
        templateId,
      );
      if (customTemplate) {
        return {
          name: customTemplate.name,
          category: customTemplate.category,
          content: customTemplate.content,
          variables:
            (customTemplate.variables as unknown as TemplateVariable[]) || [],
          buttonType: (customTemplate.buttonType as any) || 'QUICK_REPLY',
          buttons: customTemplate.buttons as unknown as
            | TemplateButton[]
            | undefined,
          textFallback: customTemplate.content,
          metaTemplateId: customTemplate.metaTemplateId || undefined,
        };
      }
    }

    const defaultTemplate =
      this.defaultTemplates.getDefaultTemplate(templateId);
    return defaultTemplate || null;
  }

  private validateRequiredVariables(
    templateId: string,
    variables: Record<string, string>,
    requiredVariables: TemplateVariable[],
  ): { valid: boolean; missingVariables: string[] } {
    const missingVariables: string[] = [];

    for (const variable of requiredVariables) {
      if (variable.required && !variables[variable.name]) {
        if (!variable.defaultValue) {
          missingVariables.push(variable.name);
        }
      }
    }

    if (missingVariables.length > 0) {
      this.logger.warn(
        `Template ${templateId} missing required variables: ${missingVariables.join(', ')}`,
      );
      return { valid: false, missingVariables };
    }

    return { valid: true, missingVariables: [] };
  }

  private fillDefaults(
    variables: Record<string, string>,
    templateVariables: TemplateVariable[],
  ): Record<string, string> {
    const result = { ...variables };

    for (const variable of templateVariables) {
      if (!result[variable.name] && variable.defaultValue) {
        result[variable.name] = variable.defaultValue;
      }
    }

    return result;
  }

  private replaceVariables(
    content: string,
    variables: Record<string, string>,
  ): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }
}

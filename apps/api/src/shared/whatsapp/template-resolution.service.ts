// jscpd:ignore-start
import { Injectable, Logger } from '@nestjs/common';
import { isRecord } from '@workspace/utils';
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

function getMetaTemplateId(template: unknown): string | undefined {
  // jscpd:ignore-end
  if (!isRecord(template)) {
    return undefined;
  }

  const raw = template.metaTemplateId;
  return typeof raw === 'string' ? raw : undefined;
}

export interface ResolvedTemplate {
  content: string;
  buttons?: TemplateButton[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  textFallback: string;
  metaTemplateId?: string;
  variables: TemplateVariable[];
  buttonUrlVariable?: string;
}

@Injectable()
export class TemplateResolutionService {
  private readonly logger = new Logger(TemplateResolutionService.name);

  constructor(
    private defaultTemplates: DefaultTemplatesService,
    private templateData: TemplateDataService,
    private templateVariable: TemplateVariableService,
  ) {}

  private toTemplateVariables(value: unknown): TemplateVariable[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      )
      .map((item) => ({
        name: typeof item.name === 'string' ? item.name : '',
        required: typeof item.required === 'boolean' ? item.required : false,
        defaultValue:
          typeof item.defaultValue === 'string' ? item.defaultValue : undefined,
      }))
      .filter((item) => item.name.length > 0);
  }

  private toTemplateButtons(value: unknown): TemplateButton[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const buttons = value
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      )
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        text: typeof item.text === 'string' ? item.text : '',
        action: typeof item.action === 'string' ? item.action : undefined,
      }))
      .filter((item) => item.id.length > 0 && item.text.length > 0);

    return buttons.length > 0 ? buttons : undefined;
  }

  async getTemplate(templateId: string, clinicId?: string) {
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
          variables: this.toTemplateVariables(customTemplate.variables),
          buttonType: customTemplate.buttonType,
          buttons: this.toTemplateButtons(customTemplate.buttons),
          textFallback: customTemplate.content,
          metaTemplateId: customTemplate.metaTemplateId || undefined,
        };
      }
    }

    const defaultTemplate =
      this.defaultTemplates.getDefaultTemplate(templateId);
    if (defaultTemplate) {
      return {
        ...defaultTemplate,
        textFallback: defaultTemplate.textFallback,
        metaTemplateId: undefined,
      };
    }

    return null;
  }

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
    const { valid } = this.templateVariable.validateRequiredVariables(
      templateId,
      variables,
      template.variables,
    );
    if (!valid) return null;

    const filledVariables = this.templateVariable.fillDefaults(
      variables,
      template.variables,
    );
    const resolvedContent = this.templateVariable.replaceVariables(
      template.content,
      filledVariables,
    );
    const resolvedFallback = this.templateVariable.replaceVariables(
      template.textFallback,
      filledVariables,
    );

    let resolvedButtons: TemplateButton[] | undefined;
    if (template.buttons) {
      resolvedButtons = template.buttons.map((button) => ({
        ...button,
        action: button.action
          ? this.templateVariable.replaceVariables(
              button.action,
              filledVariables,
            )
          : undefined,
      }));
    }

    this.logger.debug(`Resolved template ${templateId} with variables`);
    return {
      content: resolvedContent,
      buttons: resolvedButtons,
      buttonType:
        template.buttonType === 'NONE' ? 'QUICK_REPLY' : template.buttonType,
      textFallback: resolvedFallback,
      metaTemplateId: getMetaTemplateId(template),
      variables: template.variables,
      buttonUrlVariable:
        'buttonUrlVariable' in template &&
        typeof template.buttonUrlVariable === 'string'
          ? template.buttonUrlVariable
          : undefined,
    };
  }
}

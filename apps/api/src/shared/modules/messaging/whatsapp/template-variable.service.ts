import { Injectable, Logger } from '@nestjs/common';

interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

@Injectable()
export class TemplateVariableService {
  private readonly logger = new Logger(TemplateVariableService.name);

  replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  validateRequiredVariables(
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

  fillDefaults(
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

  extractVariableNames(content: string): string[] {
    const regex = /{{(\w+)}}/g;
    const matches = content.match(regex);

    if (!matches) {
      return [];
    }

    return matches.map((match) => match.slice(2, -2));
  }
}

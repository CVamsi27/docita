import {
  WHATSAPP_DEFAULT_TEMPLATES,
  getAllWhatsAppDefaultTemplates,
  getWhatsAppDefaultTemplate,
  getWhatsAppDefaultTemplateNames,
  type WhatsAppDefaultTemplateDefinition,
} from '@workspace/types';

/** Shared loader over Zod-validated default template config. */
export class DefaultTemplatesLoader {
  readonly templates: Record<string, WhatsAppDefaultTemplateDefinition> =
    WHATSAPP_DEFAULT_TEMPLATES;

  getDefaultTemplateNames(): string[] {
    return getWhatsAppDefaultTemplateNames();
  }

  getDefaultTemplate(
    templateId: string,
  ): WhatsAppDefaultTemplateDefinition | null {
    return getWhatsAppDefaultTemplate(templateId);
  }

  getAllDefaultTemplates(): WhatsAppDefaultTemplateDefinition[] {
    return getAllWhatsAppDefaultTemplates();
  }
}

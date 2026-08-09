import {
  WHATSAPP_DEFAULT_TEMPLATES,
  getAllWhatsAppDefaultTemplates,
  getWhatsAppDefaultTemplate,
  type WhatsAppDefaultTemplateDefinition,
} from '@workspace/types';

/** Shared loader over Zod-validated default template config. */
export class DefaultTemplatesLoader {
  readonly templates: Record<string, WhatsAppDefaultTemplateDefinition> =
    WHATSAPP_DEFAULT_TEMPLATES;

  getDefaultTemplate(
    templateId: string,
  ): WhatsAppDefaultTemplateDefinition | null {
    return getWhatsAppDefaultTemplate(templateId);
  }

  getAllDefaultTemplates(): WhatsAppDefaultTemplateDefinition[] {
    return getAllWhatsAppDefaultTemplates();
  }
}

import { z } from 'zod';
import { WHATSAPP_DEFAULT_TEMPLATES_RAW } from './default-templates.data';

export const whatsappDefaultTemplateCategorySchema = z.enum([
  'APPOINTMENT',
  'PRESCRIPTION',
  'INVOICE',
  'PAYMENT',
  'FOLLOW_UP',
  'MARKETING',
  'STAFF_NOTIFICATION',
  'AUTHENTICATION',
]);

export const whatsappDefaultTemplateVariableSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  defaultValue: z.string().optional(),
});

export const whatsappDefaultTemplateButtonSchema = z.object({
  id: z.string(),
  text: z.string(),
  action: z.string().optional(),
});

/** Prisma `WhatsappTemplate.variables` — DB may store explicit nulls. */
export const whatsappTemplateVariableJsonSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  defaultValue: z.string().nullish(),
});

/** Prisma `WhatsappTemplate.buttons` — DB may store explicit nulls. */
export const whatsappTemplateButtonJsonSchema = z.object({
  id: z.string(),
  text: z.string(),
  action: z.string().nullish(),
});

export const whatsappTemplateVariablesSchema = z.array(
  whatsappTemplateVariableJsonSchema,
);
export const whatsappTemplateButtonsSchema = z.array(
  whatsappTemplateButtonJsonSchema,
);
export const whatsappBroadcastVariablesSchema = z.record(
  z.string(),
  z.string(),
);

export const whatsappDefaultTemplateButtonTypeSchema = z.enum([
  'QUICK_REPLY',
  'CALL_TO_ACTION',
  'NONE',
]);

export const whatsappDefaultTemplateDefinitionSchema = z.object({
  name: z.string(),
  category: whatsappDefaultTemplateCategorySchema,
  content: z.string(),
  variables: z.array(whatsappDefaultTemplateVariableSchema),
  buttonType: whatsappDefaultTemplateButtonTypeSchema,
  buttons: z.array(whatsappDefaultTemplateButtonSchema).optional(),
  textFallback: z.string(),
});

export const whatsappDefaultTemplatesRecordSchema = z.record(
  z.string(),
  whatsappDefaultTemplateDefinitionSchema,
);

export type WhatsAppDefaultTemplateCategory = z.infer<
  typeof whatsappDefaultTemplateCategorySchema
>;
export type WhatsAppDefaultTemplateVariable = z.infer<
  typeof whatsappDefaultTemplateVariableSchema
>;
export type WhatsAppDefaultTemplateButton = z.infer<
  typeof whatsappDefaultTemplateButtonSchema
>;
export type WhatsAppDefaultTemplateDefinition = z.infer<
  typeof whatsappDefaultTemplateDefinitionSchema
>;

/** Backward-compatible aliases used by API domain code. */
export type TemplateCategory = WhatsAppDefaultTemplateCategory;
export type TemplateVariable = WhatsAppDefaultTemplateVariable;
export type TemplateButton = WhatsAppDefaultTemplateButton;
export type DefaultTemplateDefinition = WhatsAppDefaultTemplateDefinition;

export const WHATSAPP_DEFAULT_TEMPLATES =
  whatsappDefaultTemplatesRecordSchema.parse(WHATSAPP_DEFAULT_TEMPLATES_RAW);

export function getWhatsAppDefaultTemplateNames(): string[] {
  return Object.keys(WHATSAPP_DEFAULT_TEMPLATES);
}

export function getWhatsAppDefaultTemplate(
  templateId: string,
): WhatsAppDefaultTemplateDefinition | null {
  return WHATSAPP_DEFAULT_TEMPLATES[templateId] ?? null;
}

export function getAllWhatsAppDefaultTemplates(): WhatsAppDefaultTemplateDefinition[] {
  return Object.values(WHATSAPP_DEFAULT_TEMPLATES);
}

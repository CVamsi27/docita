import { z } from "zod";
import { whatsappMessageTypeSchema } from "./index";

export const whatsappTemplateParameterSchema = z.object({
  type: z.enum(["text", "currency", "date_time", "image", "document", "video"]),
  text: z.string().optional(),
  currency: z
    .object({
      fallback_value: z.string(),
      code: z.string(),
      amount_1000: z.number(),
    })
    .optional(),
  date_time: z
    .object({
      fallback_value: z.string(),
    })
    .optional(),
  image: z
    .object({
      link: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
});

export const whatsappTemplateComponentSchema = z.object({
  type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTON"]),
  parameters: z.array(whatsappTemplateParameterSchema).optional(),
  text: z.string().optional(), // For simple text components
});

export const whatsappTemplateSchema = z.object({
  name: z.string(),
  language: z.string(),
  status: z.string(),
  category: z.string(),
  components: z.array(whatsappTemplateComponentSchema).optional(),
});

export const whatsappMessageResponseSchema = z.object({
  messaging_product: z.string(),
  contacts: z.array(z.object({ input: z.string(), wa_id: z.string() })),
  messages: z.array(z.object({ id: z.string() })),
});

export const whatsappLogSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string().optional(),
  type: whatsappMessageTypeSchema,
  status: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  messageId: z.string().optional(),
  content: z.unknown().optional(),
  createdAt: z.date().or(z.string()),
});

export const whatsappStatsSchema = z.object({
  sent: z.number(),
  delivered: z.number(),
  read: z.number(),
  failed: z.number(),
  templates: z.number(),
});

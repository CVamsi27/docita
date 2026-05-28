import { z } from "zod";
import { whatsappMessageTypeSchema } from "./users";

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
  text: z.string().optional(),
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

export const supportWhatsAppMessageDirectionSchema = z.enum([
  "INBOUND",
  "OUTBOUND",
]);

export const supportWhatsAppMessageStatusSchema = z.enum([
  "PENDING",
  "NEW",
  "READ",
  "REPLIED",
  "ARCHIVED",
  "SENT",
  "DELIVERED",
  "FAILED",
]);

export const supportWhatsAppMessageSchema = z.object({
  id: z.string(),
  providerMessageId: z.string(),
  providerSentMessageId: z.string().nullable().optional(),
  threadPhoneNumber: z.string(),
  supportPhoneNumber: z.string(),
  senderPhoneNumber: z.string(),
  senderName: z.string().nullable().optional(),
  direction: supportWhatsAppMessageDirectionSchema,
  messageType: z.string(),
  messageBody: z.string(),
  status: supportWhatsAppMessageStatusSchema,
  receivedAt: z.date().or(z.string()),
  respondedAt: z.date().or(z.string()).nullable().optional(),
  replyToProviderMessageId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const supportWhatsAppThreadSummarySchema = z.object({
  threadPhoneNumber: z.string(),
  supportPhoneNumber: z.string(),
  senderName: z.string().nullable().optional(),
  lastMessageId: z.string(),
  lastMessageBody: z.string(),
  lastMessageType: z.string(),
  lastMessageDirection: supportWhatsAppMessageDirectionSchema,
  lastMessageStatus: supportWhatsAppMessageStatusSchema,
  lastMessageAt: z.date().or(z.string()),
  messageCount: z.number().int().min(0),
  unreadCount: z.number().int().min(0),
});

export const supportWhatsAppMessageListResponseSchema = z.array(
  supportWhatsAppMessageSchema,
);

export const supportWhatsAppThreadListResponseSchema = z.array(
  supportWhatsAppThreadSummarySchema,
);

export const supportWhatsAppReplyRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    replyToProviderMessageId: z.string().optional(),
  })
  .strict();

/** Reply response shares the same shape as a message but is a distinct schema object. */
export const supportWhatsAppReplyResponseSchema =
  supportWhatsAppMessageSchema.describe("SupportWhatsAppReplyResponse");

export const supportWhatsAppReadResponseSchema = z.object({
  updatedCount: z.number().int().min(0),
});

export type SupportWhatsAppMessage = z.infer<
  typeof supportWhatsAppMessageSchema
>;
export type SupportWhatsAppMessageDirection = z.infer<
  typeof supportWhatsAppMessageDirectionSchema
>;
export type SupportWhatsAppMessageStatus = z.infer<
  typeof supportWhatsAppMessageStatusSchema
>;
export type SupportWhatsAppThreadSummary = z.infer<
  typeof supportWhatsAppThreadSummarySchema
>;
export type SupportWhatsAppReplyRequest = z.infer<
  typeof supportWhatsAppReplyRequestSchema
>;

export const whatsappStatsSchema = z.object({
  sent: z.number(),
  delivered: z.number(),
  read: z.number(),
  failed: z.number(),
  templates: z.number(),
});

export const whatsappBroadcastJobStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const whatsappBroadcastRecipientStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED",
]);

export const whatsappBroadcastRecipientInputSchema = z
  .object({
    phoneNumber: z.string().trim().min(7).max(20),
    name: z.string().trim().max(120).optional(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export const createWhatsAppBroadcastJobRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    audienceLabel: z.string().trim().max(120).optional(),
    templateName: z.string().trim().max(200).optional(),
    languageCode: z.string().trim().min(2).max(10).default("en"),
    messageText: z.string().trim().max(4000).optional(),
    recipients: z
      .array(whatsappBroadcastRecipientInputSchema)
      .min(1)
      .max(10000),
  })
  .strict()
  .refine(
    (data) => Boolean(data.templateName) || Boolean(data.messageText),
    {
      message: "Either templateName or messageText must be provided",
      path: ["templateName"],
    },
  );

export const whatsappBroadcastJobSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  audienceLabel: z.string().nullable().optional(),
  templateName: z.string().nullable().optional(),
  languageCode: z.string(),
  messageText: z.string().nullable().optional(),
  totalCount: z.number().int().min(0),
  sentCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  status: whatsappBroadcastJobStatusSchema,
  createdBy: z.string().nullable().optional(),
  startedAt: z.date().or(z.string()).nullable().optional(),
  completedAt: z.date().or(z.string()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const whatsappBroadcastRecipientSchema = z.object({
  id: z.string(),
  broadcastJobId: z.string(),
  phoneNumber: z.string(),
  name: z.string().nullable().optional(),
  status: whatsappBroadcastRecipientStatusSchema,
  providerMessageId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  sentAt: z.date().or(z.string()).nullable().optional(),
  createdAt: z.date().or(z.string()),
});

export const whatsappBroadcastJobDetailSchema =
  whatsappBroadcastJobSummarySchema.extend({
    recipients: z.array(whatsappBroadcastRecipientSchema),
  });

export const whatsappBroadcastJobListResponseSchema = z.array(
  whatsappBroadcastJobSummarySchema,
);

export type WhatsAppBroadcastJobStatus = z.infer<
  typeof whatsappBroadcastJobStatusSchema
>;
export type WhatsAppBroadcastRecipientStatus = z.infer<
  typeof whatsappBroadcastRecipientStatusSchema
>;
export type WhatsAppBroadcastRecipientInput = z.infer<
  typeof whatsappBroadcastRecipientInputSchema
>;
export type CreateWhatsAppBroadcastJobRequest = z.infer<
  typeof createWhatsAppBroadcastJobRequestSchema
>;
export type WhatsAppBroadcastJobSummary = z.infer<
  typeof whatsappBroadcastJobSummarySchema
>;
export type WhatsAppBroadcastRecipient = z.infer<
  typeof whatsappBroadcastRecipientSchema
>;
export type WhatsAppBroadcastJobDetail = z.infer<
  typeof whatsappBroadcastJobDetailSchema
>;

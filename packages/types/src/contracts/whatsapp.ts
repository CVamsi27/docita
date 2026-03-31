import { z } from "zod";
import {
  whatsappLogSchema,
  whatsappMessageResponseSchema,
  whatsappStatsSchema,
  whatsappTemplateSchema,
} from "../shared/whatsapp";

export const sendWhatsAppMessageRequestSchema = z.object({
  recipientPhone: z.string(),
  templateName: z.string(),
  variables: z.record(z.string()),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();

export const sendTemplateRequestSchema = z.object({
  templateId: z.string(),
  phoneNumber: z.string(),
  variables: z.record(z.string()),
  patientId: z.string().optional(),
  appointmentId: z.string().optional(),
  prescriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
}).strict();

export const whatsappWebhookVerifyQuerySchema = z.object({
  "hub.mode": z.string(),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});

export const whatsappWebhookDeliveryStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string(),
  recipient_id: z.string(),
  conversation: z
    .object({
      id: z.string(),
      origin: z.object({ type: z.string() }),
      expiration_timestamp: z.string().optional(),
    })
    .optional(),
  pricing: z
    .object({
      billable: z.boolean(),
      pricing_model: z.string(),
      category: z.string(),
    })
    .optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
        message: z.string().optional(),
        error_data: z.object({ details: z.string() }).optional(),
      }),
    )
    .optional(),
});

export const whatsappWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z
              .array(
                z.object({
                  profile: z.object({ name: z.string() }),
                  wa_id: z.string(),
                }),
              )
              .optional(),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  type: z.enum([
                    "text",
                    "interactive",
                    "image",
                    "document",
                    "audio",
                    "video",
                    "location",
                    "contacts",
                    "button",
                  ]),
                  text: z.object({ body: z.string() }).optional(),
                  interactive: z
                    .object({
                      type: z.enum(["button_reply", "list_reply"]),
                      button_reply: z
                        .object({ id: z.string(), title: z.string() })
                        .optional(),
                      list_reply: z
                        .object({
                          id: z.string(),
                          title: z.string(),
                          description: z.string().optional(),
                        })
                        .optional(),
                    })
                    .optional(),
                  button: z
                    .object({ text: z.string(), payload: z.string() })
                    .optional(),
                }),
              )
              .optional(),
            statuses: z.array(whatsappWebhookDeliveryStatusSchema).optional(),
          }),
          field: z.string(),
        }),
      ),
    }),
  ),
});

export const whatsappSendMessageResponseSchema = z.object({
  messageId: z.string(),
});

export const whatsappWebhookAckResponseSchema = z.object({
  status: z.literal("ok"),
});

export const whatsappTemplateListResponseSchema = z.object({
  data: z.array(whatsappTemplateSchema),
});

export const whatsappDefaultTemplatesResponseSchema = z.array(z.string());

export const whatsappLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  patientId: z.string().optional(),
  type: z.string().optional(),
});

export const whatsappUnreadNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const whatsappUnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});

export const staffNotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.unknown().optional(),
  priority: z.string(),
  createdAt: z.date().or(z.string()),
});

export const whatsappUnreadNotificationsResponseSchema = z.array(
  staffNotificationSchema,
);

export const whatsappSettingsResponseSchema = z.object({
  appointmentReminders: z.boolean(),
  followUpMessages: z.boolean(),
  birthdayWishes: z.boolean(),
  medicineReminders: z.boolean(),
  labReportNotifications: z.boolean(),
  emergencyAlerts: z.boolean(),
});

export const updateWhatsAppSettingsRequestSchema = whatsappSettingsResponseSchema
  .partial()
  .strict();

export const createMedicineReminderRequestSchema = z.object({
  medicineName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  reminderTime: z.string(),
  patientPhone: z.string(),
}).strict();

export const createWhatsAppBroadcastRequestSchema = z.object({
  campaignName: z.string(),
  message: z.string(),
  sendToAllPatients: z.boolean(),
  sendToSpecificPatients: z.boolean(),
  scheduleTime: z.string().optional(),
}).strict();

export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const whatsappStatsDetailedResponseSchema = z.object({
  totalPatients: z.number(),
  subscribers: z.number(),
  deliveryRate: z.number().optional(),
  responseRate: z.number().optional(),
});

export const whatsappLogListResponseSchema = z.array(whatsappLogSchema);
export const whatsappStatsResponseSchema = whatsappStatsSchema;
export const whatsappMessageProviderResponseSchema = whatsappMessageResponseSchema;

export type SendWhatsAppMessageRequest = z.infer<
  typeof sendWhatsAppMessageRequestSchema
>;
export type SendTemplateRequest = z.infer<typeof sendTemplateRequestSchema>;
export type WhatsAppWebhookVerifyQuery = z.infer<
  typeof whatsappWebhookVerifyQuerySchema
>;
export type WhatsAppWebhookPayload = z.infer<
  typeof whatsappWebhookPayloadSchema
>;
export type WhatsAppWebhookDeliveryStatus = z.infer<
  typeof whatsappWebhookDeliveryStatusSchema
>;
export type WhatsAppSendMessageResponse = z.infer<
  typeof whatsappSendMessageResponseSchema
>;
export type WhatsAppWebhookAckResponse = z.infer<
  typeof whatsappWebhookAckResponseSchema
>;
export type WhatsAppTemplateListResponse = z.infer<
  typeof whatsappTemplateListResponseSchema
>;
export type WhatsAppDefaultTemplatesResponse = z.infer<
  typeof whatsappDefaultTemplatesResponseSchema
>;
export type WhatsAppLogsQuery = z.infer<typeof whatsappLogsQuerySchema>;
export type WhatsAppUnreadNotificationsQuery = z.infer<
  typeof whatsappUnreadNotificationsQuerySchema
>;
export type WhatsAppUnreadCountResponse = z.infer<
  typeof whatsappUnreadCountResponseSchema
>;
export type StaffNotificationEntry = z.infer<typeof staffNotificationSchema>;
export type WhatsAppUnreadNotificationsResponse = z.infer<
  typeof whatsappUnreadNotificationsResponseSchema
>;
export type WhatsAppSettingsResponse = z.infer<
  typeof whatsappSettingsResponseSchema
>;
export type UpdateWhatsAppSettingsRequest = z.infer<
  typeof updateWhatsAppSettingsRequestSchema
>;
export type CreateMedicineReminderRequest = z.infer<
  typeof createMedicineReminderRequestSchema
>;
export type CreateWhatsAppBroadcastRequest = z.infer<
  typeof createWhatsAppBroadcastRequestSchema
>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type WhatsAppStatsDetailedResponse = z.infer<
  typeof whatsappStatsDetailedResponseSchema
>;
export type WhatsAppLogListResponse = z.infer<
  typeof whatsappLogListResponseSchema
>;
export type WhatsAppStatsResponse = z.infer<typeof whatsappStatsResponseSchema>;
export type WhatsAppMessageProviderResponse = z.infer<
  typeof whatsappMessageProviderResponseSchema
>;

import { z } from "zod";
import {
  whatsappMessageResponseSchema,
  whatsappStatsSchema,
  whatsappTemplateSchema,
} from "../shared/whatsapp";

export const sendWhatsAppMessageRequestSchema = z
  .object({
    recipientPhone: z.string(),
    templateName: z.string(),
    variables: z.record(z.string()),
    metadata: z
      .record(z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  })
  .strict();

export const sendTemplateRequestSchema = z
  .object({
    templateId: z.string(),
    phoneNumber: z.string(),
    variables: z.record(z.string()),
    patientId: z.string().optional(),
    appointmentId: z.string().optional(),
    prescriptionId: z.string().optional(),
    invoiceId: z.string().optional(),
  })
  .strict();

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
                  context: z
                    .object({
                      from: z.string().optional(),
                      id: z.string(),
                    })
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

/**
 * Clinic-authored custom message templates. These mirror the
 * `WhatsappTemplate` rows scoped to a clinic and are surfaced both in the
 * Settings management UI and the per-patient composer's template picker.
 */
export const whatsappTemplateCategorySchema = z.enum([
  "APPOINTMENT",
  "PRESCRIPTION",
  "INVOICE",
  "PAYMENT",
  "FOLLOW_UP",
  "MARKETING",
  "STAFF_NOTIFICATION",
  "AUTHENTICATION",
]);

export const clinicWhatsappTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: whatsappTemplateCategorySchema,
  content: z.string(),
  status: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  updatedAt: z.string().or(z.date()),
});

export const clinicWhatsappTemplateListResponseSchema = z.array(
  clinicWhatsappTemplateSchema,
);

export const createWhatsappTemplateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(2000),
    category: whatsappTemplateCategorySchema.default("FOLLOW_UP"),
  })
  .strict();

export const updateWhatsappTemplateRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(2000).optional(),
    category: whatsappTemplateCategorySchema.optional(),
  })
  .strict();

/**
 * Ad-hoc free-text message to a patient. Per WhatsApp policy this only
 * delivers inside the 24h customer-service window; outside it an approved
 * template is required (surfaced as guidance in the composer UI).
 */
export const sendWhatsAppCustomMessageRequestSchema = z
  .object({
    patientId: z.string().trim().min(1),
    text: z.string().trim().min(1).max(4096),
  })
  .strict();

export const sendWhatsAppCustomMessageResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string(),
});

/**
 * Outbound-only history of WhatsApp messages sent to a patient. This is a
 * one-way send log (no inbound replies / conversation threading) sourced from
 * `whatsappLog` rows.
 */
export const clinicWhatsappSentMessageSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: z.string(),
  status: z.string(),
  phoneNumber: z.string(),
  createdAt: z.string().or(z.date()),
  patientName: z.string().optional(),
});

export const clinicWhatsappSentMessageListResponseSchema = z.array(
  clinicWhatsappSentMessageSchema,
);

export const clinicWhatsappConversationSchema = z.object({
  id: z.string(),
  patientId: z.string().nullable(),
  patientName: z.string().nullable(),
  maskedPhoneNumber: z.string(),
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]),
  unreadCount: z.number().int().min(0),
  lastMessageAt: z.string().or(z.date()).nullable(),
  lastMessagePreview: z.string().nullable(),
});

export const clinicWhatsappConversationListResponseSchema = z.array(
  clinicWhatsappConversationSchema,
);

export const clinicWhatsappConversationMessageSchema = z.object({
  id: z.string(),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  messageType: z.string(),
  content: z.string(),
  status: z.string(),
  createdAt: z.string().or(z.date()),
  errorMessage: z.string().nullable(),
});

export const clinicWhatsappConversationMessageListResponseSchema = z.array(
  clinicWhatsappConversationMessageSchema,
);

export const clinicWhatsappConversationReplyRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(4096),
  })
  .strict();

export const clinicWhatsappConversationReadResponseSchema = z.object({
  updated: z.literal(true),
});

export const clinicWhatsappCampaignAudienceSchema = z
  .object({
    patientIds: z.array(z.string().trim().min(1)).min(1).max(10000),
  })
  .strict();

export const clinicWhatsappCampaignPreviewRequestSchema =
  clinicWhatsappCampaignAudienceSchema.extend({}).strict();

export const clinicWhatsappCampaignPreviewResponseSchema = z.object({
  eligibleCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
});

export const createClinicWhatsappCampaignRequestSchema =
  clinicWhatsappCampaignAudienceSchema
    .extend({
      title: z.string().trim().min(1).max(200),
      templateName: z.string().trim().min(1).max(200),
      languageCode: z.string().trim().min(2).max(10).default("en"),
    })
    .strict();

export const clinicWhatsappCampaignSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  templateName: z.string().nullable(),
  totalCount: z.number().int().min(0),
  sentCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
  createdAt: z.string().or(z.date()),
  completedAt: z.string().or(z.date()).nullable(),
});

export const clinicWhatsappCampaignListResponseSchema = z.array(
  clinicWhatsappCampaignSummarySchema,
);

export const clinicWhatsappCampaignCancelResponseSchema = z.object({
  cancelled: z.literal(true),
});

export const whatsappSenderModeSchema = z.enum(["SHARED", "BYO", "MANAGED"]);
export const whatsappSenderStatusSchema = z.enum([
  "NOT_CONFIGURED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "FAILED",
  "REVOKED",
]);

export const whatsappSenderConfigResponseSchema = z.object({
  mode: whatsappSenderModeSchema,
  status: whatsappSenderStatusSchema,
  phoneNumberId: z.string().nullable(),
  wabaId: z.string().nullable(),
  displayName: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  tokenExpiresAt: z.string().nullable(),
  lastVerifyError: z.string().nullable(),
  allowedModes: z.array(whatsappSenderModeSchema),
  fallbackActive: z.boolean(),
});

export const updateWhatsappSenderRequestSchema = z
  .object({
    mode: whatsappSenderModeSchema,
    phoneNumberId: z.string().trim().min(3).max(80).optional(),
    wabaId: z.string().trim().min(3).max(80).optional(),
    accessToken: z.string().trim().min(40).max(4096).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode !== "BYO") {
      return;
    }
    if (!value.phoneNumberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumberId"],
        message: "Phone number ID is required for BYO sender mode",
      });
    }
    if (!value.accessToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessToken"],
        message: "Access token is required for BYO sender mode",
      });
    }
  });

export const verifyWhatsappSenderResponseSchema = z.object({
  status: whatsappSenderStatusSchema,
  displayName: z.string().nullable(),
  phoneNumberId: z.string().nullable(),
  tokenExpiresAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const revokeWhatsappSenderResponseSchema = z.object({
  mode: z.literal("SHARED"),
  status: z.literal("REVOKED"),
});

export type WhatsappSenderMode = z.infer<typeof whatsappSenderModeSchema>;
export type WhatsappSenderStatus = z.infer<typeof whatsappSenderStatusSchema>;
export type WhatsappSenderConfigResponse = z.infer<
  typeof whatsappSenderConfigResponseSchema
>;
export type UpdateWhatsappSenderRequest = z.infer<
  typeof updateWhatsappSenderRequestSchema
>;

export const whatsappUnreadNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const whatsappUnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});

export const staffNotificationTypeSchema = z.enum([
  "PATIENT_RESPONSE",
  "APPOINTMENT_CANCEL",
  "APPOINTMENT_DELAY",
  "PRESCRIPTION_PENDING",
  "INVOICE_PENDING",
  "SYSTEM_ALERT",
  "MEMBER_JOIN_REQUEST",
  "MEMBER_JOIN_APPROVED",
  "MEMBER_JOIN_REJECTED",
  "APPOINTMENT_REQUEST_CREATED",
  "APPOINTMENT_REQUEST_APPROVED",
  "APPOINTMENT_REQUEST_REJECTED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_NO_SHOW",
  "APPOINTMENT_CONFIRMED",
  "PRESCRIPTION_SENT",
  "PRESCRIPTION_FAILED",
  "INVOICE_SENT",
  "INVOICE_FAILED",
  "INVOICE_PAID",
  "SUBSCRIPTION_PAYMENT_DUE_SOON",
  "SUBSCRIPTION_PAYMENT_OVERDUE",
  "SUBSCRIPTION_PAYMENT_SUCCESS",
  "SUBSCRIPTION_PAYMENT_FAILED",
  "PAYMENT_PROVIDER_STATUS_UPDATE",
  "CONSULTATION_STARTED",
  "CONSULTATION_SIGNED",
  "CONSULTATION_PENDING_ACTION",
]);

export const staffNotificationPrioritySchema = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const staffNotificationSchema = z.object({
  id: z.string(),
  clinicId: z.string().optional(),
  userId: z.string().nullable().optional(),
  type: staffNotificationTypeSchema.or(z.string()),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).nullable().optional(),
  priority: staffNotificationPrioritySchema.or(z.string()),
  isRead: z.boolean().optional(),
  readAt: z.coerce.date().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const whatsappUnreadNotificationsResponseSchema = z.array(
  staffNotificationSchema,
);

export const staffNotificationsListResponseSchema = z.array(
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

export const updateWhatsAppSettingsRequestSchema =
  whatsappSettingsResponseSchema.partial().strict();

export const createMedicineReminderRequestSchema = z
  .object({
    medicineName: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    reminderTime: z.string(),
    patientPhone: z.string(),
  })
  .strict();

export const createWhatsAppBroadcastRequestSchema = z
  .object({
    campaignName: z.string(),
    message: z.string(),
    sendToAllPatients: z.boolean(),
    sendToSpecificPatients: z.boolean(),
    scheduleTime: z.string().optional(),
  })
  .strict();

export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const whatsappStatsDetailedResponseSchema = z.object({
  totalPatients: z.number(),
  subscribers: z.number(),
  deliveryRate: z.number().nullable().optional(),
  responseRate: z.number().nullable().optional(),
  staleDeliveryCount: z.number().int().min(0).optional(),
  outboundLast30Days: z.number().int().min(0).optional(),
});

export const whatsappStatsResponseSchema = whatsappStatsSchema;
export const whatsappMessageProviderResponseSchema =
  whatsappMessageResponseSchema;

export type SendWhatsAppMessageRequest = z.infer<
  typeof sendWhatsAppMessageRequestSchema
>;
export type SendTemplateRequest = z.infer<typeof sendTemplateRequestSchema>;
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
export type WhatsAppStatsResponse = z.infer<typeof whatsappStatsResponseSchema>;
export type WhatsAppMessageProviderResponse = z.infer<
  typeof whatsappMessageProviderResponseSchema
>;
export type WhatsappTemplateCategory = z.infer<
  typeof whatsappTemplateCategorySchema
>;
export type ClinicWhatsappTemplate = z.infer<
  typeof clinicWhatsappTemplateSchema
>;
export type ClinicWhatsappTemplateListResponse = z.infer<
  typeof clinicWhatsappTemplateListResponseSchema
>;
export type CreateWhatsappTemplateRequest = z.infer<
  typeof createWhatsappTemplateRequestSchema
>;
export type UpdateWhatsappTemplateRequest = z.infer<
  typeof updateWhatsappTemplateRequestSchema
>;
export type SendWhatsAppCustomMessageRequest = z.infer<
  typeof sendWhatsAppCustomMessageRequestSchema
>;
export type SendWhatsAppCustomMessageResponse = z.infer<
  typeof sendWhatsAppCustomMessageResponseSchema
>;
export type ClinicWhatsappSentMessage = z.infer<
  typeof clinicWhatsappSentMessageSchema
>;
export type ClinicWhatsappSentMessageListResponse = z.infer<
  typeof clinicWhatsappSentMessageListResponseSchema
>;
export type ClinicWhatsappConversation = z.infer<
  typeof clinicWhatsappConversationSchema
>;
export type ClinicWhatsappConversationMessage = z.infer<
  typeof clinicWhatsappConversationMessageSchema
>;
export type ClinicWhatsappConversationReplyRequest = z.infer<
  typeof clinicWhatsappConversationReplyRequestSchema
>;
export type ClinicWhatsappCampaignPreviewRequest = z.infer<
  typeof clinicWhatsappCampaignPreviewRequestSchema
>;
export type ClinicWhatsappCampaignPreviewResponse = z.infer<
  typeof clinicWhatsappCampaignPreviewResponseSchema
>;
export type CreateClinicWhatsappCampaignRequest = z.infer<
  typeof createClinicWhatsappCampaignRequestSchema
>;
export type ClinicWhatsappCampaignSummary = z.infer<
  typeof clinicWhatsappCampaignSummarySchema
>;

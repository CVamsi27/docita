import type {
  ClinicWhatsappSentMessage,
  ClinicWhatsappCampaignPreviewRequest,
  ClinicWhatsappCampaignPreviewResponse,
  ClinicWhatsappCampaignSummary,
  ClinicWhatsappConversation,
  ClinicWhatsappConversationMessage,
  ClinicWhatsappConversationReplyRequest,
  CreateClinicWhatsappCampaignRequest,
  ClinicWhatsappTemplate,
  CreateWhatsappTemplateRequest,
  SendWhatsAppCustomMessageRequest,
  SendWhatsAppCustomMessageResponse,
  StaffNotificationEntry,
  UpdateWhatsappSenderRequest,
  UpdateWhatsappTemplateRequest,
  WhatsappSenderConfigResponse,
  WhatsAppStatsDetailedResponse,
  WhatsAppUnreadCountResponse,
} from "@workspace/types";
import { Feature } from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { useDataAccessContext } from "../provider/hooks";
export type NotificationUnreadCountResponse = WhatsAppUnreadCountResponse;

export const useSendPrescriptionWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-prescription/${id}`,
    "POST",
    { body: () => undefined },
  );

export const useSendInvoiceWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-invoice/${id}`,
    "POST",
    { body: () => undefined },
  );

export const useWhatsappUnreadNotificationCount = () => {
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.WHATSAPP_MESSAGING,
  );
  return useAPIQuery<NotificationUnreadCountResponse>(
    queryKeys.whatsapp.notifications.unreadCount(),
    "/whatsapp/notifications/unread-count",
    {
      enabled: whatsappOk,
      refetchInterval: 30_000,
    },
  );
};

export const useUnreadNotifications = (limit: number = 50) => {
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.WHATSAPP_MESSAGING,
  );
  return useAPIQuery<StaffNotificationEntry[]>(
    queryKeys.whatsapp.notifications.unread(limit),
    `/whatsapp/notifications/unread?limit=${limit}`,
    { enabled: whatsappOk },
  );
};

export const useWhatsappDeleteNotification = () =>
  useAPIMutation<void, { notificationId: string }>(
    ({ notificationId }) => `/whatsapp/notifications/${notificationId}`,
    "DELETE",
    {
      invalidateKeys: [
        queryKeys.whatsapp.notifications.unreadCount(),
        queryKeys.whatsapp.notifications.unreadPrefix(),
      ],
    },
  );

export const useWhatsappDeleteAllNotifications = () =>
  useAPIMutation<void, void>("/whatsapp/notifications", "DELETE", {
    invalidateKeys: [
      queryKeys.whatsapp.notifications.unreadCount(),
      queryKeys.whatsapp.notifications.unreadPrefix(),
    ],
  });

export const useResendPrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-prescription/${id}`, "POST");

export const useResendInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-invoice/${id}`, "POST");

export const useApprovePrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-prescription/${id}`, "POST");

export const useApproveInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-invoice/${id}`, "POST");

export const useResendAppointmentReminder = () =>
  useAPIMutation<
    { success: boolean; message: string },
    { appointmentId: string }
  >(({ appointmentId }) => `/reminders/send/${appointmentId}`, "POST", {
    body: () => ({ type: "whatsapp" as const }),
  });

export const useWhatsappSender = () =>
  useAPIQuery<WhatsappSenderConfigResponse>(
    queryKeys.whatsapp.sender(),
    "/whatsapp/sender",
  );

/**
 * Send an ad-hoc free-text WhatsApp message to a patient. Per WhatsApp policy
 * this only delivers inside the 24h customer-service window; outside it the
 * provider rejects the send and the mutation surfaces the error.
 */
export const useSendCustomWhatsAppMessage = () =>
  useAPIMutation<
    SendWhatsAppCustomMessageResponse,
    SendWhatsAppCustomMessageRequest
  >("/whatsapp/send-custom", "POST");

/**
 * Outbound-only sent-message history for a patient (no inbound / conversation
 * threading). Powers the patient Messages tab history list.
 */
export const usePatientWhatsappSentMessages = (patientId: string) => {
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.WHATSAPP_MESSAGING,
  );
  return useAPIQuery<ClinicWhatsappSentMessage[]>(
    queryKeys.whatsapp.patientSentMessages(patientId),
    `/whatsapp/patients/${patientId}/sent-messages`,
    { enabled: whatsappOk && Boolean(patientId) },
  );
};

export const useClinicWhatsappTemplates = () => {
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.WHATSAPP_MESSAGING,
  );
  return useAPIQuery<ClinicWhatsappTemplate[]>(
    queryKeys.whatsapp.customTemplates(),
    "/whatsapp/templates/custom",
    { enabled: whatsappOk, staleTime: 60_000 },
  );
};

export const useCreateWhatsappTemplate = () =>
  useAPIMutation<ClinicWhatsappTemplate, CreateWhatsappTemplateRequest>(
    "/whatsapp/templates/custom",
    "POST",
    { invalidateKeys: [queryKeys.whatsapp.customTemplates()] },
  );

export const useUpdateWhatsappTemplate = () =>
  useAPIMutation<
    ClinicWhatsappTemplate,
    { id: string } & UpdateWhatsappTemplateRequest
  >(({ id }) => `/whatsapp/templates/custom/${id}`, "PATCH", {
    body: ({ id: _id, ...rest }) => rest,
    invalidateKeys: [queryKeys.whatsapp.customTemplates()],
  });

export const useDeleteWhatsappTemplate = () =>
  useAPIMutation<{ success: boolean }, { id: string }>(
    ({ id }) => `/whatsapp/templates/custom/${id}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.whatsapp.customTemplates()],
    },
  );

export const useWhatsappStats = () => {
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.WHATSAPP_MESSAGING,
  );
  return useAPIQuery<WhatsAppStatsDetailedResponse>(
    queryKeys.whatsapp.stats(),
    "/whatsapp/stats",
    { enabled: whatsappOk, staleTime: 60_000 },
  );
};

export const useUpdateWhatsappSender = () =>
  useAPIMutation<WhatsappSenderConfigResponse, UpdateWhatsappSenderRequest>(
    "/whatsapp/sender",
    "PUT",
    { invalidateKeys: [queryKeys.whatsapp.sender()] },
  );

export const useVerifyWhatsappSender = () =>
  useAPIMutation<
    {
      status:
        | "NOT_CONFIGURED"
        | "PENDING_VERIFICATION"
        | "VERIFIED"
        | "FAILED"
        | "REVOKED";
      displayName: string | null;
      phoneNumberId: string | null;
      tokenExpiresAt: string | null;
      error: string | null;
    },
    void
  >("/whatsapp/sender/verify", "POST", {
    body: () => undefined,
    invalidateKeys: [queryKeys.whatsapp.sender()],
  });

export const useRevokeWhatsappSender = () =>
  useAPIMutation<{ mode: "SHARED"; status: "REVOKED" }, void>(
    "/whatsapp/sender",
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.whatsapp.sender()],
    },
  );

export const useClinicWhatsappConversations = () =>
  useAPIQuery<ClinicWhatsappConversation[]>(
    queryKeys.whatsapp.conversations(),
    "/whatsapp/operations/conversations",
  );

export const useClinicWhatsappConversationMessages = (id: string) =>
  useAPIQuery<ClinicWhatsappConversationMessage[]>(
    queryKeys.whatsapp.conversationMessages(id),
    `/whatsapp/operations/conversations/${id}/messages`,
    { enabled: Boolean(id) },
  );

export const useMarkClinicWhatsappConversationRead = () =>
  useAPIMutation<{ updated: true }, { id: string }>(
    ({ id }) => `/whatsapp/operations/conversations/${id}/read`,
    "POST",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.whatsapp.conversations()],
    },
  );

export const useReplyToClinicWhatsappConversation = () =>
  useAPIMutation<
    { messageId: string },
    { id: string } & ClinicWhatsappConversationReplyRequest
  >(({ id }) => `/whatsapp/operations/conversations/${id}/reply`, "POST", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [queryKeys.whatsapp.conversations()],
  });

export const useClinicWhatsappCampaigns = () =>
  useAPIQuery<ClinicWhatsappCampaignSummary[]>(
    queryKeys.whatsapp.campaigns(),
    "/whatsapp/operations/campaigns",
  );

export const usePreviewClinicWhatsappCampaign = () =>
  useAPIMutation<
    ClinicWhatsappCampaignPreviewResponse,
    ClinicWhatsappCampaignPreviewRequest
  >("/whatsapp/operations/campaigns/preview", "POST");

export const useCreateClinicWhatsappCampaign = () =>
  useAPIMutation<
    ClinicWhatsappCampaignSummary,
    CreateClinicWhatsappCampaignRequest
  >("/whatsapp/operations/campaigns", "POST", {
    invalidateKeys: [queryKeys.whatsapp.campaigns()],
  });

export const useCancelClinicWhatsappCampaign = () =>
  useAPIMutation<{ cancelled: true }, { id: string }>(
    ({ id }) => `/whatsapp/operations/campaigns/${id}/cancel`,
    "POST",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.whatsapp.campaigns()],
    },
  );

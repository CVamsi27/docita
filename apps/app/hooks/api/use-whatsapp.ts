import type {
  CreateMedicineReminderRequest,
  CreateWhatsAppBroadcastRequest,
  StaffNotificationEntry,
  UpdateWhatsAppSettingsRequest,
  WhatsAppLogListResponse,
  WhatsAppSettingsResponse,
  WhatsAppStatsDetailedResponse,
  WhatsAppUnreadCountResponse,
} from "@workspace/types";
import { Feature } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";

export type WhatsappLogEntry = WhatsAppLogListResponse[number];
export type NotificationUnreadCountResponse = WhatsAppUnreadCountResponse;

export const useWhatsappStats = () => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<WhatsAppStatsDetailedResponse>(
    ["whatsapp", "stats"],
    "/whatsapp/stats",
    { enabled: whatsappOk },
  );
};

export const useWhatsAppSettings = () => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<WhatsAppSettingsResponse>(
    ["whatsapp", "settings"],
    "/whatsapp/settings",
    { enabled: whatsappOk },
  );
};

export const useUpdateWhatsAppSettings = () =>
  useAPIMutation<void, UpdateWhatsAppSettingsRequest>("/whatsapp/settings", "PUT");

export const useCreateMedicineReminder = () =>
  useAPIMutation<void, CreateMedicineReminderRequest>("/whatsapp/medicine-reminder", "POST");

export const useCreateWhatsAppBroadcast = () =>
  useAPIMutation<void, CreateWhatsAppBroadcastRequest>("/whatsapp/broadcast", "POST");

export const useSendPrescriptionWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-prescription/${id}`,
    "POST",
  );

export const useSendInvoiceWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-invoice/${id}`,
    "POST",
  );

export const useWhatsappLogs = (limit: number = 50) => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<WhatsappLogEntry[]>(
    ["whatsapp", "logs", limit],
    `/whatsapp/logs?limit=${limit}`,
    { enabled: whatsappOk },
  );
};

export const useUnreadNotificationCount = () => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<NotificationUnreadCountResponse>(
    ["whatsapp", "notifications", "unread-count"],
    "/whatsapp/notifications/unread-count",
    {
      enabled: whatsappOk,
      refetchInterval: 30_000,
    },
  );
};

export const useUnreadNotifications = (limit: number = 50) => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<StaffNotificationEntry[]>(
    ["whatsapp", "notifications", "unread", limit],
    `/whatsapp/notifications/unread?limit=${limit}`,
    { enabled: whatsappOk },
  );
};

export const useDeleteNotification = () =>
  useAPIMutation<void, { notificationId: string }>(
    ({ notificationId }) => `/whatsapp/notifications/${notificationId}`,
    "DELETE",
    {
      invalidateKeys: [
        ["whatsapp", "notifications", "unread-count"],
        ["whatsapp", "notifications", "unread"],
      ],
    },
  );

export const useDeleteAllNotifications = () =>
  useAPIMutation<void, void>("/whatsapp/notifications", "DELETE", {
    invalidateKeys: [
      ["whatsapp", "notifications", "unread-count"],
      ["whatsapp", "notifications", "unread"],
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

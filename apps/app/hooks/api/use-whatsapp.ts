import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
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

export type WhatsappLogEntry = WhatsAppLogListResponse[number];
export type NotificationUnreadCountResponse = WhatsAppUnreadCountResponse;

export const useWhatsappStats = () =>
  useAPIQuery<WhatsAppStatsDetailedResponse>(["whatsapp", "stats"], "/whatsapp/stats");

export const useWhatsAppSettings = () =>
  useAPIQuery<WhatsAppSettingsResponse>(["whatsapp", "settings"], "/whatsapp/settings");

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

export const useWhatsappLogs = (limit: number = 50) =>
  useAPIQuery<WhatsappLogEntry[]>(
    ["whatsapp", "logs", limit],
    `/whatsapp/logs?limit=${limit}`,
  );

export const useUnreadNotificationCount = () =>
  useAPIQuery<NotificationUnreadCountResponse>(
    ["whatsapp", "notifications", "unread-count"],
    "/whatsapp/notifications/unread-count",
    {
      refetchInterval: 30_000,
    },
  );

export const useUnreadNotifications = (limit: number = 50) =>
  useAPIQuery<StaffNotificationEntry[]>(
    ["whatsapp", "notifications", "unread", limit],
    `/whatsapp/notifications/unread?limit=${limit}`,
  );

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

import type {
  StaffNotificationEntry,
  UpdateWhatsappSenderRequest,
  WhatsappSenderConfigResponse,
  WhatsAppUnreadCountResponse,
} from "@workspace/types";
import { Feature } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";

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

export const useResendAppointmentReminder = () =>
  useAPIMutation<
    { success: boolean; message: string },
    { appointmentId: string }
  >(
    ({ appointmentId }) => `/reminders/send/${appointmentId}`,
    "POST",
    { body: () => ({ type: "whatsapp" as const }) },
  );

export const useWhatsappSender = () =>
  useAPIQuery<WhatsappSenderConfigResponse>(
    ["whatsapp", "sender"],
    "/whatsapp/sender",
  );

export const useUpdateWhatsappSender = () =>
  useAPIMutation<WhatsappSenderConfigResponse, UpdateWhatsappSenderRequest>(
    "/whatsapp/sender",
    "PUT",
    { invalidateKeys: [["whatsapp", "sender"]] },
  );

export const useVerifyWhatsappSender = () =>
  useAPIMutation<
    {
      status: "NOT_CONFIGURED" | "PENDING_VERIFICATION" | "VERIFIED" | "FAILED" | "REVOKED";
      displayName: string | null;
      phoneNumberId: string | null;
      tokenExpiresAt: string | null;
      error: string | null;
    },
    void
  >("/whatsapp/sender/verify", "POST", {
    body: () => undefined,
    invalidateKeys: [["whatsapp", "sender"]],
  });

export const useRevokeWhatsappSender = () =>
  useAPIMutation<{ mode: "SHARED"; status: "REVOKED" }, void>(
    "/whatsapp/sender",
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [["whatsapp", "sender"]],
    },
  );

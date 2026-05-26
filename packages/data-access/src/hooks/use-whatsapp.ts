import type {
  StaffNotificationEntry,
  UpdateWhatsappSenderRequest,
  WhatsappSenderConfigResponse,
  WhatsAppUnreadCountResponse,
} from "@workspace/types";
import { Feature } from "@workspace/types";
import { queryKeys } from "../lib/query-keys";
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
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
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
  const whatsappOk = useDataAccessContext().isTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
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
  >(
    ({ appointmentId }) => `/reminders/send/${appointmentId}`,
    "POST",
    { body: () => ({ type: "whatsapp" as const }) },
  );

export const useWhatsappSender = () =>
  useAPIQuery<WhatsappSenderConfigResponse>(
    queryKeys.whatsapp.sender(),
    "/whatsapp/sender",
  );

export const useUpdateWhatsappSender = () =>
  useAPIMutation<WhatsappSenderConfigResponse, UpdateWhatsappSenderRequest>(
    "/whatsapp/sender",
    "PUT",
    { invalidateKeys: [queryKeys.whatsapp.sender()] },
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

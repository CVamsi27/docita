import { Feature } from "@workspace/types";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
export type StaffNotificationType = string;
export type NotificationPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export interface StaffNotification {
  id: string;
  clinicId: string;
  userId: string | null;
  type: StaffNotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export const useNotifications = (enabled: boolean = true) => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<StaffNotification[]>(
    ["notifications"],
    "/staff-notifications",
    {
      enabled: whatsappOk && enabled,
      refetchInterval: 30000,
    },
  );
};

export const useUnreadNotificationCount = (enabled: boolean = true) => {
  const whatsappOk = useTierFeatureEnabled(Feature.WHATSAPP_MESSAGING);
  return useAPIQuery<{ count: number }>(
    ["notifications", "unread-count"],
    "/staff-notifications/unread-count",
    {
      enabled: whatsappOk && enabled,
      refetchInterval: 10000,
    },
  );
};

export const useMarkNotificationRead = () =>
  useAPIMutation<void, { id: string }>(
    (vars) => `/staff-notifications/mark-read/${vars.id}`,
    "PATCH",
    {
      invalidateKeys: [["notifications"], ["notifications", "unread-count"]],
    },
  );

export const useDeleteNotification = () =>
  useAPIMutation<void, { id: string }>(
    (vars) => `/staff-notifications/delete/${vars.id}`,
    "DELETE",
    {
      invalidateKeys: [["notifications"], ["notifications", "unread-count"]],
    },
  );

export const useDeleteAllNotifications = () =>
  useAPIMutation<void, void>(
    "/staff-notifications/delete-all",
    "DELETE",
    {
      invalidateKeys: [["notifications"], ["notifications", "unread-count"]],
    },
  );

export const usePendingJoinRequestCount = (enabled = true) =>
  useAPIQuery<{ count: number }>(
    ["join-requests", "count"],
    "/clinics/join-requests/count",
    {
      enabled,
      refetchInterval: 30000,
    },
  );

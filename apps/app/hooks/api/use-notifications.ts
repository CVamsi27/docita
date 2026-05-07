import {
  staffNotificationsListResponseSchema,
  whatsappUnreadCountResponseSchema,
} from "@workspace/types";
import { useAPIMutation, useAPIQuery, useAPIQueryValidated } from "@/lib/api-core";

export type StaffNotification = typeof staffNotificationsListResponseSchema._type[number];

export const useNotifications = (enabled: boolean = true) =>
  useAPIQueryValidated(
    ["notifications"],
    "/staff-notifications",
    staffNotificationsListResponseSchema,
    {
      enabled,
      refetchInterval: 30000,
    },
  );

export const useUnreadNotificationCount = (enabled: boolean = true) =>
  useAPIQueryValidated(
    ["notifications", "unread-count"],
    "/staff-notifications/unread-count",
    whatsappUnreadCountResponseSchema,
    {
      enabled,
      refetchInterval: 10000,
    },
  );

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

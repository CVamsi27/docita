import {
  staffNotificationsListResponseSchema,
  whatsappUnreadCountResponseSchema,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIQueryValidated } from "../core/use-api-query-validated";

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

/**
 * Full history of staff notifications (read + unread, excluding soft-deleted).
 * Use for the /inbox notifications view; the bell popover continues to use
 * `useNotifications` for unread-only.
 */
export const useAllNotifications = (enabled: boolean = true) =>
  useAPIQueryValidated(
    ["notifications", "all"],
    "/staff-notifications/all",
    staffNotificationsListResponseSchema,
    {
      enabled,
      refetchInterval: 60000,
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
      body: () => undefined,
      invalidateKeys: [
        ["notifications"],
        ["notifications", "all"],
        ["notifications", "unread-count"],
      ],
    },
  );

export const useDeleteNotification = () =>
  useAPIMutation<void, { id: string }>(
    (vars) => `/staff-notifications/delete/${vars.id}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [
        ["notifications"],
        ["notifications", "all"],
        ["notifications", "unread-count"],
      ],
    },
  );

export const useDeleteAllNotifications = () =>
  useAPIMutation<void, void>(
    "/staff-notifications/delete-all",
    "DELETE",
    {
      invalidateKeys: [
        ["notifications"],
        ["notifications", "all"],
        ["notifications", "unread-count"],
      ],
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

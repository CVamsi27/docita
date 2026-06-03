"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  useNotifications,
  type StaffNotification,
} from "@workspace/data-access";
import { useSocket } from "@/lib/contexts/socket-context";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryId,
} from "./notification-href";
import { filterByCategory } from "./notification-item";

export function useNotificationPanel(open: boolean, enabled: boolean) {
  const queryEnabled = enabled && open;
  const { data: notifications = [], refetch } = useNotifications(queryEnabled);
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !enabled) return;
    const handleNew = (notification: StaffNotification) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.all(),
        (old = []) => [notification, ...old],
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const handleRead = (data: { id: string; readAt: Date }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.all(),
        (old = []) =>
          old.map((n) =>
            n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const handleDeleted = (data: { id: string }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.all(),
        (old = []) => old.filter((n) => n.id !== data.id),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const handleBulkDelete = () => {
      refetch();
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    socket.on("notification:new", handleNew);
    socket.on("notification:read", handleRead);
    socket.on("notification:deleted", handleDeleted);
    socket.on("notification:bulk-delete", handleBulkDelete);
    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:read", handleRead);
      socket.off("notification:deleted", handleDeleted);
      socket.off("notification:bulk-delete", handleBulkDelete);
    };
  }, [enabled, socket, queryClient, refetch]);

  const activeNotifications = useMemo(
    () => notifications.filter((n) => !n.deletedAt),
    [notifications],
  );

  const unreadCount = useMemo(
    () => activeNotifications.filter((n) => !n.isRead).length,
    [activeNotifications],
  );

  const visibleCategories = useMemo(
    () =>
      NOTIFICATION_CATEGORIES.filter((cat) => {
        if (cat.id === "all") return true;
        return filterByCategory(activeNotifications, cat.types).length > 0;
      }),
    [activeNotifications],
  );

  const notificationsByTab = useMemo(() => {
    const out: Partial<Record<NotificationCategoryId, StaffNotification[]>> =
      {};
    for (const cat of visibleCategories) {
      out[cat.id] = filterByCategory(activeNotifications, cat.types);
    }
    return out;
  }, [activeNotifications, visibleCategories]);

  const unreadCountByTab = useMemo(() => {
    const out: Partial<Record<NotificationCategoryId, number>> = {};
    for (const cat of visibleCategories) {
      out[cat.id] = (notificationsByTab[cat.id] ?? []).filter(
        (n) => !n.isRead,
      ).length;
    }
    return out;
  }, [notificationsByTab, visibleCategories]);

  return {
    activeNotifications,
    unreadCount,
    visibleCategories,
    notificationsByTab,
    unreadCountByTab,
  };
}

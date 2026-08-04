"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { BellIcon } from "lucide-react";
import { queryKeys, useAllNotifications, useMarkNotificationRead, useDeleteNotification, useDeleteAllNotifications, type StaffNotification } from "@workspace/data-access";
import { useSocket } from "@/lib/socket/socket-context";
import { buildNotificationCategoryRecord } from "@/components/navigation/notification-category-record";
import { isNotificationCategoryId, NOTIFICATION_CATEGORIES, type NotificationCategoryId } from "@/components/navigation/notification-href";
import { filterByCategory } from "./notification-inbox-helpers";
import { NotificationsInboxHeader, NotificationsInboxTabs } from "./NotificationsInboxViewSections";

export function NotificationsInboxView() {
  const {
    data: notifications = [],
    refetch,
    isLoading,
  } = useAllNotifications(true);
  const markRead = useMarkNotificationRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryId>("all");

  useEffect(() => {
    if (!socket) return;
    const onNew = (n: StaffNotification) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) => [n, ...old],
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onRead = (data: { id: string; readAt: Date }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) =>
          old.map((n) =>
            n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onDeleted = (data: { id: string }) => {
      queryClient.setQueryData<StaffNotification[]>(
        queryKeys.notifications.listAll(),
        (old = []) => old.filter((n) => n.id !== data.id),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const onBulk = () => {
      refetch();
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:deleted", onDeleted);
    socket.on("notification:bulk-delete", onBulk);
    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:deleted", onDeleted);
      socket.off("notification:bulk-delete", onBulk);
    };
  }, [socket, queryClient, refetch]);

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync({ id });
  };
  const handleDelete = async (id: string) => {
    await deleteOne.mutateAsync({ id });
  };

  const handleClearAll = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAll.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const active = notifications.filter((n) => !n.deletedAt);
  const unreadCount = active.filter((n) => !n.isRead).length;

  const visibleCategories = useMemo(
    () =>
      NOTIFICATION_CATEGORIES.filter((cat) => {
        if (cat.id === "all") return true;
        return filterByCategory(active, cat.types).length > 0;
      }),
    [active],
  );

  const byTab = useMemo(
    () =>
      buildNotificationCategoryRecord((cat) =>
        filterByCategory(active, cat.types),
      ),
    [active],
  );

  const unreadByTab = useMemo(
    () =>
      buildNotificationCategoryRecord(
        (cat) => (byTab[cat.id] ?? []).filter((n) => !n.isRead).length,
      ),
    [byTab],
  );

  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
  }, [visibleCategories, activeTab]);

  const status: "loading" | "empty" | "success" =
    isLoading && active.length === 0
      ? "loading"
      : active.length === 0
        ? "empty"
        : "success";

  return (
    <DataState
      status={status}
      loadingMessage="Loading notifications…"
      emptyIcon={BellIcon}
      emptyTitle="No notifications yet"
      emptyDescription="Activity from appointments, prescriptions, invoices, payments, consultations, and your team will appear here."
      className="min-h-[40vh]"
    >
      <div className="space-y-4">
        <NotificationsInboxHeader
          unreadCount={unreadCount}
          isDeleting={isDeleting}
          onClearAll={handleClearAll}
        />
        <NotificationsInboxTabs
          activeTab={activeTab}
          onTabChange={(v) => {
            if (isNotificationCategoryId(v)) setActiveTab(v);
          }}
        visibleCategories={visibleCategories}
        unreadByTab={unreadByTab}
        byTab={byTab}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
      </div>
    </DataState>
  );
}

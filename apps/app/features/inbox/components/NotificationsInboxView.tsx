"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { BellIcon, TrashIcon } from "lucide-react";
import {
  queryKeys,
  useAllNotifications,
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  type StaffNotification,
} from "@workspace/data-access";
import { useSocket } from "@/lib/contexts/socket-context";
import { buildNotificationCategoryRecord } from "@/components/navigation/notification-category-record";
import {
  isNotificationCategoryId,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryId,
} from "@/components/navigation/notification-href";
import {
  NotificationRow,
  categorize,
  filterByCategory,
} from "./notification-inbox-row";

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

  if (isLoading && active.length === 0)
    return (
      <DataState status="loading" loadingMessage="Loading notifications…" />
    );

  if (active.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={BellIcon}
        emptyTitle="No notifications yet"
        emptyDescription="Activity from appointments, prescriptions, invoices, payments, consultations, and your team will appear here."
        className="min-h-[40vh]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[length:var(--fs-sm)] text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread`
            : "All caught up — review history below."}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isDeleting}
          onClick={async () => {
            if (isDeleting) return;
            setIsDeleting(true);
            try {
              await deleteAll.mutateAsync();
            } finally {
              setIsDeleting(false);
            }
          }}
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Clear all
        </Button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isNotificationCategoryId(v)) setActiveTab(v);
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {visibleCategories.map((cat) => {
            const count = unreadByTab[cat.id] ?? 0;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <span>{cat.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {visibleCategories.map((cat) => {
          const items = byTab[cat.id] ?? [];
          const grouped = categorize(items);
          const empty =
            grouped.today.length === 0 &&
            grouped.yesterday.length === 0 &&
            grouped.older.length === 0;
          return (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              {empty ? (
                <DataState
                  status="empty"
                  emptyIcon={BellIcon}
                  emptyTitle={`No ${cat.label.toLowerCase()} notifications`}
                  className="min-h-[30vh]"
                />
              ) : (
                <div className="space-y-6">
                  {grouped.today.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Today
                      </h3>
                      <div className="overflow-hidden rounded-md border">
                        {grouped.today.map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onMarkRead={handleMarkRead}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  {grouped.yesterday.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Yesterday
                      </h3>
                      <div className="overflow-hidden rounded-md border">
                        {grouped.yesterday.map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onMarkRead={handleMarkRead}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  {grouped.older.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Older
                      </h3>
                      <div className="overflow-hidden rounded-md border">
                        {grouped.older.map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onMarkRead={handleMarkRead}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { DataState } from "@workspace/ui/components/data-state";
import { BellIcon, CheckIcon, TrashIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PriorityBadge } from "@workspace/ui/components/status-badge";
import { formatTime, isToday, isYesterday } from "@workspace/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  type StaffNotification,
} from "@/hooks/api/use-notifications";
import { useSocket } from "@/lib/socket-context";
import {
  NOTIFICATION_CATEGORIES,
  notificationHref,
  type NotificationCategoryId,
} from "@/features/_shared/components/navigation/notification-href";

function categorize(notifications: StaffNotification[]) {
  const today: StaffNotification[] = [];
  const yesterday: StaffNotification[] = [];
  const older: StaffNotification[] = [];
  for (const n of notifications) {
    if (isToday(n.createdAt)) today.push(n);
    else if (isYesterday(n.createdAt)) yesterday.push(n);
    else older.push(n);
  }
  return { today, yesterday, older };
}

function filterByCategory(
  notifications: StaffNotification[],
  types: readonly string[] | undefined,
): StaffNotification[] {
  if (!types) return notifications;
  const allowed = new Set(types);
  return notifications.filter((n) => allowed.has(String(n.type)));
}

interface RowProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationRow({ notification, onMarkRead, onDelete }: RowProps) {
  const router = useRouter();
  const href = notificationHref(notification);

  const priorityMap = {
    URGENT: "urgent",
    HIGH: "high",
    NORMAL: "medium",
    LOW: "low",
  } as const;
  const mappedPriority =
    notification.priority in priorityMap
      ? priorityMap[notification.priority as keyof typeof priorityMap]
      : "medium";

  const open = () => {
    if (!href) return;
    router.push(href);
    if (!notification.isRead) void onMarkRead(notification.id);
  };

  return (
    <div
      className={cn(
        "border-b transition-colors",
        !notification.isRead && "bg-primary/5",
        href && "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div
          className={cn(
            "min-w-0 flex-1 space-y-1 rounded-sm outline-none",
            href && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
          )}
          role={href ? "button" : undefined}
          tabIndex={href ? 0 : undefined}
          onClick={href ? open : undefined}
          onKeyDown={
            href
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }
              : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[length:var(--fs-sm)] font-medium">
              {notification.title}
            </h4>
            {notification.priority !== "NORMAL" && (
              <PriorityBadge priority={mappedPriority} showDot={false} />
            )}
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            )}
          </div>
          <p className="text-[length:var(--fs-sm)] text-muted-foreground">
            {notification.message}
          </p>
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">
            {formatTime(notification.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {!notification.isRead && (
            <SymbolTooltip label="Mark as read">
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void onMarkRead(notification.id);
                }}
                aria-label="Mark as read"
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}
          <SymbolTooltip label="Dismiss">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onDelete(notification.id);
              }}
              aria-label="Dismiss notification"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        </div>
      </div>
    </div>
  );
}

export function NotificationsInboxView() {
  const { data: notifications = [], refetch, isLoading } = useNotifications(true);
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
        ["notifications"],
        (old = []) => [n, ...old],
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };
    const onRead = (data: { id: string; readAt: Date }) => {
      queryClient.setQueryData<StaffNotification[]>(
        ["notifications"],
        (old = []) =>
          old.map((n) =>
            n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };
    const onDeleted = (data: { id: string }) => {
      queryClient.setQueryData<StaffNotification[]>(
        ["notifications"],
        (old = []) => old.filter((n) => n.id !== data.id),
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };
    const onBulk = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
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
      Object.fromEntries(
        visibleCategories.map((cat) => [
          cat.id,
          filterByCategory(active, cat.types),
        ]),
      ) as Record<NotificationCategoryId, StaffNotification[]>,
    [active, visibleCategories],
  );

  const unreadByTab = useMemo(
    () =>
      Object.fromEntries(
        visibleCategories.map((cat) => [
          cat.id,
          (byTab[cat.id] ?? []).filter((n) => !n.isRead).length,
        ]),
      ) as Record<NotificationCategoryId, number>,
    [byTab, visibleCategories],
  );

  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
  }, [visibleCategories, activeTab]);

  if (isLoading && active.length === 0) {
    return (
      <DataState status="loading" loadingMessage="Loading notifications…" />
    );
  }

  if (active.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={BellIcon}
        emptyTitle="You're all caught up"
        emptyDescription="New notifications will appear here as they arrive."
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
        onValueChange={(v) => setActiveTab(v as NotificationCategoryId)}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
import { BellIcon, CheckIcon, ExternalLinkIcon, TrashIcon, XIcon } from "lucide-react";
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
} from "./notification-href";

interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onCloseSheet: () => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onCloseSheet,
}: NotificationItemProps) {
  const router = useRouter();
  const navigateHref = notificationHref(notification);

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

  const handleOpenDestination = () => {
    if (!navigateHref) return;
    router.push(navigateHref);
    onCloseSheet();
    if (!notification.isRead) {
      void onMarkRead(notification.id);
    }
  };

  // Preserve aria-label phrasing for appointment-request notifications so the
  // existing e2e/integration tests that locate the row by name keep working.
  const isAppointmentRequest = String(notification.type).startsWith(
    "APPOINTMENT_REQUEST_",
  );
  const ariaLabel = navigateHref
    ? isAppointmentRequest
      ? `${notification.title}. Open appointment requests queue.`
      : `${notification.title}. Open related page.`
    : undefined;

  return (
    <div
      className={cn(
        "border-b transition-colors",
        !notification.isRead && "bg-primary/5",
        navigateHref && "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div
          className={cn(
            "min-w-0 flex-1 space-y-1 rounded-sm outline-none",
            navigateHref &&
              "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
          )}
          role={navigateHref ? "button" : undefined}
          tabIndex={navigateHref ? 0 : undefined}
          aria-label={ariaLabel}
          onClick={navigateHref ? handleOpenDestination : undefined}
          onKeyDown={
            navigateHref
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenDestination();
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
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">
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
                onClick={(event) => {
                  event.stopPropagation();
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
              onClick={(event) => {
                event.stopPropagation();
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

interface CategorizedNotifications {
  today: StaffNotification[];
  yesterday: StaffNotification[];
  older: StaffNotification[];
}

function categorizeNotifications(
  notifications: StaffNotification[],
): CategorizedNotifications {
  const today: StaffNotification[] = [];
  const yesterday: StaffNotification[] = [];
  const older: StaffNotification[] = [];

  notifications.forEach((notification) => {
    const createdAt = notification.createdAt;
    if (isToday(createdAt)) {
      today.push(notification);
    } else if (isYesterday(createdAt)) {
      yesterday.push(notification);
    } else {
      older.push(notification);
    }
  });

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

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled?: boolean;
}

export function NotificationPanel({
  open,
  onOpenChange,
  enabled = true,
}: NotificationPanelProps) {
  const queryEnabled = enabled && open;
  const { data: notifications = [], refetch } = useNotifications(queryEnabled);
  const markRead = useMarkNotificationRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryId>("all");

  useEffect(() => {
    if (!socket || !enabled) return;

    const handleNewNotification = (notification: StaffNotification) => {
      queryClient.setQueryData<StaffNotification[]>(
        ["notifications"],
        (old = []) => [notification, ...old],
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    const handleNotificationRead = (data: { id: string; readAt: Date }) => {
      queryClient.setQueryData<StaffNotification[]>(
        ["notifications"],
        (old = []) =>
          old.map((n) =>
            n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    const handleNotificationDeleted = (data: { id: string }) => {
      queryClient.setQueryData<StaffNotification[]>(
        ["notifications"],
        (old = []) => old.filter((n) => n.id !== data.id),
      );
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    const handleBulkDelete = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("notification:bulk-delete", handleBulkDelete);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:deleted", handleNotificationDeleted);
      socket.off("notification:bulk-delete", handleBulkDelete);
    };
  }, [enabled, socket, queryClient, refetch]);

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync({ id });
  };

  const handleDelete = async (id: string) => {
    await deleteOne.mutateAsync({ id });
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const activeNotifications = notifications.filter((n) => !n.deletedAt);
  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

  // Only show tabs that actually have at least one notification (except "All",
  // which is always shown).
  const visibleCategories = useMemo(() => {
    return NOTIFICATION_CATEGORIES.filter((cat) => {
      if (cat.id === "all") return true;
      return filterByCategory(activeNotifications, cat.types).length > 0;
    });
  }, [activeNotifications]);

  const notificationsByTab = useMemo(() => {
    return Object.fromEntries(
      visibleCategories.map((cat) => [
        cat.id,
        filterByCategory(activeNotifications, cat.types),
      ]),
    ) as Record<NotificationCategoryId, StaffNotification[]>;
  }, [activeNotifications, visibleCategories]);

  const unreadCountByTab = useMemo(() => {
    return Object.fromEntries(
      visibleCategories.map((cat) => [
        cat.id,
        (notificationsByTab[cat.id] ?? []).filter((n) => !n.isRead).length,
      ]),
    ) as Record<NotificationCategoryId, number>;
  }, [notificationsByTab, visibleCategories]);

  // If the active tab is no longer visible (e.g. last notification of that
  // category was dismissed), fall back to "all".
  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) {
      setActiveTab("all");
    }
  }, [visibleCategories, activeTab]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && <Badge variant="default">{unreadCount}</Badge>}
            </span>
            {activeNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isDeleting}
              >
                <XIcon className="mr-2 h-4 w-4" />
                Close
              </Button>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Manage staff notifications and jump to relevant pages.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          {activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <BellIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                <Link href="/inbox?tab=notifications">
                  <ExternalLinkIcon className="mr-2 h-4 w-4" />
                  View notification history
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    if (isDeleting) return;
                    setIsDeleting(true);
                    try {
                      await deleteAll.mutateAsync();
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Clear all
                </Button>
              </div>

              <div className="px-4">
                <Tabs
                  value={activeTab}
                  onValueChange={(next) =>
                    setActiveTab(next as NotificationCategoryId)
                  }
                >
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {visibleCategories.map((cat) => {
                      const count = unreadCountByTab[cat.id] ?? 0;
                      return (
                        <TabsTrigger
                          key={cat.id}
                          value={cat.id}
                          className="gap-2"
                        >
                          <span>{cat.label}</span>
                          {count > 0 && (
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5"
                            >
                              {count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {visibleCategories.map((cat) => {
                    const items = notificationsByTab[cat.id] ?? [];
                    const categorized = categorizeNotifications(items);
                    const isEmpty =
                      categorized.today.length === 0 &&
                      categorized.yesterday.length === 0 &&
                      categorized.older.length === 0;

                    return (
                      <TabsContent
                        key={cat.id}
                        value={cat.id}
                        className="mt-4"
                      >
                        {isEmpty ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <BellIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              No {cat.label.toLowerCase()} notifications
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {categorized.today.length > 0 && (
                              <div>
                                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Today
                                </h3>
                                <div className="rounded-md border">
                                  {categorized.today.map((notification) => (
                                    <NotificationItem
                                      key={notification.id}
                                      notification={notification}
                                      onMarkRead={handleMarkRead}
                                      onDelete={handleDelete}
                                      onCloseSheet={() => handleOpenChange(false)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {categorized.yesterday.length > 0 && (
                              <div>
                                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Yesterday
                                </h3>
                                <div className="rounded-md border">
                                  {categorized.yesterday.map((notification) => (
                                    <NotificationItem
                                      key={notification.id}
                                      notification={notification}
                                      onMarkRead={handleMarkRead}
                                      onDelete={handleDelete}
                                      onCloseSheet={() => handleOpenChange(false)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {categorized.older.length > 0 && (
                              <div>
                                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Older
                                </h3>
                                <div className="rounded-md border">
                                  {categorized.older.map((notification) => (
                                    <NotificationItem
                                      key={notification.id}
                                      notification={notification}
                                      onMarkRead={handleMarkRead}
                                      onDelete={handleDelete}
                                      onCloseSheet={() => handleOpenChange(false)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>

              <div className="px-4 pb-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenChange(false)}
                >
                  <Link href="/inbox?tab=notifications">
                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
                    View all in inbox
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

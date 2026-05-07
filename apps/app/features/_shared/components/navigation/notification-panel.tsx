"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
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
import { BellIcon, CheckIcon, TrashIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PriorityBadge } from "@workspace/ui/components/status-badge";
import { formatTime, isToday, isYesterday } from "@workspace/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useDeleteAllNotifications,
  type StaffNotification,
} from "@/hooks/api/use-notifications";
import { useSocket } from "@/lib/socket-context";

const APPOINTMENT_REQUEST_NOTIFICATION_TYPES = new Set([
  "APPOINTMENT_REQUEST_CREATED",
  "APPOINTMENT_REQUEST_APPROVED",
  "APPOINTMENT_REQUEST_REJECTED",
]);

function staffNotificationNavigateHref(
  notification: StaffNotification,
): string | null {
  const type = String(notification.type);
  if (APPOINTMENT_REQUEST_NOTIFICATION_TYPES.has(type)) {
    return "/appointments?requestsPanel=1";
  }
  return null;
}

interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onCloseSheet: () => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onCloseSheet,
}: NotificationItemProps) {
  const router = useRouter();
  const navigateHref = staffNotificationNavigateHref(notification);

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
          aria-label={
            navigateHref
              ? `${notification.title}. Open appointment requests queue.`
              : undefined
          }
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
              <PriorityBadge
                priority={mappedPriority}
                showDot={false}
              />
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
          {navigateHref ? (
            <p className="text-[length:var(--fs-2xs)] text-muted-foreground">
              Click to open appointment requests
            </p>
          ) : null}
        </div>
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

type NotificationTabId =
  | "all"
  | "appointment-requests"
  | "appointments"
  | "prescriptions"
  | "invoices"
  | "payments-plan"
  | "system";

type NotificationTabDef = {
  id: NotificationTabId;
  label: string;
  typeAllowList?: readonly string[];
};

const NOTIFICATION_TABS: readonly NotificationTabDef[] = [
  { id: "all", label: "All" },
  {
    id: "appointment-requests",
    label: "Appointment requests",
    typeAllowList: [
      "APPOINTMENT_REQUEST_CREATED",
      "APPOINTMENT_REQUEST_APPROVED",
      "APPOINTMENT_REQUEST_REJECTED",
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    typeAllowList: [
      "APPOINTMENT_CANCEL",
      "APPOINTMENT_DELAY",
      "APPOINTMENT_RESCHEDULED",
      "APPOINTMENT_NO_SHOW",
      "APPOINTMENT_CONFIRMED",
    ],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    typeAllowList: ["PRESCRIPTION_PENDING", "PRESCRIPTION_SENT", "PRESCRIPTION_FAILED"],
  },
  {
    id: "invoices",
    label: "Invoices",
    typeAllowList: ["INVOICE_PENDING", "INVOICE_SENT", "INVOICE_FAILED"],
  },
  {
    id: "payments-plan",
    label: "Payments & plan",
    typeAllowList: [
      "SUBSCRIPTION_PAYMENT_DUE_SOON",
      "SUBSCRIPTION_PAYMENT_OVERDUE",
      "SUBSCRIPTION_PAYMENT_SUCCESS",
      "SUBSCRIPTION_PAYMENT_FAILED",
      "PAYMENT_PROVIDER_STATUS_UPDATE",
    ],
  },
  { id: "system", label: "System", typeAllowList: ["SYSTEM_ALERT"] },
] as const;

function filterNotificationsForTab(
  notifications: StaffNotification[],
  tab: NotificationTabDef,
): StaffNotification[] {
  if (!tab.typeAllowList) return notifications;
  const allowed = new Set(tab.typeAllowList);
  return notifications.filter((n) => allowed.has(n.type));
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
  const deleteAll = useDeleteAllNotifications();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTabId>("all");

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

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const activeNotifications = notifications.filter((n) => !n.deletedAt);
  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

  const notificationsByTab = useMemo(() => {
    return Object.fromEntries(
      NOTIFICATION_TABS.map((tab) => [tab.id, filterNotificationsForTab(activeNotifications, tab)]),
    ) as Record<NotificationTabId, StaffNotification[]>;
  }, [activeNotifications]);

  const unreadCountByTab = useMemo(() => {
    return Object.fromEntries(
      NOTIFICATION_TABS.map((tab) => [
        tab.id,
        (notificationsByTab[tab.id] ?? []).filter((n) => !n.isRead).length,
      ]),
    ) as Record<NotificationTabId, number>;
  }, [notificationsByTab]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default">
                  {unreadCount}
                </Badge>
              )}
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
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          {activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
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
                  onValueChange={(next) => setActiveTab(next as NotificationTabId)}
                >
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {NOTIFICATION_TABS.map((tab) => {
                      const count = unreadCountByTab[tab.id] ?? 0;
                      return (
                        <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                          <span>{tab.label}</span>
                          {count > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5">
                              {count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {NOTIFICATION_TABS.map((tab) => {
                    const items = notificationsByTab[tab.id] ?? [];
                    const categorized = categorizeNotifications(items);
                    const isEmpty =
                      categorized.today.length === 0 &&
                      categorized.yesterday.length === 0 &&
                      categorized.older.length === 0;

                    return (
                      <TabsContent key={tab.id} value={tab.id} className="mt-4">
                        {isEmpty ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <BellIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              No {tab.label.toLowerCase()} notifications
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
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { BellIcon, CheckIcon, TrashIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PriorityBadge } from "@workspace/ui/components/status-badge";
import {
  useNotifications,
  useMarkNotificationRead,
  useDeleteAllNotifications,
  type StaffNotification,
} from "@/hooks/api/use-notifications";
import { useSocket } from "@/lib/socket-context";
import { format, isToday, isYesterday, parseISO } from "date-fns";

interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const priorityMap = {
    URGENT: "urgent",
    HIGH: "high",
    NORMAL: "medium",
    LOW: "low",
  } as const;

  return (
    <div
      className={cn(
        "border-b p-4 transition-colors hover:bg-muted/50",
        !notification.isRead && "bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            {notification.priority !== "NORMAL" && (
              <PriorityBadge
                priority={priorityMap[notification.priority]}
                showDot={false}
              />
            )}
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(
              parseISO(notification.createdAt.toString()),
              "h:mm a",
            )}
          </p>
        </div>
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMarkRead(notification.id)}
          >
            <CheckIcon className="h-4 w-4" />
          </Button>
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
    const date = parseISO(notification.createdAt.toString());
    if (isToday(date)) {
      today.push(notification);
    } else if (isYesterday(date)) {
      yesterday.push(notification);
    } else {
      older.push(notification);
    }
  });

  return { today, yesterday, older };
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
  const categorized = categorizeNotifications(activeNotifications);
  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

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
              {categorized.today.length > 0 && (
                <div>
                  <h3 className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground">
                    Today
                  </h3>
                  <div>
                    {categorized.today.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                </div>
              )}

              {categorized.yesterday.length > 0 && (
                <div>
                  <h3 className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground">
                    Yesterday
                  </h3>
                  <div>
                    {categorized.yesterday.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                </div>
              )}

              {categorized.older.length > 0 && (
                <div>
                  <h3 className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground">
                    Older
                  </h3>
                  <div>
                    {categorized.older.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

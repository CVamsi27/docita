"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/overlay/sheet";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { ScrollArea } from "@workspace/ui/components/layout/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import Link from "next/link";
import { BellIcon, ExternalLinkIcon, TrashIcon, XIcon } from "lucide-react";
import {
  queryKeys,
  useNotifications,
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  type StaffNotification,
} from "@workspace/data-access";
import { useSocket } from "@/lib/contexts/socket-context";
import {
  isNotificationCategoryId,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryId,
} from "./notification-href";
import {
  NotificationItem,
  categorizeNotifications,
  filterByCategory,
} from "./notification-item";

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
        queryKeys.notifications.all(),
        (old = []) => [notification, ...old],
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    };
    const handleNotificationRead = (data: { id: string; readAt: Date }) => {
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
    const handleNotificationDeleted = (data: { id: string }) => {
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

  const visibleCategories = useMemo(() => {
    return NOTIFICATION_CATEGORIES.filter((cat) => {
      if (cat.id === "all") return true;
      return filterByCategory(activeNotifications, cat.types).length > 0;
    });
  }, [activeNotifications]);

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

  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
  }, [visibleCategories, activeTab]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default">{unreadCount}</Badge>
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
                  onValueChange={(next) => {
                    if (isNotificationCategoryId(next)) {
                      setActiveTab(next);
                    }
                  }}
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
                            <Badge variant="secondary" className="h-5 px-1.5">
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
                      <TabsContent key={cat.id} value={cat.id} className="mt-4">
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
                                      onCloseSheet={() =>
                                        handleOpenChange(false)
                                      }
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
                                      onCloseSheet={() =>
                                        handleOpenChange(false)
                                      }
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
                                      onCloseSheet={() =>
                                        handleOpenChange(false)
                                      }
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

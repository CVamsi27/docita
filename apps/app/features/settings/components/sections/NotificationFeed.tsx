import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useUnreadNotifications,
} from "@/hooks/api/use-whatsapp";

const PRIORITY_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export function NotificationFeed() {
  const [optimisticAllRead, setOptimisticAllRead] = useState(false);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useUnreadNotifications(50);
  const { mutate: markAsRead, isPending: isMarkingRead } =
    useMarkNotificationsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } =
    useMarkAllNotificationsRead();

  const sortedNotifications = useMemo(() => {
    return [...(notifications ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (optimisticAllRead) {
      return [];
    }

    return sortedNotifications.filter(
      (notification) => !optimisticHiddenIds.has(notification.id),
    );
  }, [optimisticAllRead, optimisticHiddenIds, sortedNotifications]);

  useEffect(() => {
    const notificationCount = notifications?.length ?? 0;

    if (notificationCount === 0) {
      setOptimisticAllRead(false);
      setOptimisticHiddenIds(new Set());
      return;
    }

    if (!optimisticAllRead) {
      setOptimisticAllRead(true);
      markAllAsRead(undefined, {
        onError: () => {
          setOptimisticAllRead(false);
        },
        onSettled: () => {
          void refetch();
        },
      });
    }
  }, [notifications?.length, optimisticAllRead, markAllAsRead, refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle>Notification Feed</CardTitle>
              <CardDescription>
                Recent in-app notifications
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isRefetching}
            >
              {isRefetching && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOptimisticAllRead(true);
                markAllAsRead(undefined, {
                  onError: () => {
                    setOptimisticAllRead(false);
                  },
                });
              }}
              disabled={isMarkingAll || visibleNotifications.length === 0}
            >
              {isMarkingAll && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark all as read
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load notifications. Please refresh.
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const priority = (notification.priority || "").toUpperCase();
              const variant = PRIORITY_VARIANTS[priority] ?? "outline";

              return (
                <div
                  key={notification.id}
                  className="rounded-md border p-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.type.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={variant}>{priority || "UNKNOWN"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const notificationId = notification.id;
                        setOptimisticHiddenIds((prev) => {
                          const next = new Set(prev);
                          next.add(notificationId);
                          return next;
                        });

                        markAsRead(
                          { notificationIds: [notificationId] },
                          {
                            onError: () => {
                              setOptimisticHiddenIds((prev) => {
                                const next = new Set(prev);
                                next.delete(notificationId);
                                return next;
                              });
                            },
                          },
                        );
                      }}
                      disabled={isMarkingRead}
                    >
                      Mark read
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";
import { Bell, Loader2, X } from "lucide-react";
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
  useDeleteAllNotifications,
  useDeleteNotification,
  useUnreadNotifications,
} from "@/hooks/api/use-whatsapp";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

const PRIORITY_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export function NotificationFeed() {
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
  const { mutate: deleteNotification } = useDeleteNotification();
  const { mutate: deleteAllNotifications, isPending: isDeletingAll } =
    useDeleteAllNotifications();

  const sortedNotifications = useMemo(() => {
    return [...(notifications ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifications]);

  const visibleNotifications = useMemo(
    () =>
      sortedNotifications.filter(
        (notification) => !optimisticHiddenIds.has(notification.id),
      ),
    [optimisticHiddenIds, sortedNotifications],
  );

  const groupedNotifications = useMemo(() => {
    const groups: Array<{
      label: string;
      items: typeof visibleNotifications;
    }> = [];

    for (const notification of visibleNotifications) {
      const rawDate = notification.createdAt;
      const createdAt =
        typeof rawDate === "string" ? parseISO(rawDate) : new Date(rawDate);
      const label = isToday(createdAt)
        ? "Today"
        : isYesterday(createdAt)
          ? "Yesterday"
          : format(createdAt, "dd MMM yyyy");

      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.items.push(notification);
      } else {
        groups.push({ label, items: [notification] });
      }
    }

    return groups;
  }, [visibleNotifications]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning" />
            <div>
              <CardTitle>Notification Feed</CardTitle>
              <CardDescription>Recent in-app notifications</CardDescription>
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
                const allVisibleIds = visibleNotifications.map((n) => n.id);
                if (allVisibleIds.length === 0) return;

                setOptimisticHiddenIds((prev) => {
                  const next = new Set(prev);
                  allVisibleIds.forEach((id) => next.add(id));
                  return next;
                });

                deleteAllNotifications(undefined, {
                  onError: () => {
                    setOptimisticHiddenIds((prev) => {
                      const next = new Set(prev);
                      allVisibleIds.forEach((id) => next.delete(id));
                      return next;
                    });
                  },
                });
              }}
              disabled={isDeletingAll || visibleNotifications.length === 0}
            >
              {isDeletingAll && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="surface-danger rounded-md p-3 text-sm">
            We could not load notifications. Please refresh.
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-5">
            {groupedNotifications.map((group) => (
              <div key={group.label} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h4>
                <div className="space-y-3">
                  {group.items.map((notification) => {
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
                            {humanizeUiLabel(notification.type)}
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
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Close notification"
                            onClick={() => {
                              const notificationId = notification.id;
                              setOptimisticHiddenIds((prev) => {
                                const next = new Set(prev);
                                next.add(notificationId);
                                return next;
                              });

                              deleteNotification(
                                { notificationId },
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
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

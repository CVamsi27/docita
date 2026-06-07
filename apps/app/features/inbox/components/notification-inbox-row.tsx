"use client";

import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { isToday, isYesterday } from "@workspace/utils";
import type { StaffNotification } from "@workspace/data-access";
import {
  mapStaffNotificationPriority,
  notificationHref,
} from "@/components/navigation/notification-href";
import {
  NotificationItemActions,
  NotificationItemContent,
} from "@/components/navigation/notification-item-content";

interface RowProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
}: RowProps) {
  const router = useRouter();
  const href = notificationHref(notification);

  const mappedPriority = mapStaffNotificationPriority(notification.priority);

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
            href &&
              "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
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
          <NotificationItemContent
            notification={notification}
            priority={mappedPriority}
            messageClassName="text-[length:var(--fs-sm)]"
          />
        </div>
        <NotificationItemActions
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export function categorize(notifications: StaffNotification[]) {
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

export function filterByCategory(
  notifications: StaffNotification[],
  types: readonly string[] | undefined,
): StaffNotification[] {
  if (!types) return notifications;
  const allowed = new Set(types);
  return notifications.filter((n) => allowed.has(String(n.type)));
}

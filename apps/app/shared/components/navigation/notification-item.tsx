"use client";

import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { isToday, isYesterday } from "@workspace/utils";
import type { StaffNotification } from "@workspace/data-access";
import {
  mapStaffNotificationPriority,
  notificationHref,
} from "./notification-href";
import {
  NotificationItemActions,
  NotificationItemContent,
} from "./notification-item-content";

export interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onCloseSheet: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onCloseSheet,
}: NotificationItemProps) {
  const router = useRouter();
  const navigateHref = notificationHref(notification);

  const mappedPriority = mapStaffNotificationPriority(notification.priority);

  const handleOpenDestination = () => {
    if (!navigateHref) return;
    router.push(navigateHref);
    onCloseSheet();
    if (!notification.isRead) void onMarkRead(notification.id);
  };

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
          <NotificationItemContent
            notification={notification}
            priority={mappedPriority}
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

export interface CategorizedNotifications {
  today: StaffNotification[];
  yesterday: StaffNotification[];
  older: StaffNotification[];
}

export function categorizeNotifications(
  notifications: StaffNotification[],
): CategorizedNotifications {
  const today: StaffNotification[] = [];
  const yesterday: StaffNotification[] = [];
  const older: StaffNotification[] = [];
  notifications.forEach((notification) => {
    const createdAt = notification.createdAt;
    if (isToday(createdAt)) today.push(notification);
    else if (isYesterday(createdAt)) yesterday.push(notification);
    else older.push(notification);
  });
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

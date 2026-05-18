"use client";

import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PriorityBadge } from "@workspace/ui/components/indicators/status-badge";
import { formatTime, isToday, isYesterday } from "@workspace/utils";
import type { StaffNotification } from "@/hooks/api/use-notifications";
import { notificationHref } from "./notification-href";

export interface NotificationItemProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onCloseSheet: () => void;
}

export function NotificationItem({ notification, onMarkRead, onDelete, onCloseSheet }: NotificationItemProps) {
  const router = useRouter();
  const navigateHref = notificationHref(notification);

  const priorityMap = { URGENT: "urgent", HIGH: "high", NORMAL: "medium", LOW: "low" } as const;
  const mappedPriority =
    notification.priority in priorityMap
      ? priorityMap[notification.priority as keyof typeof priorityMap]
      : "medium";

  const handleOpenDestination = () => {
    if (!navigateHref) return;
    router.push(navigateHref);
    onCloseSheet();
    if (!notification.isRead) void onMarkRead(notification.id);
  };

  const isAppointmentRequest = String(notification.type).startsWith("APPOINTMENT_REQUEST_");
  const ariaLabel = navigateHref
    ? isAppointmentRequest
      ? `${notification.title}. Open appointment requests queue.`
      : `${notification.title}. Open related page.`
    : undefined;

  return (
    <div className={cn("border-b transition-colors", !notification.isRead && "bg-primary/5", navigateHref && "hover:bg-muted/40")}>
      <div className="flex items-start justify-between gap-2 p-3">
        <div
          className={cn("min-w-0 flex-1 space-y-1 rounded-sm outline-none", navigateHref && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring")}
          role={navigateHref ? "button" : undefined}
          tabIndex={navigateHref ? 0 : undefined}
          aria-label={ariaLabel}
          onClick={navigateHref ? handleOpenDestination : undefined}
          onKeyDown={navigateHref ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleOpenDestination(); } } : undefined}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[length:var(--fs-sm)] font-medium">{notification.title}</h4>
            {notification.priority !== "NORMAL" && <PriorityBadge priority={mappedPriority} showDot={false} />}
            {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
          </div>
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">{notification.message}</p>
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">{formatTime(notification.createdAt)}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {!notification.isRead && (
            <SymbolTooltip label="Mark as read">
              <Button variant="ghost" size="icon-sm" type="button" onClick={(event) => { event.stopPropagation(); void onMarkRead(notification.id); }} aria-label="Mark as read">
                <CheckIcon className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}
          <SymbolTooltip label="Dismiss">
            <Button variant="ghost" size="icon-sm" type="button" onClick={(event) => { event.stopPropagation(); void onDelete(notification.id); }} aria-label="Dismiss notification">
              <XIcon className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        </div>
      </div>
    </div>
  );
}

export interface CategorizedNotifications {
  today: StaffNotification[];
  yesterday: StaffNotification[];
  older: StaffNotification[];
}

export function categorizeNotifications(notifications: StaffNotification[]): CategorizedNotifications {
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

export function filterByCategory(notifications: StaffNotification[], types: readonly string[] | undefined): StaffNotification[] {
  if (!types) return notifications;
  const allowed = new Set(types);
  return notifications.filter((n) => allowed.has(String(n.type)));
}

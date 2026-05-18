"use client";

import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PriorityBadge } from "@workspace/ui/components/indicators/status-badge";
import { formatTime, isToday, isYesterday } from "@workspace/utils";
import type { StaffNotification } from "@/hooks/api/use-notifications";
import { notificationHref } from "@/components/navigation/notification-href";

interface RowProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationRow({ notification, onMarkRead, onDelete }: RowProps) {
  const router = useRouter();
  const href = notificationHref(notification);

  const priorityMap = { URGENT: "urgent", HIGH: "high", NORMAL: "medium", LOW: "low" } as const;
  const mappedPriority = notification.priority in priorityMap
    ? priorityMap[notification.priority as keyof typeof priorityMap]
    : "medium";

  const open = () => {
    if (!href) return;
    router.push(href);
    if (!notification.isRead) void onMarkRead(notification.id);
  };

  return (
    <div className={cn("border-b transition-colors", !notification.isRead && "bg-primary/5", href && "hover:bg-muted/40")}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div
          className={cn("min-w-0 flex-1 space-y-1 rounded-sm outline-none", href && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring")}
          role={href ? "button" : undefined}
          tabIndex={href ? 0 : undefined}
          onClick={href ? open : undefined}
          onKeyDown={href ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } } : undefined}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[length:var(--fs-sm)] font-medium">{notification.title}</h4>
            {notification.priority !== "NORMAL" && <PriorityBadge priority={mappedPriority} showDot={false} />}
            {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
          </div>
          <p className="text-[length:var(--fs-sm)] text-muted-foreground">{notification.message}</p>
          <p className="text-[length:var(--fs-xs)] text-muted-foreground">{formatTime(notification.createdAt)}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {!notification.isRead && (
            <SymbolTooltip label="Mark as read">
              <Button variant="ghost" size="icon-sm" type="button" onClick={(e) => { e.stopPropagation(); void onMarkRead(notification.id); }} aria-label="Mark as read">
                <CheckIcon className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}
          <SymbolTooltip label="Dismiss">
            <Button variant="ghost" size="icon-sm" type="button" onClick={(e) => { e.stopPropagation(); void onDelete(notification.id); }} aria-label="Dismiss notification">
              <XIcon className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        </div>
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

export function filterByCategory(notifications: StaffNotification[], types: readonly string[] | undefined): StaffNotification[] {
  if (!types) return notifications;
  const allowed = new Set(types);
  return notifications.filter((n) => allowed.has(String(n.type)));
}

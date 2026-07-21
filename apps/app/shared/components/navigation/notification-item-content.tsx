"use client";

import { Button, PriorityBadge, SymbolTooltip } from "@workspace/ui/components";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { formatTime } from "@workspace/utils";
import type { StaffNotification } from "@workspace/data-access";

interface NotificationItemContentProps {
  notification: StaffNotification;
  priority: "urgent" | "high" | "medium" | "low";
  messageClassName?: string;
}

export function NotificationItemContent({
  notification,
  priority,
  messageClassName = "text-[length:var(--fs-xs)]",
}: NotificationItemContentProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[length:var(--fs-sm)] font-medium">
          {notification.title}
        </h4>
        {notification.priority !== "NORMAL" && (
          <PriorityBadge priority={priority} showDot={false} />
        )}
        {!notification.isRead && (
          <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        )}
      </div>
      <p className={cn("text-muted-foreground", messageClassName)}>
        {notification.message}
      </p>
      <p className="text-[length:var(--fs-xs)] text-muted-foreground">
        {formatTime(notification.createdAt)}
      </p>
    </>
  );
}

interface NotificationItemActionsProps {
  notification: StaffNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItemActions({
  notification,
  onMarkRead,
  onDelete,
}: NotificationItemActionsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {!notification.isRead && (
        <SymbolTooltip label="Mark read">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void onMarkRead(notification.id);
            }}
            aria-label="Mark notification read"
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
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(notification.id);
          }}
          aria-label="Dismiss notification"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
    </div>
  );
}

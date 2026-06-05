"use client";

import { BellIcon } from "lucide-react";
import type { StaffNotification } from "@workspace/data-access";
import {
  NotificationItem,
  categorizeNotifications,
} from "./notification-item";

interface NotificationTabContentProps {
  notifications: StaffNotification[];
  categoryLabel: string;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onCloseSheet: () => void;
}

type SectionKey = "today" | "yesterday" | "older";

const SECTION_LABELS: Record<SectionKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Older",
};

const SECTIONS: SectionKey[] = ["today", "yesterday", "older"];

export function NotificationTabContent({
  notifications,
  categoryLabel,
  onMarkRead,
  onDelete,
  onCloseSheet,
}: NotificationTabContentProps) {
  const categorized = categorizeNotifications(notifications);
  const availableSections = SECTIONS.filter(
    (key) => categorized[key].length > 0,
  );

  if (availableSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <BellIcon className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No {categoryLabel.toLowerCase()} notifications
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableSections.map((key) => (
        <div key={key}>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            {SECTION_LABELS[key]}
          </h3>
          <div className="rounded-md border">
            {categorized[key].map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                onCloseSheet={onCloseSheet}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

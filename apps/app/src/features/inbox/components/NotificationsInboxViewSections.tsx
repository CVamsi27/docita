"use client";

import { Badge, Button, DataState, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { BellIcon, TrashIcon } from "lucide-react";
import { NotificationRow } from "./notification-inbox-row";
import { categorize } from "./notification-inbox-helpers";
import type { StaffNotification } from "@workspace/data-access";
import type { NotificationCategoryDef } from "@/components/navigation/notification-href";

interface NotificationsInboxHeaderProps {
  unreadCount: number;
  isDeleting: boolean;
  onClearAll: () => void;
}

export function NotificationsInboxHeader({
  unreadCount,
  isDeleting,
  onClearAll,
}: NotificationsInboxHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[length:var(--fs-sm)] text-muted-foreground">
        {unreadCount > 0
          ? `${unreadCount} unread`
          : "All caught up — review history below."}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={isDeleting}
        onClick={onClearAll}
      >
        <TrashIcon className="mr-2 h-4 w-4" />
        Clear all
      </Button>
    </div>
  );
}

interface NotificationsInboxTabsProps {
  activeTab: string;
  onTabChange: (v: string) => void;
  visibleCategories: readonly NotificationCategoryDef[];
  unreadByTab: Record<string, number>;
  byTab: Record<string, StaffNotification[]>;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationsInboxTabs({
  activeTab,
  onTabChange,
  visibleCategories,
  unreadByTab,
  byTab,
  onMarkRead,
  onDelete,
}: NotificationsInboxTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {visibleCategories.map((cat) => {
          const count = unreadByTab[cat.id] ?? 0;
          return (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
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
        const items = byTab[cat.id] ?? [];
        const grouped = categorize(items);
        const empty =
          grouped.today.length === 0 &&
          grouped.yesterday.length === 0 &&
          grouped.older.length === 0;
        return (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            {empty ? (
              <DataState
                status="empty"
                emptyIcon={BellIcon}
                emptyTitle={`No ${cat.label.toLowerCase()} notifications`}
                className="min-h-[30vh]"
              />
            ) : (
              <div className="space-y-6">
                {grouped.today.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Today
                    </h3>
                    <div className="overflow-hidden rounded-md border">
                      {grouped.today.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {grouped.yesterday.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Yesterday
                    </h3>
                    <div className="overflow-hidden rounded-md border">
                      {grouped.yesterday.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {grouped.older.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Older
                    </h3>
                    <div className="overflow-hidden rounded-md border">
                      {grouped.older.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={onMarkRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from "@workspace/data-access";
import {
  isNotificationCategoryId,
  type NotificationCategoryId,
} from "./notification-href";
import { useNotificationPanel } from "./use-notification-panel";
import { NotificationPanelEmpty } from "./notification-panel-empty";
import { NotificationTabContent } from "./notification-panel-tab-content";

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
  const {
    activeNotifications,
    unreadCount,
    visibleCategories,
    notificationsByTab,
    unreadCountByTab,
  } = useNotificationPanel(open, enabled);

  const markRead = useMarkNotificationRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryId>("all");

  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
  }, [visibleCategories, activeTab]);

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync({ id });
  };
  const handleDelete = async (id: string) => {
    await deleteOne.mutateAsync({ id });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                onClick={() => onOpenChange(false)}
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
            <NotificationPanelEmpty onClose={() => onOpenChange(false)} />
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
                    return (
                      <TabsContent key={cat.id} value={cat.id} className="mt-4">
                        <NotificationTabContent
                          notifications={items}
                          categoryLabel={cat.label}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                          onCloseSheet={() => onOpenChange(false)}
                        />
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
                  onClick={() => onOpenChange(false)}
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

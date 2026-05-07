"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@workspace/ui/components/breadcrumbs";
import { TopBar } from "@workspace/ui/components/top-bar";
import { Button } from "@workspace/ui/components/button";
import { Sparkles } from "lucide-react";
import { GlobalSearch } from "@/features/search/components/GlobalSearch";
import { breadcrumbsFor } from "@/app/(protected)/route-meta";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";
import { QuickAddPopover } from "@/features/_shared/components/navigation/quick-add-popover";
import { NotificationBellWithBadges } from "@/features/_shared/components/navigation/notification-bell-with-badges";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useUnreadNotificationCount } from "@/hooks/api/use-notifications";

export function DesktopTopBar() {
  const pathname = usePathname() ?? "";
  const crumbs: BreadcrumbItem[] = breadcrumbsFor(pathname);
  const { openOverlay } = useAskAi();
  const { user } = useAuth();
  const { canAccess, workspaceProfile } = usePermissionStore();
  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
    { role: user?.role, canAccessFeature: canAccess, workspaceProfile },
    "read",
  );
  const { data: unreadNotificationCount } =
    useUnreadNotificationCount(canAccessNotifications);
  const notificationCount = unreadNotificationCount?.count ?? 0;

  return (
    <TopBar
      leading={
        <div className="hidden md:block">
          <Breadcrumbs
            items={crumbs}
            renderLink={(item, content) =>
              item.href ? <Link href={item.href}>{content}</Link> : content
            }
          />
        </div>
      }
      trailing={
        <>
          <GlobalSearch />
          <QuickAddPopover />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => openOverlay()}
            aria-label="Open Ask AI"
            data-testid="topbar-ask-ai"
          >
            <Sparkles className="size-4" aria-hidden />
          </Button>
          {canAccessNotifications ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild
              className="relative overflow-visible"
              aria-label={
                notificationCount > 0
                  ? `Notifications, ${notificationCount} unread`
                  : "Notifications"
              }
            >
              <Link href="/inbox">
                <NotificationBellWithBadges count={notificationCount} />
              </Link>
            </Button>
          ) : null}
        </>
      }
    />
  );
}

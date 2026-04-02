"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { useUnreadNotificationCount } from "@/hooks/api/use-notifications";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import {
  navItems,
  mobileOnlyNavItems,
  type NavItem,
} from "./nav-config";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { canAccess } = usePermissionStore();
  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_WHATSAPP,
    {
      role: user?.role,
      canAccessFeature: canAccess,
    },
    "read",
  );
  const { data: unreadNotificationCount } =
    useUnreadNotificationCount(canAccessNotifications);
  const notificationCount = unreadNotificationCount?.count ?? 0;

  const filteredNavItems = navItems.filter((item: NavItem) => {
    if (item.accessTarget) {
      return canAccessTarget(
        item.accessTarget,
        {
          role: user?.role,
          canAccessFeature: canAccess,
        },
        "read",
      );
    }

    if (item.feature && !canAccess(item.feature)) {
      return false;
    }

    return true;
  });

  const filteredMobileOnlyItems = canAccessNotifications
    ? mobileOnlyNavItems
    : mobileOnlyNavItems.filter(
        (item) => !item.href.startsWith("/settings?tab=notification-feed"),
      );
  const allMobileItems = [...filteredNavItems, ...filteredMobileOnlyItems];

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex h-10 items-center"
              >
                <DocitaLogo />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {allMobileItems.map((item: NavItem) => {
                const isSettingsItem = item.href === "/settings";
                const isNotificationItem = item.href.startsWith("/settings?tab=notification-feed");
                const isActive = isSettingsItem
                  ? pathname.startsWith("/settings")
                  : isNotificationItem
                    ? pathname === "/settings"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {isNotificationItem && notificationCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto px-1.5 min-w-5 h-5 text-[10px]"
                      >
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

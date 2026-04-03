"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { DocitaIcon, DocitaLogo } from "@workspace/ui/components/docita-logo";
import {
  useUnreadNotificationCount,
  usePendingJoinRequestCount,
} from "@/hooks/api/use-notifications";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/app-config-context";
import { canAccessTarget } from "@/lib/access-policy";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { APP_ACCESS_TARGETS, type ClinicType } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { CLINIC_ADMIN_ROLES } from "@/lib/permissions";
import { useClinic } from "@/lib/clinic-context";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";
import { NotificationPanel } from "./notification-panel";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import {
  navItems,
  SETTINGS_NAV_ITEM,
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  IPD_NAV_ITEM,
  FIXED_NAV_HREFS,
  type NavItem,
} from "./nav-config";

const SIDEBAR_ICON_VARIANTS: Record<
  string,
  { idle: string; active: string }
> = {
  "/dashboard": {
    idle: "bg-primary/10 text-primary",
    active: "bg-primary/15 text-primary ring-primary/20",
  },
  "/patients": {
    idle: "bg-info/10 text-info",
    active: "bg-info/15 text-info ring-info/20",
  },
  "/appointments": {
    idle: "bg-success/10 text-success",
    active: "bg-success/15 text-success ring-success/20",
  },
  "/consultation": {
    idle: "bg-primary/10 text-primary",
    active: "bg-primary/15 text-primary ring-primary/20",
  },
  "/prescriptions": {
    idle: "bg-primary/10 text-primary",
    active: "bg-primary/15 text-primary ring-primary/20",
  },
  "/lab-tests": {
    idle: "bg-warning/10 text-warning",
    active: "bg-warning/15 text-warning ring-warning/20",
  },
  "/invoices": {
    idle: "bg-success/10 text-success",
    active: "bg-success/15 text-success ring-success/20",
  },
  "/inventory": {
    idle: "bg-muted/60 text-muted-foreground",
    active: "bg-muted text-foreground ring-border/70",
  },
  "/documents": {
    idle: "bg-info/10 text-info",
    active: "bg-info/15 text-info ring-info/20",
  },
  "/analytics": {
    idle: "bg-primary/10 text-primary",
    active: "bg-primary/15 text-primary ring-primary/20",
  },
  "/coding-queue": {
    idle: "bg-warning/10 text-warning",
    active: "bg-warning/15 text-warning ring-warning/20",
  },
  "/import": {
    idle: "bg-secondary/10 text-secondary-foreground",
    active: "bg-secondary/15 text-secondary-foreground ring-secondary/20",
  },
  "/settings": {
    idle: "bg-primary/10 text-primary",
    active: "bg-primary/15 text-primary ring-primary/20",
  },
};

function getSidebarIconClasses(href: string, isActive: boolean) {
  const variant = SIDEBAR_ICON_VARIANTS[href] ?? {
    idle: "bg-muted/60 text-muted-foreground",
    active: "bg-muted text-foreground ring-border/70",
  };

  return cn(
    "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ring-1 ring-transparent",
    isActive ? variant.active : variant.idle,
  );
}

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  isCollapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const isAdmin = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);
  const { canAccess, getTierInfo, clinicType: storeClinicType } = usePermissionStore();
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
  const { data: pendingJoinRequestData } = usePendingJoinRequestCount(isAdmin);
  const { getClinicSetting } = useAppConfig();
  const { isHidden, toggleItem } = useSidebarPreferences(clinicId);

  const notificationCount = unreadNotificationCount?.count ?? 0;
  const pendingJoinRequestCount = pendingJoinRequestData?.count ?? 0;

  const clinicType = (storeClinicType ||
    getClinicSetting("clinicType")) as ClinicType | undefined;

  const specialtySections = ClinicFeatureService.getSpecialtySections(clinicType);

  const specialtyNavItems: NavItem[] = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || SPECIALTY_ICONS["Brain"]!,
    label: section.label,
    feature: undefined,
  }));

  const hospitalNavItems: NavItem[] = [];
  if (clinicType === "SPECIALTY") {
    hospitalNavItems.push(IPD_NAV_ITEM);
  }

  const allNavItems = [...navItems, ...specialtyNavItems, ...hospitalNavItems];

  const accessibleNavItems = allNavItems.filter((item) => {
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

    return !item.feature || canAccess(item.feature);
  });

  const visibleNavItems = [
    ...accessibleNavItems.filter(
      (item) => FIXED_NAV_HREFS.has(item.href) || !isHidden(item.href),
    ),
    SETTINGS_NAV_ITEM,
  ];

  const customizableNavItems = accessibleNavItems.filter(
    (item) => !FIXED_NAV_HREFS.has(item.href),
  );

  const tierInfo = getTierInfo();
  const tierIndicatorClass = cn(
    "h-2.5 w-2.5 rounded-full animate-pulse bg-current shadow-[0_0_10px_currentColor]",
    tierInfo.color === "gray" && "bg-muted-foreground",
    tierInfo.color === "blue" && "text-info",
    tierInfo.color === "green" && "text-success",
    tierInfo.color === "purple" && "text-primary",
    tierInfo.color === "violet" && "text-primary",
    tierInfo.color === "orange" && "text-warning",
    tierInfo.color === "pink" && "text-secondary",
    tierInfo.color === "gray" && "text-muted-foreground",
  );
  const controlIconButtonClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-background border-r transition-[width] duration-150",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {isCollapsed ? (
          <Link
            href="/dashboard"
            className="flex h-10 w-full items-center justify-center"
          >
            <DocitaIcon />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex h-10 items-center gap-2">
            <DocitaLogo />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          className="h-8 w-8"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 py-1 space-y-0.5">
        {canAccessNotifications && (
          <Button
            variant="ghost"
            className={cn(
              "group w-full justify-start gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed && "justify-center px-2",
            )}
            onClick={() => setNotificationPanelOpen(true)}
            title={isCollapsed ? "Notifications" : undefined}
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 transition-colors group-hover:bg-muted">
              <Bell className="h-4 w-4 shrink-0" />
              {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            {!isCollapsed && <span>Notifications</span>}
            {!isCollapsed && notificationCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-auto px-1.5 min-w-5 h-5 text-[10px]"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
        )}

        {visibleNavItems.map((item) => {
          const isSettingsItem = item.href === "/settings";
          const isActive = isSettingsItem
            ? pathname.startsWith("/settings")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const settingsBadgeCount =
            isSettingsItem && isAdmin ? pendingJoinRequestCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div
                className={getSidebarIconClasses(item.href, isActive)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {isCollapsed && settingsBadgeCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </div>
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && settingsBadgeCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto px-1.5 min-w-5 h-5 text-[10px]"
                >
                  {settingsBadgeCount > 9 ? "9+" : settingsBadgeCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-2 py-1.5">
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground font-medium">Theme</span>
            <ThemeToggle />
          </div>
        ) : (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="border-t px-2 py-1.5">
          <div className="space-y-2 p-1.5">
            <div
              className={cn(
                "flex items-center",
                isCollapsed ? "justify-center" : "gap-2.5",
              )}
            >
              <div className={tierIndicatorClass} />
              {!isCollapsed ? (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    Plan
                  </p>
                  <p className="text-sm font-medium truncate">{tierInfo.name}</p>
                </div>
              ) : (
                <span className="sr-only">{tierInfo.name} plan</span>
              )}
            </div>
            <div
              className={cn(
                "flex items-center gap-2",
                isCollapsed && "justify-center",
              )}
            >
              {canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
                role: user?.role,
                canAccessFeature: canAccess,
              }) && (
                <Button
                  className={cn(
                    isCollapsed
                      ? "h-8 w-8 rounded-md border border-primary/30 bg-primary/10 p-0 text-primary hover:bg-primary/20"
                      : "flex-1 gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                  )}
                  size="sm"
                  asChild
                >
                  <Link href="/upgrade">
                    <Sparkles className="h-3.5 w-3.5" />
                    {!isCollapsed && "Upgrade"}
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn(controlIconButtonClass)}
                title="Customize sidebar"
                onClick={() => setCustomizeOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {canAccessNotifications && (
        <NotificationPanel
          open={notificationPanelOpen}
          onOpenChange={setNotificationPanelOpen}
          enabled={canAccessNotifications}
        />
      )}

      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Customize Sidebar</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Toggle which items appear in the sidebar for your clinic.
          </p>
          <div className="space-y-1">
            {customizableNavItems.map((item) => (
              <div
                key={item.href}
                className="flex items-center justify-between py-1.5 px-1"
              >
                <div className="flex items-center gap-3 text-sm">
                  <div className={getSidebarIconClasses(item.href, false)}>
                    <item.icon className="h-4 w-4 shrink-0" />
                  </div>
                  <span>{item.label}</span>
                </div>
                <Switch
                  checked={!isHidden(item.href)}
                  onCheckedChange={() => toggleItem(item.href)}
                />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}

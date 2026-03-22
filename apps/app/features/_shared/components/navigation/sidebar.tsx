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
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { type ClinicType } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { CLINIC_ADMIN_ROLES } from "@/lib/permissions";
import { useClinic } from "@/lib/clinic-context";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";
import { NotificationPanel } from "./notification-panel";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import {
  navItems,
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  IPD_NAV_ITEM,
  FIXED_NAV_HREFS,
  type NavItem,
} from "./nav-config";

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
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const { data: pendingJoinRequestData } = usePendingJoinRequestCount(isAdmin);
  const { getClinicSetting } = useAppConfig();
  const { canAccess, getTierInfo, clinicType: storeClinicType } = usePermissionStore();
  const { isHidden, toggleItem } = useSidebarPreferences(clinicId);

  const notificationCount = unreadNotificationCount?.count ?? 0;
  const pendingJoinRequestCount = pendingJoinRequestData?.count ?? 0;

  // Permission store is populated from localStorage immediately; AppConfig is a fallback
  const clinicType = (storeClinicType ||
    getClinicSetting("clinicType")) as ClinicType | undefined;

  const specialtySections = ClinicFeatureService.getSpecialtySections(clinicType);

  const specialtyNavItems = specialtySections.map((section) => ({
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

  // Items that pass the feature gate
  const accessibleNavItems = allNavItems.filter(
    (item) => !item.feature || canAccess(item.feature),
  );

  // Items shown in the sidebar (respecting admin hide preferences)
  const visibleNavItems = accessibleNavItems.filter(
    (item) => FIXED_NAV_HREFS.has(item.href) || !isHidden(item.href),
  );

  // Items that admins can toggle (accessible, non-fixed)
  const customizableNavItems = accessibleNavItems.filter(
    (item) => !FIXED_NAV_HREFS.has(item.href),
  );

  const tierInfo = getTierInfo();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-background border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {isCollapsed ? (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <DocitaIcon className="h-7 w-7" />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
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

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
            isCollapsed && "justify-center px-2",
          )}
          onClick={() => setNotificationPanelOpen(true)}
          title={isCollapsed ? "Notifications" : undefined}
        >
          <div className="relative">
            <Bell className="h-5 w-5 shrink-0" />
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && "justify-center px-2",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 shrink-0" />
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

      <div className="border-t px-2 py-2">
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
        <div className="border-t px-2 py-2">
          <div className="space-y-3 p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Plan
                </p>
                {!isCollapsed && (
                  <p className="text-sm font-medium truncate">{tierInfo.name}</p>
                )}
              </div>
              {!isCollapsed && (
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    tierInfo.color === "gray" && "bg-muted-foreground",
                    tierInfo.color === "blue" && "bg-info",
                    tierInfo.color === "green" && "bg-success",
                    tierInfo.color === "purple" && "bg-primary",
                    tierInfo.color === "violet" && "bg-primary",
                    tierInfo.color === "orange" && "bg-warning",
                    tierInfo.color === "pink" && "bg-secondary",
                  )}
                />
              )}
            </div>
            <div className={cn("flex gap-2", isCollapsed && "flex-col items-center")}>
              <Button
                className="flex-1 gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                size="sm"
                asChild
              >
                <Link href="/upgrade">
                  <Sparkles className="h-3.5 w-3.5" />
                  {!isCollapsed && "Upgrade"}
                </Link>
              </Button>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="Customize sidebar"
                  onClick={() => setCustomizeOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <NotificationPanel
        open={notificationPanelOpen}
        onOpenChange={setNotificationPanelOpen}
      />

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
                className="flex items-center justify-between py-2 px-1"
              >
                <div className="flex items-center gap-3 text-sm">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
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

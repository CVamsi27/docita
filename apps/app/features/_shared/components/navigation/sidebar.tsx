"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Menu,
  PanelLeftClose,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
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
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  IPD_NAV_ITEM,
  FIXED_NAV_HREFS,
  type NavItem,
} from "./nav-config";

function getIconClasses(isActive: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-transparent",
    isActive
      ? "bg-primary/10 text-primary ring-primary/20"
      : "bg-muted/60 text-muted-foreground",
  );
}

function useScrollShadow(ref: React.RefObject<HTMLElement | null>) {
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowTopShadow(el.scrollTop > 4);
      setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);

  return { showTopShadow, showBottomShadow };
}

interface SidebarContentProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({
  isCollapsed,
  onCollapse,
  onExpand,
  onClose,
  isMobile = false,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const scrollRef = useRef<HTMLElement | null>(null);
  const { showTopShadow, showBottomShadow } = useScrollShadow(scrollRef);

  const isAdmin = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);
  const { canAccess, getTierInfo, clinicType: storeClinicType } =
    usePermissionStore();
  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_WHATSAPP,
    { role: user?.role, canAccessFeature: canAccess },
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

  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);
  const specialtyNavItems: NavItem[] = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || SPECIALTY_ICONS["Brain"]!,
    label: section.label,
    accessTarget: APP_ACCESS_TARGETS.PAGE_SPECIALTY,
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
        { role: user?.role, canAccessFeature: canAccess },
        "read",
      );
    }
    return !item.feature || canAccess(item.feature);
  });

  const canAccessSettings = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_SETTINGS,
    { role: user?.role, canAccessFeature: canAccess },
    "read",
  );

  const visibleNavItems = accessibleNavItems.filter(
    (item) => FIXED_NAV_HREFS.has(item.href) || !isHidden(item.href),
  );

  const customizableNavItems = accessibleNavItems.filter(
    (item) => !FIXED_NAV_HREFS.has(item.href),
  );

  const tierInfo = getTierInfo();
  const tierDotClass = cn(
    "h-2 w-2 rounded-full shrink-0",
    tierInfo.color === "blue" && "bg-info shadow-[0_0_8px_theme(colors.info)]",
    tierInfo.color === "green" &&
      "bg-success shadow-[0_0_8px_theme(colors.success)]",
    tierInfo.color === "purple" &&
      "bg-primary shadow-[0_0_8px_theme(colors.primary)]",
    tierInfo.color === "violet" &&
      "bg-primary shadow-[0_0_8px_theme(colors.primary)]",
    tierInfo.color === "orange" &&
      "bg-warning shadow-[0_0_8px_theme(colors.warning)]",
    tierInfo.color === "pink" &&
      "bg-secondary shadow-[0_0_8px_theme(colors.secondary)]",
    (tierInfo.color === "gray" || !tierInfo.color) && "bg-muted-foreground",
  );

  const showExpand = isCollapsed && !isMobile;
  const showLabels = !isCollapsed || isMobile;

  return (
    <>
      {/* Header */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border/60 px-3",
          isCollapsed && !isMobile ? "justify-center" : "justify-between",
        )}
      >
        {isCollapsed && !isMobile ? (
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <DocitaIcon />
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex h-9 items-center gap-2 rounded-lg px-1 hover:opacity-80 transition-opacity"
          >
            <DocitaLogo />
          </Link>
        )}

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : !isCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Scrollable nav */}
      <div className="relative flex-1 min-h-0">
        {showTopShadow && (
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 bg-gradient-to-b from-background to-transparent" />
        )}

        <nav
          ref={(el) => {
            scrollRef.current = el;
          }}
          className="h-full overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent"
        >
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && !isMobile && "justify-center px-0",
                )}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                <div className={getIconClasses(isActive)}>
                  <item.icon className="h-4 w-4 shrink-0" />
                </div>
                {showLabels && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {showBottomShadow && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/60">
        {/* Quick-access icons row */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-2",
            isCollapsed && !isMobile ? "flex-col items-center py-3" : "",
          )}
        >
          <ThemeToggle />
          {canAccessNotifications && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Notifications"
              onClick={() => setNotificationPanelOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          )}
          {canAccessSettings && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                pathname.startsWith("/settings") && "bg-primary/8 text-primary",
              )}
              title="Settings"
              asChild
            >
              <Link href="/settings">
                <Settings2 className="h-4 w-4" />
                {isAdmin && pendingJoinRequestCount > 0 && (
                  <span className="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Customize sidebar"
              onClick={() => setCustomizeOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Plan + Upgrade row */}
        {isAdmin && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 pb-3",
              isCollapsed && !isMobile ? "flex-col items-center" : "",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 min-w-0",
                isCollapsed && !isMobile ? "justify-center" : "flex-1",
              )}
            >
              <span className={tierDotClass} />
              {showLabels && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none">
                    Plan
                  </p>
                  <p className="text-sm font-medium truncate leading-tight mt-0.5">
                    {tierInfo.name}
                  </p>
                </div>
              )}
            </div>

            {canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
              role: user?.role,
              canAccessFeature: canAccess,
            }) && (
              <Button
                className={cn(
                  "shrink-0 gap-1.5",
                  isCollapsed && !isMobile
                    ? "h-8 w-8 rounded-lg border border-primary/30 bg-primary/10 p-0 text-primary hover:bg-primary/20"
                    : "h-8 px-3 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                )}
                size="sm"
                asChild
              >
                <Link href="/upgrade">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {showLabels && "Upgrade"}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expand tab — shown at right edge when collapsed (desktop only) */}
      {showExpand && (
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={onExpand}
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2 z-20",
            "flex h-10 w-6 items-center justify-center",
            "rounded-r-lg border border-l-0 border-border/60 bg-background",
            "text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Notification panel */}
      {canAccessNotifications && (
        <NotificationPanel
          open={notificationPanelOpen}
          onOpenChange={setNotificationPanelOpen}
          enabled={canAccessNotifications}
        />
      )}

      {/* Customize sheet */}
      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Customize Sidebar</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Toggle which items appear in the sidebar.
          </p>
          <div className="space-y-0.5">
            {customizableNavItems.map((item) => (
              <div
                key={item.href}
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 text-sm">
                  <div className={getIconClasses(false)}>
                    <item.icon className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="font-medium">{item.label}</span>
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
    </>
  );
}

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({
  isCollapsed = false,
  onCollapsedChange,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [pathname, onMobileOpenChange]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col h-full bg-background border-r border-border/60",
          "transition-[width] duration-200 ease-in-out overflow-visible",
          isCollapsed ? "w-16" : "w-full",
        )}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onCollapse={() => onCollapsedChange?.(true)}
          onExpand={() => onCollapsedChange?.(false)}
        />
      </aside>

      {/* Mobile sidebar — Sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col gap-0 md:hidden"
          aria-label="Navigation"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            isCollapsed={false}
            isMobile
            onCollapse={() => {}}
            onExpand={() => {}}
            onClose={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Trigger button rendered in the mobile header to open the sidebar */
export function SidebarMobileTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 md:hidden"
      onClick={onClick}
      aria-label="Open navigation"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

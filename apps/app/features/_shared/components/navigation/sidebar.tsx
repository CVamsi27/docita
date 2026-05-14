"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Menu,
  Settings2,
  SlidersHorizontal,
  X,
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
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  useUnreadNotificationCount,
  usePendingJoinRequestCount,
} from "@/hooks/api/use-notifications";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/app-config-context";
import { canAccessTarget } from "@/lib/access-policy";
import { canManageBilling } from "@/lib/permissions";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { APP_ACCESS_TARGETS, type ClinicType } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { CLINIC_ADMIN_ROLES } from "@/lib/permissions";
import { useClinic } from "@/lib/clinic-context";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import { NotificationPanel } from "./notification-panel";
import { NotificationBellWithBadges } from "./notification-bell-with-badges";
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { AskAiButton } from "@/features/_shared/components/ask-ai/ask-ai-button";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AI_ASSISTANT_NAV_ITEM,
  FIXED_NAV_HREFS,
  HELP_NAV_ITEM,
  IPD_NAV_ITEM,
  navSections,
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  type NavItem,
  type NavSection,
  type NavSectionId,
} from "./nav-config";

function getIconClasses(isActive: boolean, _collapsedRail?: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-colors",
    isActive
      ? "bg-foreground text-background ring-border/40"
      : "bg-background/60 text-muted-foreground ring-border/40",
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
  onExpand?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({
  isCollapsed,
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
  const {
    canAccess,
    canAccessTier,
    getTierInfo,
    clinicType: storeClinicType,
    workspaceProfile,
  } = usePermissionStore();
  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      canAccessTier,
      workspaceProfile,
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

  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);
  const specialtyNavItems: NavItem[] = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || SPECIALTY_ICONS["Brain"]!,
    label: section.label,
    accessTarget: APP_ACCESS_TARGETS.PAGE_SPECIALTY,
  }));

  const hospitalNavItems: NavItem[] =
    clinicType === "SPECIALTY" ? [IPD_NAV_ITEM] : [];

  function isItemAccessible(item: NavItem): boolean {
    if (item.accessTarget) {
      return canAccessTarget(
        item.accessTarget,
        {
          role: user?.role,
          canAccessFeature: canAccess,
          canAccessTier,
          workspaceProfile,
        },
        "read",
      );
    }
    return !item.feature || canAccess(item.feature);
  }

  const sectionsWithAccess: NavSection[] = navSections.map((section) => ({
    ...section,
    items: section.items.filter(isItemAccessible),
  }));

  const dynamicSection: NavSection | null =
    specialtyNavItems.length + hospitalNavItems.length > 0
      ? {
          id: "services",
          label: "Specialty",
          items: [...specialtyNavItems, ...hospitalNavItems].filter(
            isItemAccessible,
          ),
        }
      : null;

  const aiAssistantAccessible = isItemAccessible(AI_ASSISTANT_NAV_ITEM);

  const filterByPreferences = (items: NavItem[]) =>
    items.filter((item) => FIXED_NAV_HREFS.has(item.href) || !isHidden(item.href));

  const visibleSections = sectionsWithAccess.map((section) => ({
    ...section,
    items: filterByPreferences(section.items),
  }));

  const navOrder = useSidebarNavOrder({
    clinicId,
    userId: user?.id ?? null,
    canEditClinicDefault: isAdmin,
  });

  const orderedVisibleSections = navOrder.orderSections(visibleSections);

  const tierInfo = getTierInfo();
  const collapsedRail = isCollapsed && !isMobile;
  const canAccessSettings = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_SETTINGS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      canAccessTier,
      workspaceProfile,
    },
    "read",
  );
  const canOpenBillingSettings = !!user?.role && canManageBilling(user.role);
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

  const showLabels = !isCollapsed || isMobile;

  function renderNavLink(item: NavItem) {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const link = (
      <Link
        href={item.href}
        data-testid={`sidebar-link-${item.href.replace(/\//g, "-")}`}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-200",
          collapsedRail && "justify-center px-0 mx-auto w-11 max-w-[2.75rem]",
          isActive
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-foreground transition-all duration-200",
              collapsedRail ? "h-6" : "h-5",
            )}
          />
        )}
        <div className={getIconClasses(isActive, collapsedRail)}>
          <item.icon className="h-4 w-4 shrink-0" />
        </div>
        {showLabels && (
          <span className="flex-1 truncate transition-opacity duration-200">
            {item.label}
          </span>
        )}
      </Link>
    );

    return (
      <Fragment key={item.href}>
        {collapsedRail ? (
          <SymbolTooltip label={item.label} side="right">
            {link}
          </SymbolTooltip>
        ) : (
          link
        )}
      </Fragment>
    );
  }

  return (
    <>
      {/* Header */}
      {isCollapsed && !isMobile ? (
        <SymbolTooltip label="Expand sidebar" side="right">
          <button
            type="button"
            className="flex h-14 w-full shrink-0 items-center justify-center border-b border-border/60 hover:bg-muted/50 transition-colors"
            onClick={onExpand}
            aria-label="Expand sidebar"
          >
            <DocitaIcon />
          </button>
        </SymbolTooltip>
      ) : (
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3">
          <Link
            href="/today"
            className="flex h-9 items-center gap-2 rounded-lg px-1 transition-colors hover:opacity-80"
          >
            <DocitaLogo />
          </Link>
          {isMobile && (
            <SymbolTooltip label="Close sidebar" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}
        </div>
      )}

      {/* Scrollable nav */}
      <div className="relative flex-1 min-h-0">
        {showTopShadow && !isCollapsed && (
          <SymbolTooltip label="Scroll up">
            <button
              type="button"
              aria-label="Scroll up"
              className="group absolute top-0 left-0 right-0 z-10 flex h-8 cursor-pointer items-start justify-center pt-1"
              style={{
                background:
                  "linear-gradient(to bottom, hsl(var(--background)) 20%, transparent)",
              }}
              onClick={() =>
                scrollRef.current?.scrollBy({ top: -120, behavior: "smooth" })
              }
            >
              <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
            </button>
          </SymbolTooltip>
        )}

        <nav
          ref={(el) => {
            scrollRef.current = el;
          }}
          className={cn(
            "h-full overflow-y-auto overflow-x-hidden py-3 scrollbar-none",
            isCollapsed && !isMobile ? "px-1 space-y-1" : "px-2 space-y-4",
          )}
          aria-label="Primary"
        >
          {orderedVisibleSections.map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.id} className="space-y-0.5">
                {showLabels ? (
                  <MicroLabel className="px-2.5 pb-1.5 pt-1">
                    {section.label}
                  </MicroLabel>
                ) : (
                  <div
                    aria-hidden
                    className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
                  />
                )}
                {section.items.map((item) => renderNavLink(item))}
              </div>
            );
          })}

          {dynamicSection && dynamicSection.items.length > 0 ? (
            <div className="space-y-0.5">
              {showLabels ? (
                <MicroLabel className="px-2.5 pb-1.5 pt-1">
                  {dynamicSection.label}
                </MicroLabel>
              ) : (
                <div
                  aria-hidden
                  className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
                />
              )}
              {dynamicSection.items.map((item) => renderNavLink(item))}
            </div>
          ) : null}

          {aiAssistantAccessible ? (
            <div className="space-y-0.5">
              {showLabels ? (
                <MicroLabel className="px-2.5 pb-1.5 pt-1">
                  Assistant
                </MicroLabel>
              ) : (
                <div
                  aria-hidden
                  className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
                />
              )}
              {renderNavLink(AI_ASSISTANT_NAV_ITEM)}
            </div>
          ) : null}
        </nav>

        {showBottomShadow && !isCollapsed && (
          <SymbolTooltip label="Scroll down">
            <button
              type="button"
              aria-label="Scroll down"
              className="group absolute bottom-0 left-0 right-0 z-10 flex h-10 cursor-pointer items-end justify-center pb-1.5"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--background)) 40%, transparent)",
              }}
              onClick={() =>
                scrollRef.current?.scrollBy({ top: 120, behavior: "smooth" })
              }
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
            </button>
          </SymbolTooltip>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/70">
        {/* Quick-access icons row */}
        <TooltipProvider>
          <div
            className={cn(
              "flex items-center justify-between gap-1 py-2",
              isCollapsed && !isMobile
                ? "flex-col items-center justify-center px-1 py-3"
                : "px-2",
            )}
          >
            <ThemeToggleWithAppearanceSync />

            {canAccessNotifications && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 shrink-0 overflow-visible text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setNotificationPanelOpen(true)}
                    aria-label={
                      notificationCount > 0
                        ? `Notifications, ${notificationCount} unread`
                        : "Notifications"
                    }
                  >
                    <NotificationBellWithBadges count={notificationCount} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Notifications</TooltipContent>
              </Tooltip>
            )}

            {canAccessSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "relative h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                      pathname.startsWith("/settings") &&
                        "bg-primary/8 text-primary",
                    )}
                    asChild
                  >
                    <Link href="/settings" aria-label="Settings">
                      <Settings2 className="h-4 w-4" />
                      {isAdmin && pendingJoinRequestCount > 0 && (
                        <span className="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                    pathname.startsWith(HELP_NAV_ITEM.href) &&
                      "bg-primary/8 text-primary",
                  )}
                  asChild
                >
                  <Link href={HELP_NAV_ITEM.href} aria-label="Help">
                    <HelpCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Help</TooltipContent>
            </Tooltip>

            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setCustomizeOpen(true)}
                    aria-label="Customize sidebar"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Customize sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {/* Plan row */}
        {isAdmin && (
          <div
            className={cn(
              "pb-2",
              collapsedRail ? "flex flex-col items-center px-1" : "px-3",
            )}
          >
            {canOpenBillingSettings ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={SUBSCRIPTION_SETTINGS_PATH}
                    className={cn(
                      "flex items-center justify-center gap-2 min-w-0 rounded-xl px-1 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      collapsedRail &&
                        "size-11 flex-col justify-center p-0 hover:bg-muted/60",
                      !collapsedRail && "w-full",
                    )}
                    aria-label={`Billing and subscription, ${tierInfo.name}`}
                  >
                    <span className={tierDotClass} />
                    {showLabels && (
                      <div className="min-w-0 flex items-center gap-2">
                        <MicroLabel className="leading-none">Plan</MicroLabel>
                        <Badge variant="default">{tierInfo.name}</Badge>
                      </div>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Billing and subscription
                </TooltipContent>
              </Tooltip>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-2 min-w-0",
                  collapsedRail ? "flex-col justify-center" : "",
                )}
              >
                <span className={tierDotClass} />
                {showLabels && (
                  <div className="min-w-0">
                    <MicroLabel className="leading-none">Plan</MicroLabel>
                    <p className="text-sm font-medium truncate leading-tight mt-0.5">
                      {tierInfo.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pinned Ask AI */}
        <div
          className={cn(
            "border-t border-border/60 pt-3 pb-3",
            collapsedRail ? "px-1 flex justify-center" : "px-3",
          )}
        >
          <AskAiButton collapsed={collapsedRail} />
        </div>
      </div>

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
        <SheetContent side="left" className="sm:w-72">
          <SheetHeader>
            <SheetTitle>Customize Sidebar</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Drag to reorder items. Toggle to hide items you do not use.
          </p>
          <CustomizeSidebarOrderUI
            sections={sectionsWithAccess}
            isHidden={isHidden}
            toggleItem={toggleItem}
            getIconClasses={getIconClasses}
            navOrder={navOrder}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function CustomizeSidebarOrderUI({
  sections,
  isHidden,
  toggleItem,
  getIconClasses,
  navOrder,
}: {
  sections: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  getIconClasses: (isActive: boolean, collapsedRail?: boolean) => string;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}) {
  const [dragging, setDragging] = useState<{ sectionId: NavSectionId; href: string } | null>(
    null,
  );

  const ordered = useMemo(() => navOrder.orderSections(sections), [navOrder, sections]);

  const setSectionOrder = useCallback(
    (sectionId: NavSectionId, hrefs: string[], scope: "clinic" | "user") => {
      navOrder.setOrder(
        {
          ...navOrder.effectiveOrder,
          [sectionId]: hrefs,
        },
        scope,
      );
    },
    [navOrder],
  );

  const handleDrop = useCallback(
    (args: { sectionId: NavSectionId; beforeHref: string | null; scope: "clinic" | "user" }) => {
      if (!dragging) return;
      if (dragging.sectionId !== args.sectionId) return;

      const current = navOrder.effectiveOrder[args.sectionId];
      const without = current.filter((h) => h !== dragging.href);
      const idx = args.beforeHref ? without.indexOf(args.beforeHref) : -1;
      const next =
        idx >= 0 ? [...without.slice(0, idx), dragging.href, ...without.slice(idx)] : [...without, dragging.href];
      setSectionOrder(args.sectionId, next, args.scope);
      setDragging(null);
    },
    [dragging, navOrder.effectiveOrder, setSectionOrder],
  );

  const canEditClinicDefault = navOrder.canEditClinicDefault;

  return (
    <div className="space-y-4">
      {navOrder.hasUserOverride ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={navOrder.clearUserOverride}
        >
          Reset my order to clinic default
        </button>
      ) : null}

      {ordered.map((section) => (
        <div key={section.id} className="space-y-2">
          <MicroLabel>{section.label}</MicroLabel>

          <div
            className="space-y-0.5"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => handleDrop({ sectionId: section.id, beforeHref: null, scope: "user" })}
          >
            {section.items.map((item) => {
              const fixed = FIXED_NAV_HREFS.has(item.href);
              return (
                <div
                  key={item.href}
                  draggable
                  onDragStart={() => setDragging({ sectionId: section.id, href: item.href })}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop({
                      sectionId: section.id,
                      beforeHref: item.href,
                      scope: "user",
                    });
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-2 transition-colors",
                    "hover:bg-muted",
                    dragging?.href === item.href && "bg-muted/70",
                  )}
                  aria-label={`Reorder ${item.label}`}
                  title="Drag to reorder"
                >
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <div className={getIconClasses(false, false)}>
                      <item.icon className="h-4 w-4 shrink-0" />
                    </div>
                    <span className="font-medium truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!fixed ? (
                      <Switch
                        checked={!isHidden(item.href)}
                        onCheckedChange={() => toggleItem(item.href)}
                        aria-label={`Show ${item.label} in sidebar`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Fixed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {canEditClinicDefault ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => {
                // Save current effective order as clinic default.
                navOrder.setOrder(navOrder.effectiveOrder, "clinic");
              }}
            >
              Save this order as clinic default
            </button>
          ) : null}
        </div>
      ))}
    </div>
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

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [pathname, onMobileOpenChange]);

  return (
    <>
      <aside
        className="relative hidden md:flex flex-col h-full w-full bg-background/70 backdrop-blur border-r border-border/70"
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onExpand={() => onCollapsedChange?.(false)}
        />
      </aside>

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
            onClose={() => onMobileOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarMobileTrigger({ onClick }: { onClick: () => void }) {
  return (
    <SymbolTooltip label="Open navigation" side="bottom">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden"
        onClick={onClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </SymbolTooltip>
  );
}

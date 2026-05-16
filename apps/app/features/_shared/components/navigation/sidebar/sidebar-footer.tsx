"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  Settings2,
  SlidersHorizontal,
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
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { NotificationPanel } from "@/features/_shared/components/navigation/notification-panel";
import { NotificationBellWithBadges } from "@/features/_shared/components/navigation/notification-bell-with-badges";
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { AskAiButton } from "@/features/_shared/components/ask-ai/ask-ai-button";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";
import {
  FIXED_NAV_HREFS,
  HELP_NAV_ITEM,
  type NavSection,
  type NavSectionId,
} from "@/features/_shared/components/navigation/nav-config";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";

function getIconClasses(isActive: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-colors",
    isActive
      ? "bg-foreground text-background ring-border/40"
      : "bg-background/60 text-muted-foreground ring-border/40",
  );
}

// ─── Customize sheet ──────────────────────────────────────────────────────────

function CustomizeSidebarOrderUI({
  sections,
  isHidden,
  toggleItem,
  navOrder,
}: {
  sections: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}) {
  const [dragging, setDragging] = useState<{
    sectionId: NavSectionId;
    href: string;
  } | null>(null);

  const ordered = useMemo(
    () => navOrder.orderSections(sections),
    [navOrder, sections],
  );

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
    (args: {
      sectionId: NavSectionId;
      beforeHref: string | null;
      scope: "clinic" | "user";
    }) => {
      if (!dragging) return;
      if (dragging.sectionId !== args.sectionId) return;

      const current = navOrder.effectiveOrder[args.sectionId];
      const without = current.filter((h) => h !== dragging.href);
      const idx = args.beforeHref ? without.indexOf(args.beforeHref) : -1;
      const next =
        idx >= 0
          ? [...without.slice(0, idx), dragging.href, ...without.slice(idx)]
          : [...without, dragging.href];
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
            onDrop={() =>
              handleDrop({
                sectionId: section.id,
                beforeHref: null,
                scope: "user",
              })
            }
          >
            {section.items.map((item) => {
              const fixed = FIXED_NAV_HREFS.has(item.href);
              return (
                <div
                  key={item.href}
                  draggable
                  onDragStart={() =>
                    setDragging({ sectionId: section.id, href: item.href })
                  }
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
                    <div className={getIconClasses(false)}>
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
                      <span className="text-xs text-muted-foreground">
                        Fixed
                      </span>
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

// ─── Tier dot ─────────────────────────────────────────────────────────────────

function TierDot({ color }: { color?: string }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full shrink-0",
        color === "blue" && "bg-info shadow-[0_0_8px_theme(colors.info)]",
        color === "green" &&
          "bg-success shadow-[0_0_8px_theme(colors.success)]",
        color === "purple" &&
          "bg-primary shadow-[0_0_8px_theme(colors.primary)]",
        color === "violet" &&
          "bg-primary shadow-[0_0_8px_theme(colors.primary)]",
        color === "orange" &&
          "bg-warning shadow-[0_0_8px_theme(colors.warning)]",
        color === "pink" &&
          "bg-secondary shadow-[0_0_8px_theme(colors.secondary)]",
        (!color || color === "gray") && "bg-muted-foreground",
      )}
    />
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface SidebarFooterProps {
  collapsedRail: boolean;
  showLabels: boolean;
  isAdmin: boolean;
  canAccessNotifications: boolean;
  canAccessSettings: boolean;
  canOpenBillingSettings: boolean;
  notificationCount: number;
  pendingJoinRequestCount: number;
  tierInfo: { name: string; color?: string };
  sectionsWithAccess: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}

export function SidebarFooter({
  collapsedRail,
  showLabels,
  isAdmin,
  canAccessNotifications,
  canAccessSettings,
  canOpenBillingSettings,
  notificationCount,
  pendingJoinRequestCount,
  tierInfo,
  sectionsWithAccess,
  isHidden,
  toggleItem,
  navOrder,
}: SidebarFooterProps) {
  const pathname = usePathname();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <div className="shrink-0 border-t border-border/70">
      {/* Quick-access icons row */}
      <TooltipProvider>
        <div
          className={cn(
            "flex items-center justify-between gap-1 py-2",
            collapsedRail
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
                  <TierDot color={tierInfo.color} />
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
              <TierDot color={tierInfo.color} />
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
            navOrder={navOrder}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

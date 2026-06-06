"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Settings2, SlidersHorizontal } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { SidebarRailAction } from "@workspace/ui/components/navigation/sidebar-rail-action";
import { SidebarRailTooltip } from "@workspace/ui/components/navigation/sidebar-rail-tooltip";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { NotificationBellWithBadges } from "@/components/navigation/notification-bell-with-badges";
import { ThemeToggleWithAppearanceSync } from "@/components/layout/theme-toggle-with-appearance-sync";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";
import { HELP_NAV_ITEM } from "@/components/navigation/nav-config";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

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

export function QuickAccessIcons({
  collapsedRail,
  isAdmin,
  canAccessNotifications,
  canAccessSettings,
  pendingJoinRequestCount,
  notificationCount,
  onOpenNotifications,
  onOpenCustomize,
}: {
  collapsedRail: boolean;
  isAdmin: boolean;
  canAccessNotifications: boolean;
  canAccessSettings: boolean;
  pendingJoinRequestCount: number;
  notificationCount: number;
  onOpenNotifications: () => void;
  onOpenCustomize: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 py-2",
        collapsedRail
          ? "flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5"
          : "px-2",
      )}
    >
      <ThemeToggleWithAppearanceSync />

      {isAdmin && (
        <SidebarRailAction label="Customize sidebar">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onOpenCustomize}
            aria-label="Customize sidebar"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </SidebarRailAction>
      )}

      {canAccessNotifications && (
        <SidebarRailAction label="Notifications">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 shrink-0 overflow-visible text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onOpenNotifications}
            aria-label={
              notificationCount > 0
                ? `Notifications, ${notificationCount} unread`
                : "Notifications"
            }
          >
            <NotificationBellWithBadges count={notificationCount} />
          </Button>
        </SidebarRailAction>
      )}

      {canAccessSettings && (
        <SidebarRailAction label="Settings">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground",
              pathname.startsWith("/settings") && "bg-primary/8 text-primary",
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
        </SidebarRailAction>
      )}

      <SidebarRailAction label="Help">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname.startsWith(HELP_NAV_ITEM.href) &&
              "bg-primary/8 text-primary",
          )}
          asChild
        >
          <Link href={HELP_NAV_ITEM.href} aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </Link>
        </Button>
      </SidebarRailAction>
    </div>
  );
}

export function PlanRowSection({
  collapsedRail,
  showLabels,
  isAdmin,
  canOpenBillingSettings,
  tierInfo,
}: {
  collapsedRail: boolean;
  showLabels: boolean;
  isAdmin: boolean;
  canOpenBillingSettings: boolean;
  tierInfo: { name: string; color?: string };
}) {
  if (!isAdmin) return null;
  return (
    <div
      className={cn(
        "pb-2",
        collapsedRail ? "flex flex-col items-center px-1 pb-1.5" : "px-3",
      )}
    >
      {canOpenBillingSettings ? (
        collapsedRail ? (
          <SidebarRailTooltip label="Billing and subscription">
            <Link
              href={SUBSCRIPTION_SETTINGS_PATH}
              className="flex size-9 flex-col items-center justify-center rounded-xl p-0 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label={`Billing and subscription, ${tierInfo.name}`}
            >
              <TierDot color={tierInfo.color} />
            </Link>
          </SidebarRailTooltip>
        ) : (
          <Link
            href={SUBSCRIPTION_SETTINGS_PATH}
            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={`Billing and subscription, ${tierInfo.name}`}
          >
            <TierDot color={tierInfo.color} />
            <div className="flex min-w-0 items-center gap-2">
              <MicroLabel className="leading-none">Plan</MicroLabel>
              <Badge variant="default">{tierInfo.name}</Badge>
            </div>
          </Link>
        )
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
  );
}

export function AskAiSection({ collapsedRail }: { collapsedRail: boolean }) {
  return (
    <div
      className={cn(
        "border-t border-border/60",
        collapsedRail
          ? "flex justify-center px-1 pt-2 pb-2.5"
          : "px-3 pt-3 pb-3",
      )}
    >
      <AskAiButton collapsed={collapsedRail} />
    </div>
  );
}

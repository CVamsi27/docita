"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  Moon,
  MoreHorizontal,
  Settings2,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@workspace/ui/lib/utils";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MicroLabel,
  SidebarRailAction,
  SidebarRailTooltip
} from "@workspace/ui/components";
import { NotificationBellWithBadges } from "@/components/navigation/notification-bell-with-badges";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";
import { HELP_NAV_ITEM } from "@/components/navigation/nav-config";
import { useAppearanceStore } from "@/lib/stores/appearance-store";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";

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

type MoreMenuProps = {
  isAdmin: boolean;
  canAccessSettings: boolean;
  pendingJoinRequestCount: number;
  onOpenCustomize: () => void;
};

function MoreMenuContent({
  isAdmin,
  canAccessSettings,
  pendingJoinRequestCount,
  onOpenCustomize,
}: MoreMenuProps) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const { resolvedTheme, setTheme } = useTheme();
  const setAppearanceTheme = useAppearanceStore((s) => s.setTheme);
  const isDark = resolvedTheme === "dark";
  const ThemeIcon = isDark ? Moon : Sun;
  const nextTheme = isDark ? "light" : "dark";

  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          setTheme(nextTheme);
          setAppearanceTheme(nextTheme);
        }}
      >
        <ThemeIcon className="mr-2 h-4 w-4" />
        {isDark ? "Light mode" : "Dark mode"}
      </DropdownMenuItem>

      {isAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenCustomize}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Customize sidebar
          </DropdownMenuItem>
        </>
      )}

      {canAccessSettings && (
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings2 className="mr-2 h-4 w-4" />
            {t("settings")}
            {isAdmin && pendingJoinRequestCount > 0 && (
              <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
            )}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link
          href={HELP_NAV_ITEM.href}
          className={cn(
            "flex items-center",
            pathname.startsWith(HELP_NAV_ITEM.href) && "text-primary",
          )}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          {t("help")}
        </Link>
      </DropdownMenuItem>
    </>
  );
}

function MoreMenuButton({
  props,
  tooltipSide,
  tooltipAlign,
}: {
  props: MoreMenuProps;
  tooltipSide: "top" | "right";
  tooltipAlign: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <SidebarRailTooltip label="More actions" side={tooltipSide}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
      </SidebarRailTooltip>
      <DropdownMenuContent side={tooltipSide} align={tooltipAlign} className="w-48">
        <MoreMenuContent {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
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

  /** Collapsed rail — keep only the notification bell and a "more" overflow menu
   * to minimise the vertical footprint of the narrow icon strip. */
  if (collapsedRail) {
    return (
      <div className="flex flex-col items-center gap-1 px-1 pt-2 pb-1.5">
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
        <MoreMenuButton
          props={{
            isAdmin,
            canAccessSettings,
            pendingJoinRequestCount,
            onOpenCustomize,
          }}
          tooltipSide="right"
          tooltipAlign="end"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1.5 px-2 py-2">
      <MoreMenuButton
        props={{
          isAdmin,
          canAccessSettings,
          pendingJoinRequestCount,
          onOpenCustomize,
        }}
        tooltipSide="top"
        tooltipAlign="start"
      />

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

/**
 * Phase 6.4: language toggle in the sidebar footer. Pairs with the
 * theme toggle (which lives inside the MoreMenu overflow) so users
 * get both controls in the same scrollable footer.
 */
export function LanguageSection() {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="text-sm font-medium text-muted-foreground">
        Language
      </span>
      <LocaleSwitcher />
    </div>
  );
}

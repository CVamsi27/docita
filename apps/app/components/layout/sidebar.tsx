"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Crown,
  LogOut,
  Moon,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  Sun,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/lib/auth-context";
import { Tier, usePermissionStore } from "@/lib/stores/permission-store";
import { SidebarItem, sidebarItems } from "@/lib/constants";
import { FeedbackFormDialogDynamic } from "@/lib/dynamic-imports";

export function Sidebar({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { canAccess, currentTier, getTierInfo } = usePermissionStore();
  const { theme, setTheme } = useTheme();
  const [showFeedback, setShowFeedback] = useState(false);

  const tierInfo = getTierInfo();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Filter items by role and only show accessible features (hide locked ones completely)
  const filteredItems = sidebarItems.filter(
    (item) =>
      user &&
      item.roles.includes(user.role) &&
      (item.feature ? canAccess(item.feature) : true),
  );

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out z-10",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-6 transition-all duration-300",
          isCollapsed ? "justify-center px-2" : "justify-between",
        )}
      >
        <div className="flex items-center overflow-hidden whitespace-nowrap">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "ml-3 text-lg font-bold tracking-tight text-sidebar-foreground transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            Docita
          </span>
        </div>
      </div>

      {/* Tier Badge */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <Link
            href="/upgrade"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
              "bg-sidebar-accent/50 hover:bg-sidebar-accent",
            )}
          >
            {currentTier === Tier.INTELLIGENCE ? (
              <Sparkles className="h-4 w-4 text-pink-500" />
            ) : (
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  tierInfo.color === "gray" && "bg-gray-500",
                  tierInfo.color === "blue" && "bg-blue-500",
                  tierInfo.color === "green" && "bg-green-500",
                  tierInfo.color === "purple" && "bg-purple-500",
                  tierInfo.color === "orange" && "bg-orange-500",
                  tierInfo.color === "pink" && "bg-pink-500",
                )}
              />
            )}
            <span className="text-xs font-medium text-sidebar-foreground flex-1">
              {tierInfo.name}
            </span>
            <Crown className="h-3.5 w-3.5 text-amber-500" />
          </Link>
        </div>
      )}

      {/* Search Trigger */}
      <div
        className={cn("px-3 py-2", isCollapsed ? "flex justify-center" : "")}
      >
        <Button
          variant="outline"
          className={cn(
            "relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-full",
            isCollapsed && "h-9 w-9 justify-center px-0",
          )}
          onClick={() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="ml-2 inline-flex">Search...</span>
              <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="grid gap-2 px-3">
          {filteredItems.map((item, index) => (
            <NavItem
              key={index}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isCollapsed}
              onClick={
                item.href === "#feedback"
                  ? () => setShowFeedback(true)
                  : undefined
              }
            />
          ))}
        </nav>
      </div>

      <FeedbackFormDialogDynamic
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar">
        <Link
          href="/profile"
          title={isCollapsed ? "Profile" : undefined}
          onMouseEnter={() => router.prefetch("/profile")}
          className={cn(
            "mb-4 flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-sm hover:bg-sidebar-accent transition-colors",
            isCollapsed &&
              "justify-center border-0 bg-transparent p-0 shadow-none hover:bg-transparent",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
            <span className="text-sm font-bold">
              {user?.name?.charAt(0) || "D"}
            </span>
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || "Doctor"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {user?.email || "admin@docita.com"}
            </p>
          </div>
        </Link>

        <div className="grid gap-1">
          <button
            onClick={toggleTheme}
            title={isCollapsed ? "Toggle theme" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center",
            )}
          >
            <div className="relative h-5 w-5 shrink-0">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
              <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            </div>
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
              )}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          <Link
            href="/settings"
            title={isCollapsed ? "Settings" : undefined}
            onMouseEnter={() => router.prefetch("/settings")}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/settings" &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
              isCollapsed && "justify-center",
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
              )}
            >
              Settings
            </span>
          </Link>

          <Button
            variant="ghost"
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              isCollapsed && "justify-center px-0",
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
              )}
            >
              Logout
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

function NavItem({ item, isActive, isCollapsed, onClick }: NavItemProps) {
  const router = useRouter();

  // ✅ OPTIMIZATION: Prefetch route on hover for instant navigation
  const handleMouseEnter = () => {
    if (!onClick && !item.href.startsWith("#")) {
      router.prefetch(item.href);
    }
  };

  if (onClick || item.href.startsWith("#")) {
    return (
      <button
        onClick={onClick}
        title={isCollapsed ? item.title : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isCollapsed && "justify-center px-2",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-transform duration-200",
            !isActive && "group-hover:scale-110",
          )}
        />
        <span
          className={cn(
            "whitespace-nowrap transition-all duration-300 overflow-hidden flex-1 text-left",
            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
          )}
        >
          {item.title}
        </span>
        {item.badge && !isCollapsed && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-pink-500/20 text-pink-500">
            {item.badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.title : undefined}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed && "justify-center px-2",
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 shrink-0 transition-transform duration-200",
          !isActive && "group-hover:scale-110",
        )}
      />
      <span
        className={cn(
          "whitespace-nowrap transition-all duration-300 overflow-hidden flex-1",
          isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
        )}
      >
        {item.title}
      </span>
      {item.badge && !isCollapsed && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-pink-500/20 text-pink-500">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

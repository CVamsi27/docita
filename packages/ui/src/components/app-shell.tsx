import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface AppShellProps {
  sidebar?: React.ReactNode;
  topBar?: React.ReactNode;
  children: React.ReactNode;
  overlays?: React.ReactNode;
  className?: string;
  mainClassName?: string;
  sidebarWidth?: string;
}

export function AppShell({
  sidebar,
  topBar,
  children,
  overlays,
  className,
  mainClassName,
  sidebarWidth = "16rem",
}: AppShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[100dvh] w-full bg-background text-foreground",
        className,
      )}
      style={{ ["--app-sidebar-width" as never]: sidebarWidth }}
    >
      {sidebar ? (
        <aside
          data-app-shell-sidebar=""
          className="hidden shrink-0 md:block"
          style={{ width: "var(--app-sidebar-width)" }}
        >
          {sidebar}
        </aside>
      ) : null}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        {topBar ? (
          <div
            data-app-shell-topbar=""
            className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
          >
            {topBar}
          </div>
        ) : null}
        <main
          data-app-shell-main=""
          className={cn("min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8", mainClassName)}
        >
          {children}
        </main>
      </div>
      {overlays}
    </div>
  );
}

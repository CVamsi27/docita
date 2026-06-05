"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/overlay/sheet";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { SidebarContent } from "./sidebar-sections";

// ─── Public API ───────────────────────────────────────────────────────────────

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
      <aside className="relative hidden md:flex flex-col h-full w-full bg-background/70 backdrop-blur border-r border-border/70">
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

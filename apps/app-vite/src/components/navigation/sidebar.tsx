import { Link, useLocation } from "react-router";
import { useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SymbolTooltip } from "@workspace/ui/components";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { navSections } from "@/components/navigation/nav-config";
import { SidebarTrackSection } from "@/components/navigation/sidebar-sections";

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ isCollapsed: _isCollapsed = false, mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const location = useLocation();

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  const nav = (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none px-2 space-y-4" aria-label="Primary">
      <SidebarTrackSection sections={navSections} collapsedRail={false} showLabels />
    </nav>
  );

  return (
    <>
      <aside className="relative hidden md:flex flex-col h-full w-full bg-background/70 backdrop-blur border-r border-border/70">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3">
          <Link to="/today" className="flex h-9 items-center gap-2 rounded-lg px-1 transition-colors hover:opacity-80" aria-label="Docita home">
            <DocitaLogo />
          </Link>
        </div>
        {nav}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col gap-0 md:hidden" aria-label="Navigation">
          <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3">
            <Link to="/today" className="flex h-9 items-center gap-2 rounded-lg px-1" aria-label="Docita home"><DocitaLogo /></Link>
            <SymbolTooltip label="Close sidebar" side="bottom">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onMobileOpenChange?.(false)} aria-label="Close sidebar"><X className="h-4 w-4" /></Button>
            </SymbolTooltip>
          </div>
          {nav}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarMobileTrigger({ onClick }: { onClick: () => void }) {
  return (
    <SymbolTooltip label="Open navigation" side="bottom">
      <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={onClick} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>
    </SymbolTooltip>
  );
}

import { Link, useLocation } from "react-router";
import { useEffect } from "react";
import { HelpCircle, Menu, Settings, X } from "lucide-react";
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SymbolTooltip } from "@workspace/ui/components";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { navSections } from "@/components/navigation/nav-config";
import { SidebarTrackSection } from "@/components/navigation/sidebar-sections";
import { ThemeToggleWithAppearanceSync } from "@/components/layout/theme-toggle-with-appearance-sync";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";

function SidebarFooterLink({ to, icon: Icon, label, external }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }) {
  const content = (
    <span className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/60 ring-1 ring-border/40">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{label}</span>
    </span>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" aria-label={label}>
        {content}
      </a>
    );
  }

  return (
    <Link to={to} aria-label={label}>
      {content}
    </Link>
  );
}

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

  const sidebarFooter = (
    <div className="shrink-0 border-t border-border/60 px-2 py-2 space-y-0.5">
      <SidebarFooterLink to="/settings" icon={Settings} label="Settings" />
      <SidebarFooterLink to="https://docs.docita.work" icon={HelpCircle} label="Help" external />
      <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground">
        <ThemeToggleWithAppearanceSync className="h-4 w-4" />
        <span className="flex-1 truncate">Theme</span>
      </div>
      <AskAiButton />
    </div>
  );

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
        {sidebarFooter}
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

import { Link, useLocation } from "react-router";
import { useEffect } from "react";
import { HelpCircle, Menu, Settings, X } from "lucide-react";
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SymbolTooltip } from "@workspace/ui/components";
import { SidebarNavItem } from "@workspace/ui/components/navigation/sidebar-nav-item";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { navSections } from "@/components/navigation/nav-config";
import { SidebarTrackSection } from "@/components/navigation/sidebar-sections";
import { ThemeToggleWithAppearanceSync } from "@/components/layout/theme-toggle-with-appearance-sync";
import { AskAiButton } from "@/components/ask-ai/ask-ai-button";

function SidebarFooterLink({ to, icon, label, external, collapsedRail = false }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean; collapsedRail?: boolean }) {
  return (
    <SidebarNavItem
      label={label}
      icon={icon}
      isActive={false}
      collapsedRail={collapsedRail}
      showLabels={!collapsedRail}
      renderLink={({ className, children }) => external ? (
        <a href={to} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>{children}</a>
      ) : (
        <Link to={to} className={className} aria-label={label}>{children}</Link>
      )}
    />
  );
}

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ isCollapsed = false, mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const location = useLocation();

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  // Shared between the desktop rail and the mobile sheet so phone users can
  // reach Settings / Help / Theme / Ask AI at all — the sheet previously
  // rendered navigation only, leaving those controls unreachable below `md`.
  const renderSidebarFooter = (onAction?: () => void, collapsedRail = false) => (
    <div className={`shrink-0 border-t border-border/60 py-2 space-y-0.5 ${collapsedRail ? "px-0" : "px-2"}`}>
      <SidebarFooterLink to="/settings" icon={Settings} label="Settings" collapsedRail={collapsedRail} />
      <SidebarFooterLink to="https://docs.docita.work" icon={HelpCircle} label="Help" external collapsedRail={collapsedRail} />
      <div className={`flex items-center gap-3 rounded-xl py-2 text-sm font-medium text-muted-foreground ${collapsedRail ? "justify-center px-0" : "px-2.5"}`}>
        <ThemeToggleWithAppearanceSync className={collapsedRail ? "h-9 w-9" : "h-4 w-4"} />
        {!collapsedRail && <span className="flex-1 truncate">Theme</span>}
      </div>
      <AskAiButton onOpen={onAction} compact={collapsedRail} />
    </div>
  );

  const renderNav = (collapsedRail = false) => (
    <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none space-y-4 ${collapsedRail ? "px-0" : "px-2"}`} aria-label="Primary">
      <SidebarTrackSection sections={navSections} collapsedRail={collapsedRail} showLabels={!collapsedRail} />
    </nav>
  );

  return (
    <>
      <aside className="relative hidden lg:flex flex-col h-full w-full bg-background/70 backdrop-blur border-r border-border/70">
        <div className={`flex h-14 shrink-0 items-center border-b border-border/60 ${isCollapsed ? "justify-center px-0" : "justify-between px-3"}`}>
          <Link to="/today" className="flex h-9 items-center gap-2 rounded-lg px-1 transition-colors hover:opacity-80" aria-label="Docita home">
            <DocitaLogo showText={!isCollapsed} />
          </Link>
        </div>
        {renderNav(isCollapsed)}
        {renderSidebarFooter(undefined, isCollapsed)}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col gap-0 lg:hidden" aria-label="Navigation">
          <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3">
            <Link to="/today" className="flex h-9 items-center gap-2 rounded-lg px-1" aria-label="Docita home"><DocitaLogo /></Link>
            <SymbolTooltip label="Close sidebar" side="bottom">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onMobileOpenChange?.(false)} aria-label="Close sidebar"><X className="h-4 w-4" /></Button>
            </SymbolTooltip>
          </div>
          {renderNav()}
          {renderSidebarFooter(() => onMobileOpenChange?.(false))}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarMobileTrigger({ onClick }: { onClick: () => void }) {
  return (
    <SymbolTooltip label="Open navigation" side="bottom">
      <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={onClick} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>
    </SymbolTooltip>
  );
}

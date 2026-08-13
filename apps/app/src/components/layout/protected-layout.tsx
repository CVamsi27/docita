import { useState, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar, SidebarMobileTrigger } from "@/components/navigation/sidebar";
import { useCanGoBack } from "@/hooks/use-can-go-back";
import { DesktopTopBar } from "@/components/layout/desktop-top-bar";
import { TopBarActions } from "@/components/layout/top-bar-actions";
import { openCommandPaletteFromUi } from "@/components/layout/command-palette-launcher";
import { Button, ResizableHandle, ResizablePanel, ResizablePanelGroup, SymbolTooltip } from "@workspace/ui/components";
import type { ImperativePanelHandle } from "@workspace/ui/components/layout/resizable";
import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { ChevronLeft, ChevronRight, Command } from "lucide-react";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { useProtectedWorkspaceAccess, useSidebarAutoCollapse } from "@/components/layout/use-workspace-access";
import { WorkspaceLoadingSkeleton } from "@/components/layout/workspace-loading-skeleton";
import { BackButton } from "@/components/navigation/back-button";
import { CommandPalette } from "@/components/navigation/command-palette";
import { AskAiOverlay } from "@/components/ask-ai/ask-ai-overlay";
import { FloatingStartConsultation } from "@/components/consultation/floating-start-consultation";
import { ProvidersWrapper } from "./providers-wrapper";

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const pathname = location.pathname;
  const canGoBack = useCanGoBack();
  const isConsultationDetailRoute = /^\/consultation\/[^/]+/.test(pathname);

  return (
    <header className="flex h-[var(--app-mobile-header-height)] items-center gap-1 border-b bg-background px-2 pt-[env(safe-area-inset-top,0px)] md:hidden" aria-label="Mobile navigation" data-testid="mobile-header">
      <SidebarMobileTrigger onClick={onMenuClick} />
      {isConsultationDetailRoute ? (
        <div className="min-w-0 flex-1" aria-hidden="true" />
      ) : canGoBack ? (
        <BackButton fallback="/today" iconOnly className="px-2" />
      ) : (
        <div className="flex h-10 min-w-0 items-center">
          <DocitaLogo showText={false} />
        </div>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" onClick={openCommandPaletteFromUi} aria-label="Open command palette" data-testid="mobile-command-palette" className="touch-manipulation">
          <Command className="size-4" aria-hidden />
        </Button>
        <TopBarActions compact />
      </div>
    </header>
  );
}

function ProtectedMainArea({ isConsultationDetailRoute }: { isConsultationDetailRoute: boolean; onMore: () => void }) {
  const mainClassName = isConsultationDetailRoute
    ? "flex-1 overflow-hidden"
    : "flex-1 overflow-y-auto p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:p-6";

  return (
    <>
      <main id="main-content" className={`${mainClassName} animate-fade-up`} aria-label="Main content">
        <ErrorBoundary><Outlet /></ErrorBoundary>
      </main>
    </>
  );
}

export function ProtectedLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const { user, isLoading, isApiStarting, redirectMessage } = useProtectedWorkspaceAccess();
  const isSettingsRoute = pathname?.startsWith("/settings") ?? false;
  const isConsultationDetailRoute = /^\/consultation\/[^/]+/.test(pathname);

  useSidebarAutoCollapse({ isLoading, isSettingsRoute, isConsultationDetailRoute, sidebarPanelRef, setIsCollapsed });

  if (isLoading) return <WorkspaceLoadingSkeleton />;
  if (isApiStarting) return <PageTransitionLoader title="Server is warming up…" description="The backend is starting from cold. This takes a few seconds — you'll be connected automatically." />;
  if (redirectMessage || !user || !user.clinicId) return <PageTransitionLoader title="Redirecting…" description={redirectMessage ?? "Preparing your workspace…"} />;

  return (
    <ProvidersWrapper>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none">
        Skip to content
      </a>
      <div className="flex h-screen overflow-hidden bg-background">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel ref={sidebarPanelRef} defaultSize={18} minSize={15} maxSize={25} className="hidden md:block" collapsible collapsedSize={4} onCollapse={() => setIsCollapsed(true)} onExpand={() => setIsCollapsed(false)}
            style={{ transition: isDragging ? "none" : "flex 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <Sidebar isCollapsed={isCollapsed} onCollapsedChange={(collapsed) => { setIsCollapsed(collapsed); if (collapsed) sidebarPanelRef.current?.collapse(); else sidebarPanelRef.current?.expand(); }} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
          </ResizablePanel>
          <div className="relative hidden md:flex overflow-visible">
            <ResizableHandle onDragging={setIsDragging} />
            <SymbolTooltip label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
              <Button variant="ghost" size="icon" className="absolute top-7 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors hover:cursor-pointer hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
                onClick={(e) => { e.stopPropagation(); const next = !isCollapsed; setIsCollapsed(next); if (next) sidebarPanelRef.current?.collapse(); else sidebarPanelRef.current?.expand(); }}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0" /> : <ChevronLeft className="h-3 w-3 shrink-0" />}
              </Button>
            </SymbolTooltip>
          </div>
          <ResizablePanel defaultSize={82}>
            <div className="flex h-full flex-col overflow-hidden">
              <MobileHeader onMenuClick={() => setMobileOpen(true)} />
              {!isConsultationDetailRoute ? <DesktopTopBar /> : null}
              <ProtectedMainArea isConsultationDetailRoute={isConsultationDetailRoute} onMore={() => setMobileOpen(true)} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <FloatingStartConsultation />
      <CommandPalette />
      <AskAiOverlay />
    </ProvidersWrapper>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AskAiOverlay,
  AskAiProvider,
  FloatingStartConsultation,
  RealtimeProviders,
  Sidebar,
  SidebarMobileTrigger,
} from "@/components";
import { BackButton } from "@/components/navigation/back-button";
import { useCanGoBack } from "@/hooks/use-can-go-back";
import { CommandPalette } from "@/components/navigation/command-palette";
import { DesktopTopBar } from "@/components/layout/desktop-top-bar";
import {
  openCommandPaletteFromUi,
  TopBarActions,
} from "@/components/layout/top-bar-actions";
import { DoctorVerificationGuard } from "@/components/guards/doctor-verification-guard";
import { SubscriptionGuard } from "@/components/guards/subscription-guard";
import { PageAccessGuard } from "@/components/guards/page-access-guard";
import { SubscriptionLockNotice } from "@/components/layout/subscription-lock-notice";
import { ClinicProvider } from "@/lib/contexts/clinic-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/layout/resizable";
import type { ImperativePanelHandle } from "@workspace/ui/components/layout/resizable";
import { ErrorBoundaryWrapper } from "@/components/errors/error-boundary";
import { useAuth } from "@/lib/auth/auth-context";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Command, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { FeatureFlagsProvider } from "@/hooks/use-feature-flag";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { persistReturnPathBeforeLogin } from "@/lib/auth/safe-return-path";

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const canGoBack = useCanGoBack();
  const isConsultationDetailRoute = Boolean(
    pathname && /^\/consultation\/[^/]+/.test(pathname),
  );
  return (
    <header
      className="flex h-[var(--app-mobile-header-height)] items-center gap-1 border-b bg-background px-2 pt-[env(safe-area-inset-top,0px)] md:hidden"
      aria-label="Mobile navigation"
      data-testid="mobile-header"
    >
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openCommandPaletteFromUi}
          aria-label="Open command palette"
          data-testid="mobile-command-palette"
          className="touch-manipulation"
        >
          <Command className="size-4" aria-hidden />
        </Button>
        <TopBarActions compact />
      </div>
    </header>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const wasSettingsAutoCollapseRouteRef = useRef(false);
  const wasConsultationAutoCollapseRouteRef = useRef(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isSettingsRoute = pathname?.startsWith("/settings") ?? false;
  const isConsultationDetailRoute = Boolean(
    pathname && /^\/consultation\/[^/]+/.test(pathname),
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setRedirectMessage("Your session is missing. Redirecting to login…");
      persistReturnPathBeforeLogin();
      router.replace("/login");
      return;
    }
    if (user.emailVerified === false) {
      setRedirectMessage("Please verify your email before continuing…");
      router.replace("/verify-email-sent");
      return;
    }
    if (!user.clinicId) {
      if (user.onboardingStep === "JOINING_CLINIC") {
        setRedirectMessage("Taking you to your join request status…");
        router.replace("/join-request-status");
      } else if (user.onboardingStep === "CREATING_CLINIC") {
        setRedirectMessage("Taking you back to onboarding…");
        router.replace("/onboarding");
      } else {
        setRedirectMessage("Taking you to facility setup…");
        router.replace("/choose-path");
      }
    }
  }, [isLoading, user, router]);

  // Consultation detail: collapse/expand based on route
  useEffect(() => {
    if (isLoading) return;
    const wasConsultationAutoCollapseRoute =
      wasConsultationAutoCollapseRouteRef.current;
    wasConsultationAutoCollapseRouteRef.current = isConsultationDetailRoute;

    const id = requestAnimationFrame(() => {
      if (isConsultationDetailRoute && !wasConsultationAutoCollapseRoute) {
        // Entering consultation detail: collapse sidebar
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isConsultationDetailRoute && wasConsultationAutoCollapseRoute) {
        // Leaving consultation detail: expand sidebar
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, isConsultationDetailRoute]);

  useEffect(() => {
    if (isLoading) return;
    const wasSettingsAutoCollapseRoute =
      wasSettingsAutoCollapseRouteRef.current;
    wasSettingsAutoCollapseRouteRef.current = isSettingsRoute;

    const id = requestAnimationFrame(() => {
      if (isSettingsRoute && !wasSettingsAutoCollapseRoute) {
        // Entering settings: collapse sidebar
        sidebarPanelRef.current?.collapse();
        setIsCollapsed(true);
      } else if (!isSettingsRoute && wasSettingsAutoCollapseRoute) {
        // Leaving settings: expand sidebar
        sidebarPanelRef.current?.expand();
        setIsCollapsed(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isLoading, isSettingsRoute]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen overflow-hidden bg-background"
        role="status"
        aria-live="polite"
        aria-label="Loading workspace"
      >
        <div className="hidden md:flex w-[18%] min-w-[200px] flex-col border-r p-4 gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex flex-col gap-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 w-full rounded-md"
              />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b flex items-center px-6 gap-4 md:hidden">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 p-4 md:p-6 flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-28 rounded-lg"
                />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (redirectMessage || !user || !user.clinicId) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description={redirectMessage ?? "Preparing your workspace…"}
      />
    );
  }

  return (
    <RealtimeProviders>
      <ClinicProvider>
        <FeatureFlagsProvider>
        <DoctorVerificationGuard>
          <SubscriptionGuard>
            <PageAccessGuard>
             <AskAiProvider>
              <div className="flex h-screen overflow-hidden bg-background">
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel
                    ref={sidebarPanelRef}
                    defaultSize={18}
                    minSize={15}
                    maxSize={25}
                    className="hidden md:block"
                    collapsible={true}
                    collapsedSize={4}
                    onCollapse={() => setIsCollapsed(true)}
                    onExpand={() => setIsCollapsed(false)}
                    style={{
                      transition: isDragging
                        ? "none"
                        : "flex 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <Sidebar
                      isCollapsed={isCollapsed}
                      onCollapsedChange={(collapsed) => {
                        setIsCollapsed(collapsed);
                        if (collapsed) {
                          sidebarPanelRef.current?.collapse();
                        } else {
                          sidebarPanelRef.current?.expand();
                        }
                      }}
                      mobileOpen={mobileOpen}
                      onMobileOpenChange={setMobileOpen}
                    />
                  </ResizablePanel>
                  <div className="relative hidden md:flex overflow-visible">
                    <ResizableHandle onDragging={setIsDragging} />
                    <SymbolTooltip
                      label={
                        isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                      }
                      side="right"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-7 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none transition-colors hover:cursor-pointer hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isCollapsed;
                          setIsCollapsed(next);
                          if (next) {
                            sidebarPanelRef.current?.collapse();
                          } else {
                            sidebarPanelRef.current?.expand();
                          }
                        }}
                        aria-label={
                          isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                        }
                      >
                        {isCollapsed ? (
                          <PanelLeftOpen className="h-3 w-3 shrink-0" />
                        ) : (
                          <PanelLeftClose className="h-3 w-3 shrink-0" />
                        )}
                      </Button>
                    </SymbolTooltip>
                  </div>
                  <ResizablePanel defaultSize={82}>
                    <div className="flex h-full flex-col overflow-hidden">
                      <MobileHeader onMenuClick={() => setMobileOpen(true)} />
                      {!isConsultationDetailRoute ? <DesktopTopBar /> : null}
                      {!isConsultationDetailRoute ? (
                        <SubscriptionLockNotice />
                      ) : null}
                      <main
                        className={
                          isConsultationDetailRoute
                            ? "flex-1 overflow-hidden"
                            : "flex-1 overflow-y-auto p-4 md:p-6"
                        }
                        aria-label="Main content"
                      >
                        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
                      </main>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
              <FloatingStartConsultation />
              <CommandPalette />
              <AskAiOverlay />
             </AskAiProvider>
            </PageAccessGuard>
          </SubscriptionGuard>
        </DoctorVerificationGuard>
        </FeatureFlagsProvider>
      </ClinicProvider>
    </RealtimeProviders>
  );
}

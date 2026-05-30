"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/overlay/sheet";
import { DocitaIcon, DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { SidebarRailTooltip } from "@workspace/ui/components/navigation/sidebar-rail-tooltip";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { SidebarTrackSection } from "./sidebar/sidebar-track-section";
import { SidebarServicesSection } from "./sidebar/sidebar-services-section";
import { SidebarFooter } from "./sidebar/sidebar-footer";
import { useSidebarSections } from "./sidebar/use-sidebar-sections";
import { useState } from "react";
import { Feature } from "@workspace/types";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { useScrollBehavior } from "@workspace/hooks";

// ─── Scroll-shadow hook ───────────────────────────────────────────────────────

function useScrollShadow(ref: React.RefObject<HTMLElement | null>) {
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowTopShadow(el.scrollTop > 4);
      setShowBottomShadow(
        el.scrollTop + el.clientHeight < el.scrollHeight - 4,
      );
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);

  return { showTopShadow, showBottomShadow };
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  isCollapsed: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({
  isCollapsed,
  onExpand,
  onClose,
  isMobile = false,
}: SidebarContentProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const { showTopShadow, showBottomShadow } = useScrollShadow(scrollRef);
  const scrollBehavior = useScrollBehavior();

  const {
    orderedVisibleSections,
    dynamicSection,
    aiAssistantAccessible,
    sectionsWithAccess,
    isAdmin,
    canAccessNotifications,
    canAccessSettings,
    canOpenBillingSettings,
    notificationCount,
    pendingJoinRequestCount,
    tierInfo,
    navOrder,
    isHidden,
    toggleItem,
  } = useSidebarSections();

  const collapsedRail = isCollapsed && !isMobile;
  const showLabels = !isCollapsed || isMobile;

  const { clinic } = useClinic();
  const hasWhiteLabel = useTierFeatureEnabled(Feature.WHITE_LABEL_BRANDING);
  const brandName =
    hasWhiteLabel && clinic?.enterpriseBranding?.brandName
      ? clinic.enterpriseBranding.brandName
      : null;

  return (
    <>
      {/* Header */}
      {collapsedRail ? (
        <SidebarRailTooltip label="Expand sidebar">
          <button
            type="button"
            className="flex h-14 w-full shrink-0 items-center justify-center border-b border-border/60 hover:bg-muted/50 transition-colors"
            onClick={onExpand}
            aria-label="Expand sidebar"
          >
            {brandName ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[var(--fs-2xs)] font-bold text-primary-foreground uppercase">
                {brandName.slice(0, 2)}
              </span>
            ) : (
              <DocitaIcon />
            )}
          </button>
        </SidebarRailTooltip>
      ) : (
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-3">
          <Link
            href="/today"
            className="flex h-9 items-center gap-2 rounded-lg px-1 transition-colors hover:opacity-80"
          >
            {brandName ? (
              <span className="truncate text-base font-semibold tracking-tight text-foreground max-w-[11rem]">
                {brandName}
              </span>
            ) : (
              <DocitaLogo />
            )}
          </Link>
          {isMobile && (
            <SymbolTooltip label="Close sidebar" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}
        </div>
      )}

      {/* Scrollable nav */}
      <div className="relative flex-1 min-h-0">
        {showTopShadow && !isCollapsed && (
          <SymbolTooltip label="Scroll up">
            <button
              type="button"
              aria-label="Scroll up"
              className="group absolute top-0 left-0 right-0 z-10 flex h-8 cursor-pointer items-start justify-center pt-1"
              style={{
                background:
                  "linear-gradient(to bottom, hsl(var(--background)) 20%, transparent)",
              }}
              onClick={() =>
                scrollRef.current?.scrollBy({ top: -120, behavior: scrollBehavior })
              }
            >
              <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
            </button>
          </SymbolTooltip>
        )}

        <nav
          ref={(el) => {
            scrollRef.current = el;
          }}
          className={cn(
            "h-full overflow-y-auto overflow-x-hidden py-3 scrollbar-none",
            collapsedRail ? "px-1 space-y-1" : "px-2 space-y-4",
          )}
          aria-label="Primary"
        >
          <SidebarTrackSection
            orderedVisibleSections={orderedVisibleSections}
            collapsedRail={collapsedRail}
            showLabels={showLabels}
          />
          <SidebarServicesSection
            dynamicSection={dynamicSection}
            aiAssistantAccessible={aiAssistantAccessible}
            collapsedRail={collapsedRail}
            showLabels={showLabels}
          />
        </nav>

        {showBottomShadow && !isCollapsed && (
          <SymbolTooltip label="Scroll down">
            <button
              type="button"
              aria-label="Scroll down"
              className="group absolute bottom-0 left-0 right-0 z-10 flex h-10 cursor-pointer items-end justify-center pb-1.5"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--background)) 40%, transparent)",
              }}
              onClick={() =>
                scrollRef.current?.scrollBy({ top: 120, behavior: scrollBehavior })
              }
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
            </button>
          </SymbolTooltip>
        )}
      </div>

      {/* Footer (settings, help, theme, plan, ask-ai) */}
      <SidebarFooter
        collapsedRail={collapsedRail}
        showLabels={showLabels}
        isAdmin={isAdmin}
        canAccessNotifications={canAccessNotifications}
        canAccessSettings={canAccessSettings}
        canOpenBillingSettings={canOpenBillingSettings}
        notificationCount={notificationCount}
        pendingJoinRequestCount={pendingJoinRequestCount}
        tierInfo={tierInfo}
        sectionsWithAccess={sectionsWithAccess}
        isHidden={isHidden}
        toggleItem={toggleItem}
        navOrder={navOrder}
      />
    </>
  );
}

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

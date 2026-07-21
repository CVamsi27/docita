"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Button,
  SidebarRailTooltip,
  SymbolTooltip
} from "@workspace/ui/components";
import {
  DocitaIcon,
  DocitaLogo,
} from "@workspace/ui/components/indicators/docita-logo";
import { useScrollBehavior } from "@workspace/hooks";
import type { NavSection } from "@/components/navigation/nav-config";
import { SidebarTrackSection } from "./sidebar-track-section";
import { SidebarServicesSection } from "./sidebar-services-section";

function useScrollShadow(ref: React.RefObject<HTMLElement | null>) {
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowTopShadow(el.scrollTop > 4);
      setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
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

interface SidebarBrandHeaderProps {
  collapsedRail: boolean;
  isMobile: boolean;
  brandName: string | null;
  onExpand?: () => void;
  onClose?: () => void;
}

/** Collapsed-rail expand button OR full logo/brand row + mobile close — split out as the sidebar's self-contained "chrome header" unit. */
export function SidebarBrandHeader({
  collapsedRail,
  isMobile,
  brandName,
  onExpand,
  onClose,
}: SidebarBrandHeaderProps) {
  if (collapsedRail) {
    return (
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
    );
  }

  return (
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
  );
}

interface SidebarScrollableNavLayout {
  isCollapsed: boolean;
  collapsedRail: boolean;
  showLabels: boolean;
}

interface SidebarScrollableNavProps {
  layout: SidebarScrollableNavLayout;
  orderedVisibleSections: NavSection[];
  dynamicSection: NavSection | null;
  aiAssistantAccessible: boolean;
}

interface SidebarScrollShadowButtonProps {
  direction: "up" | "down";
  visible: boolean;
  onScroll: () => void;
}

/**
 * One edge-fade scroll button — the up/down variants are identical in every
 * way except direction, so they're parameterized here instead of duplicated
 * as two near-copies of the same JSX block.
 */
function SidebarScrollShadowButton({
  direction,
  visible,
  onScroll,
}: SidebarScrollShadowButtonProps) {
  if (!visible) return null;

  const isUp = direction === "up";
  const Icon = isUp ? ChevronUp : ChevronDown;
  const label = isUp ? "Scroll up" : "Scroll down";

  return (
    <SymbolTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "group absolute left-0 right-0 z-10 flex cursor-pointer justify-center",
          isUp
            ? "top-0 h-8 items-start pt-1"
            : "bottom-0 h-10 items-end pb-1.5",
        )}
        style={{
          background: isUp
            ? "linear-gradient(to bottom, hsl(var(--background)) 20%, transparent)"
            : "linear-gradient(to top, hsl(var(--background)) 40%, transparent)",
        }}
        onClick={onScroll}
      >
        <Icon
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isUp
              ? "group-hover:-translate-y-0.5"
              : "group-hover:translate-y-0.5",
          )}
        />
      </button>
    </SymbolTooltip>
  );
}

/**
 * Scroll-shadowed primary nav — owns its own scroll-position tracking
 * (ref + shadow detection + scroll behavior) so the orchestrator doesn't
 * have to thread that wiring through just to render the nav sections.
 */
export function SidebarScrollableNav({
  layout,
  orderedVisibleSections,
  dynamicSection,
  aiAssistantAccessible,
}: SidebarScrollableNavProps) {
  const { isCollapsed, collapsedRail, showLabels } = layout;
  const scrollRef = useRef<HTMLElement | null>(null);
  const { showTopShadow, showBottomShadow } = useScrollShadow(scrollRef);
  const scrollBehavior = useScrollBehavior();

  return (
    <div className="relative flex-1 min-h-0">
      <SidebarScrollShadowButton
        direction="up"
        visible={showTopShadow && !isCollapsed}
        onScroll={() =>
          scrollRef.current?.scrollBy({ top: -120, behavior: scrollBehavior })
        }
      />

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

      <SidebarScrollShadowButton
        direction="down"
        visible={showBottomShadow && !isCollapsed}
        onScroll={() =>
          scrollRef.current?.scrollBy({ top: 120, behavior: scrollBehavior })
        }
      />
    </div>
  );
}

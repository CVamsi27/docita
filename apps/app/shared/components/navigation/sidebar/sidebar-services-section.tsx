"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  AI_ASSISTANT_NAV_ITEM,
  type NavItem,
  type NavSection,
  sidebarNavLinkTestId,
} from "@/components/navigation/nav-config";

function getIconClasses(isActive: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-colors",
    isActive
      ? "bg-foreground text-background ring-border/40"
      : "bg-background/60 text-muted-foreground ring-border/40",
  );
}

interface ServiceNavLinkProps {
  item: NavItem;
  collapsedRail: boolean;
  showLabels: boolean;
}

function ServiceNavLink({ item, collapsedRail, showLabels }: ServiceNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  const link = (
    <Link
      href={item.href}
      data-testid={sidebarNavLinkTestId(item.href)}
      aria-label={collapsedRail ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-200",
        collapsedRail && "justify-center px-0 mx-auto w-11 max-w-[2.75rem]",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-foreground transition-[height,width] duration-200",
            collapsedRail ? "h-6" : "h-5",
          )}
        />
      )}
      <div className={getIconClasses(isActive)}>
        <item.icon className="h-4 w-4 shrink-0" />
      </div>
      {showLabels && (
        <span className="flex-1 truncate transition-opacity duration-200">
          {item.label}
        </span>
      )}
    </Link>
  );

  return (
    <Fragment key={item.href}>
      {collapsedRail ? (
        <SymbolTooltip label={item.label} side="right">
          {link}
        </SymbolTooltip>
      ) : (
        link
      )}
    </Fragment>
  );
}

interface SidebarServicesSectionProps {
  dynamicSection: NavSection | null;
  aiAssistantAccessible: boolean;
  collapsedRail: boolean;
  showLabels: boolean;
}

export function SidebarServicesSection({
  dynamicSection,
  aiAssistantAccessible,
  collapsedRail,
  showLabels,
}: SidebarServicesSectionProps) {
  return (
    <>
      {dynamicSection && dynamicSection.items.length > 0 ? (
        <div className="space-y-0.5">
          {showLabels ? (
            <MicroLabel className="px-2.5 pb-1.5 pt-1">
              {dynamicSection.label}
            </MicroLabel>
          ) : (
            <div
              aria-hidden
              className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
            />
          )}
          {dynamicSection.items.map((item) => (
            <ServiceNavLink
              key={item.href}
              item={item}
              collapsedRail={collapsedRail}
              showLabels={showLabels}
            />
          ))}
        </div>
      ) : null}

      {aiAssistantAccessible ? (
        <div className="space-y-0.5">
          {showLabels ? (
            <MicroLabel className="px-2.5 pb-1.5 pt-1">Assistant</MicroLabel>
          ) : (
            <div
              aria-hidden
              className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
            />
          )}
          <ServiceNavLink
            item={AI_ASSISTANT_NAV_ITEM}
            collapsedRail={collapsedRail}
            showLabels={showLabels}
          />
        </div>
      ) : null}
    </>
  );
}

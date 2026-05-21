"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/overlay/sheet";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  FIXED_NAV_HREFS,
  type NavSection,
  type NavSectionId,
} from "@/components/navigation/nav-config";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";

function getIconClasses(isActive: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-colors",
    isActive
      ? "bg-foreground text-background ring-border/40"
      : "bg-background/60 text-muted-foreground ring-border/40",
  );
}

interface CustomizeSidebarOrderUIProps {
  sections: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}

function CustomizeSidebarOrderUI({
  sections,
  isHidden,
  toggleItem,
  navOrder,
}: CustomizeSidebarOrderUIProps) {
  const [dragging, setDragging] = useState<{
    sectionId: NavSectionId;
    href: string;
  } | null>(null);

  const ordered = useMemo(
    () => navOrder.orderSections(sections),
    [navOrder, sections],
  );

  const setSectionOrder = useCallback(
    (sectionId: NavSectionId, hrefs: string[], scope: "clinic" | "user") => {
      navOrder.setOrder(
        { ...navOrder.effectiveOrder, [sectionId]: hrefs },
        scope,
      );
    },
    [navOrder],
  );

  const handleDrop = useCallback(
    (args: {
      sectionId: NavSectionId;
      beforeHref: string | null;
      scope: "clinic" | "user";
    }) => {
      if (!dragging) return;
      if (dragging.sectionId !== args.sectionId) return;

      const current = navOrder.effectiveOrder[args.sectionId];
      const without = current.filter((h) => h !== dragging.href);
      const idx = args.beforeHref ? without.indexOf(args.beforeHref) : -1;
      const next =
        idx >= 0
          ? [...without.slice(0, idx), dragging.href, ...without.slice(idx)]
          : [...without, dragging.href];
      setSectionOrder(args.sectionId, next, args.scope);
      setDragging(null);
    },
    [dragging, navOrder.effectiveOrder, setSectionOrder],
  );

  return (
    <div className="space-y-4">
      {navOrder.hasUserOverride ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={navOrder.clearUserOverride}
        >
          Reset my order to clinic default
        </button>
      ) : null}

      {ordered.map((section) => (
        <div key={section.id} className="space-y-2">
          <MicroLabel>{section.label}</MicroLabel>

          <div
            className="space-y-0.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() =>
              handleDrop({
                sectionId: section.id,
                beforeHref: null,
                scope: "user",
              })
            }
          >
            {section.items.map((item) => {
              const fixed = FIXED_NAV_HREFS.has(item.href);
              return (
                <div
                  key={item.href}
                  draggable
                  onDragStart={() =>
                    setDragging({ sectionId: section.id, href: item.href })
                  }
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop({
                      sectionId: section.id,
                      beforeHref: item.href,
                      scope: "user",
                    });
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-2 transition-colors",
                    "hover:bg-muted",
                    dragging?.href === item.href && "bg-muted/70",
                  )}
                  aria-label={`Reorder ${item.label}`}
                  title="Drag to reorder"
                >
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <div className={getIconClasses(false)}>
                      <item.icon className="h-4 w-4 shrink-0" />
                    </div>
                    <span className="font-medium truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!fixed ? (
                      <Switch
                        checked={!isHidden(item.href)}
                        onCheckedChange={() => toggleItem(item.href)}
                        aria-label={`Show ${item.label} in sidebar`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Fixed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {navOrder.canEditClinicDefault ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => {
                navOrder.setOrder(navOrder.effectiveOrder, "clinic");
              }}
            >
              Save this order for the clinic default
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SidebarCustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}

export function SidebarCustomizeSheet({
  open,
  onOpenChange,
  sections,
  isHidden,
  toggleItem,
  navOrder,
}: SidebarCustomizeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="sm:w-72">
        <SheetHeader>
          <SheetTitle>Customize Sidebar</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Drag to reorder items. Toggle to hide items you do not use.
        </p>
        <CustomizeSidebarOrderUI
          sections={sections}
          isHidden={isHidden}
          toggleItem={toggleItem}
          navOrder={navOrder}
        />
      </SheetContent>
    </Sheet>
  );
}

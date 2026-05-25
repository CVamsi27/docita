"use client";

import type { ElementType } from "react";
import { cn } from "@workspace/ui/lib/utils";
import {
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";

export interface SettingsTabItem {
  value: string;
  label: string;
  icon: ElementType;
  description: string;
}

export interface SettingsCategory {
  category: string;
  items: SettingsTabItem[];
}

export function SettingsPageTabNav({
  filteredTabs,
}: {
  filteredTabs: SettingsCategory[];
}) {
  return (
    <aside className="w-full min-w-0 shrink-0 md:sticky md:top-4 md:w-56 lg:w-64">
      <TabsList
        className={cn(
          "flex h-auto w-full min-w-0 gap-0.5 bg-transparent p-0",
          "max-md:-mx-4 max-md:flex-row max-md:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:border-b max-md:px-4 max-md:pb-2 max-md:[scrollbar-width:thin]",
          "md:flex-col md:flex-nowrap md:items-stretch md:overflow-visible md:border-b-0 md:pb-0",
        )}
      >
        {filteredTabs.map((category, categoryIndex) => {
          const isDangerCategory = category.category === "Danger Zone";
          return (
            <div key={category.category}>
              <div
                className={cn(
                  "hidden md:block px-2 py-1.5 text-xs font-semibold uppercase tracking-wider mb-1",
                  categoryIndex > 0 && "mt-3",
                  isDangerCategory
                    ? "text-destructive/60"
                    : "text-muted-foreground/70",
                )}
              >
                {category.category}
              </div>
              {category.items.map((item) => {
                const Icon = item.icon;
                const isDangerItem = isDangerCategory;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "group relative max-md:shrink-0 md:w-full justify-start px-3 py-2.5 gap-2 md:gap-3",
                      "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm",
                      "rounded-[var(--radius)] whitespace-normal transition-colors",
                      isDangerItem
                        ? "hover:bg-destructive/5 hover:text-destructive"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground opacity-0 transition-opacity duration-200 md:block group-data-[state=active]:opacity-100"
                    />
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isDangerItem && "text-destructive/70",
                      )}
                    />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="hidden md:block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </div>
          );
        })}
      </TabsList>
    </aside>
  );
}

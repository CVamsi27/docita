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
    <nav
      aria-label="Settings sections"
      className={cn(
        "min-w-0",
        "max-md:-mx-4 max-md:border-b max-md:border-border/60",
        "md:rounded-[var(--radius)] md:border md:border-border/60 md:bg-card md:p-2 md:shadow-sm",
      )}
    >
      <TabsList
        className={cn(
          "flex h-auto w-full min-w-0 gap-0.5 rounded-none border-0 bg-transparent p-0 shadow-none",
          "max-md:flex-row max-md:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-4 max-md:pb-2 max-md:pt-2 max-md:[scrollbar-width:thin]",
          "md:flex-col md:flex-nowrap md:items-stretch md:overflow-visible",
        )}
      >
        {filteredTabs.map((category, categoryIndex) => {
          const isDanger = category.category === "Danger Zone";
          return (
            <div
              key={category.category}
              className={cn(
                "contents md:block",
                categoryIndex > 0 && "md:mt-3",
              )}
            >
              <div
                className={cn(
                  "ui-eyebrow hidden md:block px-3 pb-1.5 pt-1",
                  isDanger && "text-destructive/70",
                )}
              >
                {category.category}
              </div>
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "group relative flex max-md:shrink-0 md:w-full items-center justify-start gap-2.5 rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm whitespace-normal transition-colors",
                      "md:gap-3 md:py-2.5",
                      isDanger
                        ? "hover:bg-destructive/10 hover:text-destructive data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:font-semibold"
                        : "hover:bg-muted/60 data-[state=active]:bg-[color-mix(in_oklch,var(--primary)_10%,transparent)] data-[state=active]:text-primary data-[state=active]:font-semibold",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isDanger
                          ? "text-destructive/70 group-data-[state=active]:text-destructive"
                          : "text-muted-foreground group-data-[state=active]:text-primary",
                      )}
                    />
                    <span className="min-w-0 truncate text-left">
                      {item.label}
                    </span>
                  </TabsTrigger>
                );
              })}
            </div>
          );
        })}
      </TabsList>
    </nav>
  );
}

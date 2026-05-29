"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";
import type { FeatureComparisonRow } from "@/lib/subscription/tier-access";
import type { AvailableFeatureItem } from "./use-comparison-table";

export function ComparisonTableMobile({
  tiers,
  validCurrentTier,
  compareWithTier,
  onSelectCompareTier,
  limitRows,
  availableFeatures,
}: {
  tiers: Tier[];
  validCurrentTier: Tier;
  compareWithTier: Tier;
  onSelectCompareTier: (tier: Tier) => void;
  limitRows: FeatureComparisonRow[];
  availableFeatures: AvailableFeatureItem[];
}) {
  return (
    <div className="block md:hidden p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
          Compare {getTierInfo(validCurrentTier).name} with
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tiers
            .filter((tier) => tier !== validCurrentTier)
            .map((tier) => {
              const info = getTierInfo(tier);
              const isActive = compareWithTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onSelectCompareTier(tier)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:bg-muted/50",
                  )}
                >
                  {info.name}
                </button>
              );
            })}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)_minmax(4.5rem,auto)] items-baseline gap-x-3 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide">
        <span className="text-muted-foreground">Feature</span>
        <span className="shrink-0 text-right text-foreground">
          {getTierInfo(validCurrentTier).name}
        </span>
        <span className="shrink-0 text-right text-primary">
          {getTierInfo(compareWithTier).name}
        </span>
      </div>

      <div className="rounded-lg border bg-background/50">
        <div className="border-b px-3 py-2">
          <p className="text-[var(--fs-xs)] font-semibold text-foreground">
            Plan limits
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {limitRows.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)_minmax(4.5rem,auto)] items-baseline gap-x-3 gap-y-1 px-3 py-2.5"
            >
              <p className="min-w-0 break-words text-[var(--fs-xs)] text-muted-foreground">
                {row.name}
              </p>
              <p className="shrink-0 text-right text-[var(--fs-sm)] font-medium tabular-nums whitespace-nowrap text-foreground">
                {String(row.values[validCurrentTier])}
              </p>
              <p className="shrink-0 text-right text-[var(--fs-sm)] font-semibold tabular-nums whitespace-nowrap text-primary">
                {String(row.values[compareWithTier])}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-background/50">
        <div className="border-b px-3 py-2">
          <p className="text-[var(--fs-xs)] font-semibold text-foreground">
            Features
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {availableFeatures.map((item, index) => {
            if (item.kind === "header") {
              return (
                <p
                  key={`${item.label}-${index}`}
                  className="bg-muted/30 px-3 py-1.5 text-[var(--fs-2xs)] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {item.label}
                </p>
              );
            }

            const inCurrent = validCurrentTier >= item.requiredTier;
            const inCompare = compareWithTier >= item.requiredTier;
            return (
              <div
                key={item.feature}
                className="grid grid-cols-[minmax(0,1fr)_minmax(2.5rem,auto)_minmax(2.5rem,auto)] items-center gap-x-3 gap-y-1 px-3 py-2"
              >
                <p className="min-w-0 break-words text-[var(--fs-xs)] text-foreground">
                  {item.label}
                </p>
                <div className="flex justify-end">
                  {inCurrent ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex justify-end">
                  {inCompare ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

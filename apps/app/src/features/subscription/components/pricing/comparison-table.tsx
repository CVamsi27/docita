"use client";

import { PLAN_MODE_INFO, type PlanMode } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";
import { ComparisonTableDesktop } from "./comparison-table-desktop";
import { ComparisonTableMobile } from "./comparison-table-mobile";
import { useComparisonTable } from "./use-comparison-table";

interface ComparisonTableProps {
  currentTier: number;
  keyFeaturesOnly?: boolean;
}

function ModeSegmentedControl({
  mode,
  modes,
  onChange,
}: {
  mode: PlanMode;
  modes: readonly PlanMode[];
  onChange: (mode: PlanMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Plan mode"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
    >
      {modes.map((value) => {
        const isActive = value === mode;
        return (
          <Button
            key={value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            aria-pressed={isActive}
            onClick={() => onChange(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[var(--fs-xs)]",
              !isActive && "text-muted-foreground hover:text-foreground",
            )}
          >
            {PLAN_MODE_INFO[value].shortLabel}
          </Button>
        );
      })}
    </div>
  );
}

export function ComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: ComparisonTableProps) {
  const table = useComparisonTable({ currentTier, keyFeaturesOnly });

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="ui-section-title text-[var(--fs-xl)] leading-[var(--lh-tight)]">
              Compare plans
            </h2>
            <p className="mt-0.5 text-[var(--fs-xs)] text-muted-foreground">
              Side-by-side feature and limit breakdown across all tiers.
            </p>
          </div>
          <ModeSegmentedControl
            mode={table.mode}
            modes={table.modes}
            onChange={table.setMode}
          />
        </div>
        <p className="text-[var(--fs-xs)] text-muted-foreground">
          <span className="font-medium text-foreground">
            {PLAN_MODE_INFO[table.mode].name}:
          </span>{" "}
          {PLAN_MODE_INFO[table.mode].helpText}
        </p>
      </div>

      <ComparisonTableMobile
        tiers={table.tiers}
        validCurrentTier={table.validCurrentTier}
        compareWithTier={table.compareWithTier}
        onSelectCompareTier={table.setMobileTier}
        limitRows={table.limitRows}
        availableFeatures={table.availableFeatures}
        mode={table.mode}
      />

      <ComparisonTableDesktop
        tiers={table.tiers}
        currentTier={table.currentTier}
        limitRows={table.limitRows}
        categories={table.categories}
        mode={table.mode}
      />
    </div>
  );
}

"use client";

import { ComparisonTableDesktop } from "./comparison-table-desktop";
import { ComparisonTableMobile } from "./comparison-table-mobile";
import { useComparisonTable } from "./use-comparison-table";

interface ComparisonTableProps {
  currentTier: number;
  keyFeaturesOnly?: boolean;
}

export function ComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: ComparisonTableProps) {
  const table = useComparisonTable({ currentTier, keyFeaturesOnly });

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-col gap-1 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="ui-section-title text-[var(--fs-xl)] leading-[var(--lh-tight)]">
            Compare plans
          </h2>
          <p className="mt-0.5 text-[var(--fs-xs)] text-muted-foreground">
            Side-by-side feature and limit breakdown across all tiers.
          </p>
        </div>
      </div>

      <ComparisonTableMobile
        tiers={table.tiers}
        validCurrentTier={table.validCurrentTier}
        compareWithTier={table.compareWithTier}
        onSelectCompareTier={table.setMobileTier}
        limitRows={table.limitRows}
        availableFeatures={table.availableFeatures}
      />

      <ComparisonTableDesktop
        tiers={table.tiers}
        currentTier={table.currentTier}
        limitRows={table.limitRows}
        categories={table.categories}
      />
    </div>
  );
}

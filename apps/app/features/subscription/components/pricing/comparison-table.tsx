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
      <div className="p-6 border-b">
        <h2 className="ui-section-title text-center text-[var(--fs-2xl)]">
          Compare Plans
        </h2>
        <p className="ui-page-subtitle mt-2 text-center">
          Find the perfect fit for your facility&apos;s needs
        </p>
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

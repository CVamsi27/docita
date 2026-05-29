"use client";

import { Info } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { getTierInfo, Tier, type FeatureComparisonRow } from "@/lib/subscription/tier-access";
import { FEATURE_TIER_MAP } from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  LIMIT_ROW_DESCRIPTIONS,
  FeatureCategoryRows,
  SectionHeader,
} from "./comparison-table-helpers";
import type { FEATURE_CATEGORIES } from "./comparison-table-helpers";

type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];

export function ComparisonTableDesktop({
  tiers,
  currentTier,
  limitRows,
  categories,
}: {
  tiers: Tier[];
  currentTier: number;
  limitRows: FeatureComparisonRow[];
  categories: FeatureCategory[];
}) {
  return (
    <div className="hidden md:block">
      <Table className="text-sm table-auto min-w-[56rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 w-[11rem] min-w-[11rem] max-w-[15rem] border-r bg-card lg:w-[15rem] lg:min-w-[15rem]">
              <span className="sr-only">Features</span>
            </TableHead>
            {tiers.map((tier) => {
              const info = getTierInfo(tier);
              const isCurrent = currentTier === tier;
              return (
                <TableHead
                  key={tier}
                  className={cn(
                    "w-[7.5rem] min-w-[7.5rem] px-2 py-4 align-top text-center",
                    isCurrent && "bg-primary/5",
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight">
                      {info.name}
                    </span>
                    {isCurrent ? (
                      <Badge
                        variant="secondary"
                        className="h-5 px-2 text-[0.625rem]"
                      >
                        Current
                      </Badge>
                    ) : null}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          <SectionHeader label="Plan Limits" colSpan={tiers.length + 1} />
          {limitRows.map((row: FeatureComparisonRow) => (
            <TableRow key={row.name} className="hover:bg-muted/50">
              <TableCell className="sticky left-0 z-10 w-[11rem] min-w-[11rem] max-w-[15rem] border-r bg-card py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 lg:w-[15rem] lg:min-w-[15rem]">
                <div className="flex items-center gap-2">
                  <SymbolTooltip
                    label={row.name}
                    side="top"
                    contentClassName="max-w-[280px]"
                  >
                    <span className="text-sm truncate">{row.name}</span>
                  </SymbolTooltip>
                  {LIMIT_ROW_DESCRIPTIONS[row.name] ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info
                          className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0"
                          aria-label="About this limit"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]" side="right">
                        <p className="text-xs">
                          {LIMIT_ROW_DESCRIPTIONS[row.name]}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </TableCell>
              {tiers.map((tier) => (
                <TableCell
                  key={tier}
                  className={cn(
                    "w-[7.5rem] min-w-[7.5rem] px-2 text-center align-middle border-l py-2.5",
                    currentTier === tier && "bg-primary/5",
                  )}
                >
                  <span className="block text-sm font-medium tabular-nums whitespace-nowrap">
                    {String(row.values[tier])}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}

          {categories.map((category) => {
            const validFeatures = category.features.filter(
              (f) =>
                f in FEATURE_TIER_MAP &&
                getFeatureDetails(f).isGenerallyAvailable,
            );
            if (validFeatures.length === 0) return null;
            return (
              <FeatureCategoryRows
                key={category.label}
                label={category.label}
                features={validFeatures}
                tiers={tiers}
                currentTier={currentTier}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import { Check, Info, Minus } from "lucide-react";
import { getTierName, hasFeatureAccess } from "@/lib/subscription/tier-access";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { Badge, SymbolTooltip, TableCell, TableRow, Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { Feature, type PlanMode } from "@workspace/types";
import { isFeatureBlockedInMode } from "./comparison-table-data";

export function SectionHeader({
  label,
  colSpan,
}: {
  label: string;
  colSpan: number;
}) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell
        colSpan={colSpan}
        className="py-1.5 px-4 sticky left-0 border-r"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </TableCell>
    </TableRow>
  );
}

export function FeatureCategoryRows({
  label,
  features,
  tiers,
  currentTier,
  mode,
}: {
  label: string;
  features: Feature[];
  tiers: number[];
  currentTier: number;
  mode: PlanMode;
}) {
  return (
    <>
      <SectionHeader label={label} colSpan={tiers.length + 1} />
      {features.map((feature) => {
        const details = getFeatureDetails(feature);
        return (
          <TableRow key={feature} className="hover:bg-muted/50">
            <TableCell className="sticky left-0 z-10 bg-card border-r w-[11rem] min-w-[11rem] max-w-[15rem] hover:bg-muted/50 transition-colors py-2.5 lg:w-[15rem] lg:min-w-[15rem]">
              <div className="flex items-center gap-2">
                <SymbolTooltip
                  label={details.name}
                  side="top"
                  contentClassName="max-w-[280px]"
                >
                  <span className="text-sm truncate">{details.name}</span>
                </SymbolTooltip>
                {!details.isGenerallyAvailable && (
                  <Badge
                    variant="secondary"
                    className="text-[var(--fs-2xs)] px-1.5 py-0"
                  >
                    Planned
                  </Badge>
                )}
                {details.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info
                        className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0"
                        aria-label="About this feature"
                      />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px]" side="right">
                      <p className="text-xs">{details.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TableCell>
            {tiers.map((tier) => {
              const hasAccess =
                details.isGenerallyAvailable &&
                hasFeatureAccess(getTierName(tier), feature, false) &&
                !isFeatureBlockedInMode(feature, mode);
              return (
                <TableCell
                  key={tier}
                  className={cn(
                    "w-[7.5rem] min-w-[7.5rem] px-2 text-center align-middle border-l py-2.5",
                    currentTier === tier && "bg-primary/5",
                  )}
                >
                  {hasAccess ? (
                    <Check className="h-4 w-4 text-success mx-auto" />
                  ) : !details.isGenerallyAvailable ? (
                    <Badge
                      variant="outline"
                      className="text-[var(--fs-2xs)] px-1.5 py-0 text-muted-foreground"
                    >
                      Planned
                    </Badge>
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground/20 mx-auto" />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </>
  );
}

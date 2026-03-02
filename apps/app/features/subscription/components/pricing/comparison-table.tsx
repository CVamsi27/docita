"use client";

import { Check, Info, Lock } from "lucide-react";
import { FEATURE_TIER_MAP, getTierInfo, Tier } from "@/lib/tier-config";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Feature } from "@workspace/types";

interface ComparisonTableProps {
  currentTier: number;
}

export function ComparisonTable({ currentTier }: ComparisonTableProps) {
  const tiers = Object.values(Tier)
    .filter(
      (t): t is number => typeof t === "number" && t !== Tier.INTELLIGENCE,
    )
    .sort((a, b) => a - b);

  const features = Object.entries(FEATURE_TIER_MAP).map(
    ([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }),
  );

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-center">Compare Plans</h2>
        <p className="text-center text-muted-foreground mt-2">
          Find the perfect fit for your clinic&apos;s needs
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] min-w-[200px] sticky left-0 z-10 bg-card border-r">
                <span className="sr-only">Features</span>
              </TableHead>
              {tiers.map((tier) => {
                const info = getTierInfo(tier);
                const isCurrent = currentTier === tier;
                return (
                  <TableHead
                    key={tier}
                    className={cn(
                      "text-center min-w-[140px] px-4 py-6 align-top",
                      isCurrent && "bg-primary/5",
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-bold text-lg">{info.name}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current Plan
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map(({ feature, requiredTier, details }) => (
              <TableRow key={feature} className="hover:bg-muted/50">
                <TableCell className="font-medium sticky left-0 z-10 bg-card border-r w-[300px] min-w-[200px] hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="truncate" title={details.name}>
                      {details.name}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p>{details.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                {tiers.map((tier) => {
                  const hasAccess = tier >= requiredTier;
                  const isCurrent = currentTier === tier;
                  return (
                    <TableCell
                      key={tier}
                      className={cn(
                        "text-center align-middle border-l first:border-l-0",
                        isCurrent && "bg-primary/5",
                      )}
                    >
                      {hasAccess ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * CurrentPlanCard
 *
 * SRP: Displays the active plan details and quick action buttons.
 * Receives all data via props — no API calls or business logic inside.
 */
"use client";

import { Crown, Receipt, Sparkles, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { TierInfo } from "@workspace/types";

interface CurrentPlanCardProps {
  tierInfo: TierInfo;
  currentTier: number;
  hasIntelligence: boolean;
  canChangeTier: boolean;
  onChangePlan: () => void;
  onViewBillingHistory: () => void;
}

const TIER_COLOR_MAP: Record<
  string,
  { gradient: string; badge: string }
> = {
  gray: {
    gradient: "from-slate-500 to-slate-600",
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  blue: {
    gradient: "from-blue-500 to-blue-600",
    badge:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  green: {
    gradient: "from-emerald-500 to-emerald-600",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  purple: {
    gradient: "from-violet-500 to-purple-600",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  },
  orange: {
    gradient: "from-amber-500 to-orange-600",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
};

export function CurrentPlanCard({
  tierInfo,
  currentTier,
  hasIntelligence,
  canChangeTier,
  onChangePlan,
  onViewBillingHistory,
}: CurrentPlanCardProps) {
  const colors = TIER_COLOR_MAP[tierInfo.color] ?? TIER_COLOR_MAP["gray"]!;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background dark:from-primary/10 dark:via-slate-900 dark:to-slate-800/50">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br shadow-lg",
                colors.gradient,
              )}
            >
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">{tierInfo.name} Plan</CardTitle>
              <CardDescription>{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn("text-sm px-3 py-1", colors.badge)}
          >
            Tier {currentTier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasIntelligence && (
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Intelligence Add-on Active</span>
          </div>
        )}

        {canChangeTier ? (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={onChangePlan}
              className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Change Plan
            </Button>
            <Button variant="outline" onClick={onViewBillingHistory}>
              <Receipt className="mr-2 h-4 w-4" />
              Billing History
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Contact your clinic administrator to change plans.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

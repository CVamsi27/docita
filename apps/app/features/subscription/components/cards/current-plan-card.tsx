
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

const TIER_COLOR_MAP: Record<string, { gradient: string; badge: string }> = {
  gray: {
    gradient: "tier-capture",
    badge: "tier-capture",
  },
  blue: {
    gradient: "tier-core",
    badge: "tier-core",
  },
  green: {
    gradient: "tier-plus",
    badge: "tier-plus",
  },
  purple: {
    gradient: "tier-pro",
    badge: "tier-pro",
  },
  orange: {
    gradient: "tier-enterprise",
    badge: "tier-enterprise",
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
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
                colors.gradient,
              )}
            >
              <Crown className="h-6 w-6" />
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
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              Intelligence Add-on Active
            </span>
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

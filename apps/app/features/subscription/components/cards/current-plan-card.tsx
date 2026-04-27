"use client";

import {
  Crown,
  LockKeyhole,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
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
  statusNotice?: {
    title: string;
    description: string;
    badgeLabel?: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: "default" | "warning" | "destructive";
  };
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
  currentTier: _currentTier,
  hasIntelligence,
  canChangeTier,
  onChangePlan,
  onViewBillingHistory,
  statusNotice,
}: CurrentPlanCardProps) {
  const colors = TIER_COLOR_MAP[tierInfo.color] ?? TIER_COLOR_MAP["gray"]!;
  const statusNoticeClassName =
    statusNotice?.variant === "destructive"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : statusNotice?.variant === "warning"
        ? "border-warning/50 bg-warning/10 text-warning"
        : "border-border bg-background/70";
  const statusDescriptionClassName =
    statusNotice?.variant === "destructive"
      ? "text-destructive/80"
      : statusNotice?.variant === "warning"
        ? "text-warning/80"
        : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                colors.gradient,
              )}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{tierInfo.name} Plan</CardTitle>
              <CardDescription>{tierInfo.description}</CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn("text-sm px-3 py-1", colors.badge)}
          >
            Current Plan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusNotice && (
          <div className={cn("rounded-lg border p-3", statusNoticeClassName)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {statusNotice.variant === "destructive" && (
                    <LockKeyhole className="h-4 w-4" />
                  )}
                  <p className="text-sm font-semibold">{statusNotice.title}</p>
                  {statusNotice.badgeLabel && (
                    <Badge variant="outline" className="text-[var(--fs-2xs)]">
                      {statusNotice.badgeLabel}
                    </Badge>
                  )}
                </div>
                <p className={cn("text-sm", statusDescriptionClassName)}>
                  {statusNotice.description}
                </p>
              </div>
              {statusNotice.actionLabel && statusNotice.onAction && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={statusNotice.onAction}
                  className="self-start sm:self-auto"
                >
                  {statusNotice.actionLabel}
                </Button>
              )}
            </div>
          </div>
        )}

        {hasIntelligence && (
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI features active</span>
          </div>
        )}

        {canChangeTier ? (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={onChangePlan} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Change plan
            </Button>
            <Button variant="outline" onClick={onViewBillingHistory}>
              <Receipt className="mr-2 h-4 w-4" />
              Billing History
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Contact your facility administrator to change plans.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

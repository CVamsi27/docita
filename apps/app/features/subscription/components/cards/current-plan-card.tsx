"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { Activity, CalendarClock, Crown, CreditCard, LockKeyhole, Receipt, Sparkles, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";
import type { CurrentUsage, TierInfo } from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";

interface CurrentPlanCardProps {
  tierInfo: TierInfo;
  currentTier: number;
  hasIntelligence: boolean;
  canChangeTier: boolean;
  onChangePlan: () => void;
  onViewBillingHistory: () => void;
  planDetails?: { label: string; value: string }[];
  usage?: CurrentUsage | null;
  isUsageLoading?: boolean;
  hasUsageError?: boolean;
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

const usageItems = [
  { key: "consultations", label: "Consultations", unit: "consults" },
  { key: "users", label: "Team members", unit: "users" },
  { key: "whatsappMessages", label: "WhatsApp", unit: "msgs" },
] as const;

function formatUsageValue(value: number) {
  return value >= 999999 ? "Unlimited" : formatCountLocale(value);
}

export function CurrentPlanCard({
  tierInfo,
  currentTier: _currentTier,
  hasIntelligence,
  canChangeTier,
  onChangePlan,
  onViewBillingHistory,
  planDetails,
  usage,
  isUsageLoading,
  hasUsageError,
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
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg",
                colors.gradient,
              )}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{tierInfo.name} Plan</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                {tierInfo.description}
              </CardDescription>
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
      <CardContent className="space-y-5">
        {planDetails && planDetails.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {planDetails.map((detail, index) => {
              const DetailIcon =
                index === 0
                  ? Activity
                  : index === 1
                    ? CreditCard
                    : CalendarClock;
              return (
                <div
                  key={`${detail.label}-${detail.value}`}
                  className="rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                    <DetailIcon className="h-3.5 w-3.5" />
                    {detail.label}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {detail.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

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

        <div className="rounded-lg border border-border/70 bg-background/70 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Current usage
              </p>
              <p className="text-xs text-muted-foreground">
                Compact view of this billing period&apos;s included meters.
              </p>
            </div>
            {usage && usage.total > 0 && (
              <Badge variant="destructive" className="self-start sm:self-auto">
                Overage active
              </Badge>
            )}
          </div>

          {isUsageLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <DocitaLoadingIndicator variant="inline" decorative />
              Loading usage…
            </div>
          ) : hasUsageError ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Usage meters are temporarily unavailable.
            </p>
          ) : usage ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {usageItems.map(({ key, label, unit }) => {
                const meter = usage.meters[key];
                const percent =
                  meter.included > 0
                    ? Math.min(100, (meter.current / meter.included) * 100)
                    : 0;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatUsageValue(meter.current)} /{" "}
                        {formatUsageValue(meter.included)} {unit}
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      className={cn(
                        "h-2",
                        meter.overage > 0 && "[&>div]:bg-destructive",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Usage appears here after your clinic starts using plan meters.
            </p>
          )}
        </div>

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

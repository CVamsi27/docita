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
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import {
  formatUsageMeterCaption,
  usageMeterHasNoIncludedQuota,
  usageProgressPercentForBar,
} from "@/features/subscription/lib/usage-meter-display";

interface CurrentPlanCardProps {
  tierInfo: TierInfo;
  currentTier: number;
  hasIntelligence: boolean;
  canChangeTier: boolean;
  onChangePlan: () => void;
  onViewBillingHistory: () => void;
  /**
   * Render a banner for a scheduled plan change (e.g. "Downgrades to
   * Essential on Dec 1") with an Undo action.
   */
  scheduledChange?: {
    planName: string;
    effectiveAt: string;
    onCancel: () => void;
    isCancelling?: boolean;
  } | null;
  /**
   * Show the account credit balance the user has accumulated (held credit
   * is applied against the next invoice).
   */
  accountCreditCents?: number;
  accountCreditCurrency?: string;
  /**
   * Pay for the next billing cycle immediately (renew current plan).
   * Only rendered when provided AND the plan is renewable (paid tier).
   */
  onRenewNow?: () => void;
  /** Label override for the renew CTA, e.g. "Add payment method" when trialing. */
  renewActionLabel?: string;
  /** Shows the renew button with prominent styling (e.g. renewal imminent). */
  emphasizeRenew?: boolean;
  /** Disable renew while a checkout request is in flight. */
  isRenewProcessing?: boolean;
  planDetails?: { label: string; value: string }[];
  /** Optional note under the plan detail strip. */
  planDetailsFootnote?: string;
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
  /** When false, hides the WhatsApp usage row (e.g. Starter has no patient WhatsApp feature). */
  showWhatsAppUsageMeter?: boolean;
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
  onRenewNow,
  renewActionLabel,
  emphasizeRenew = false,
  isRenewProcessing = false,
  scheduledChange,
  accountCreditCents = 0,
  accountCreditCurrency,
  planDetails,
  planDetailsFootnote,
  usage,
  isUsageLoading,
  hasUsageError,
  statusNotice,
  showWhatsAppUsageMeter = true,
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
        {/* Action row pinned to the top of the card so payment CTAs are
            always visible without scrolling past usage meters. */}
        {canChangeTier ? (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {onRenewNow ? (
              <Button
                onClick={onRenewNow}
                disabled={isRenewProcessing}
                size="lg"
                className={cn(
                  "h-11 gap-2",
                  emphasizeRenew &&
                    "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90",
                )}
              >
                <CreditCard className="h-4 w-4" />
                {isRenewProcessing
                  ? "Opening checkout…"
                  : (renewActionLabel ?? "Pay for next cycle")}
              </Button>
            ) : null}
            <Button
              variant={onRenewNow ? "outline" : "default"}
              onClick={onChangePlan}
              size="lg"
              className="h-11 gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {onRenewNow ? "Change plan" : "Choose a plan"}
            </Button>
            <Button variant="outline" size="lg" className="h-11" onClick={onViewBillingHistory}>
              <Receipt className="mr-2 h-4 w-4" />
              Billing History
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Contact your facility administrator to change plans.
          </p>
        )}

        {scheduledChange ? (
          <div className="flex flex-col gap-3 rounded-lg border border-info/40 bg-info/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
              <div>
                <p className="font-medium text-foreground">
                  Scheduled to switch to {scheduledChange.planName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Applies on{" "}
                  {new Date(scheduledChange.effectiveAt).toLocaleDateString(
                    undefined,
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                  . Your current plan stays active until then.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scheduledChange.onCancel}
              disabled={scheduledChange.isCancelling}
              className="shrink-0"
            >
              {scheduledChange.isCancelling ? "Undoing…" : "Undo"}
            </Button>
          </div>
        ) : null}

        {accountCreditCents > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="font-medium text-foreground">
                Account credit available
              </span>
            </div>
            <span className="font-semibold tabular-nums text-success">
              {(accountCreditCurrency === "USD" ? "$" : "₹")}
              {(accountCreditCents / 100).toFixed(2)}
            </span>
          </div>
        ) : null}

        {planDetails && planDetails.length > 0 && (
          <dl className="divide-y divide-border/60 rounded-lg border border-border/70 bg-background/70">
            {planDetails.map((detail, index) => {
              const DetailIcon =
                index === 0
                  ? Activity
                  : index === 1
                    ? CreditCard
                    : index === 2
                      ? Receipt
                      : CalendarClock;
              return (
                <div
                  key={`${detail.label}-${detail.value}`}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <dt className="flex min-w-0 shrink-0 items-center gap-1.5 text-[var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
                    <DetailIcon className="h-3 w-3 shrink-0" aria-hidden />
                    {detail.label}
                  </dt>
                  <dd className="min-w-0 text-right text-[var(--fs-sm)] font-semibold text-foreground">
                    {detail.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        {planDetailsFootnote ? (
          <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
            {planDetailsFootnote}
          </p>
        ) : null}

        <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
          {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
        </p>

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
              {(showWhatsAppUsageMeter
                ? usageItems
                : usageItems.filter((row) => row.key !== "whatsappMessages")
              ).map(({ key, label, unit }) => {
                const meter = usage.meters[key];
                const noIncludedQuota = usageMeterHasNoIncludedQuota(
                  meter.included,
                );
                const percent = usageProgressPercentForBar(
                  meter.current,
                  meter.included,
                );
                const caption = formatUsageMeterCaption(
                  meter.current,
                  meter.included,
                  unit,
                  formatUsageValue,
                );
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {caption}
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      className={cn(
                        "h-2",
                        meter.overage > 0 && "[&>div]:bg-destructive",
                        noIncludedQuota &&
                          meter.overage === 0 &&
                          "[&>div]:bg-primary/35",
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

      </CardContent>
    </Card>
  );
}

"use client";

import { Activity, CalendarClock, CreditCard, Layers, LockKeyhole, Sparkles } from "lucide-react";
import { Badge, Button } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import { formatCurrency } from "@workspace/utils";
import { getClinicTimezoneOrDefault } from "@/lib/utils/clinic-timezone";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import type { CurrentPlanCardProps } from "./current-plan-card-types";

/**
 * Map a plan-detail row to a semantically matching icon. The "period" row label
 * varies (Renews On / Trial Ends / Ends On / Access through), so anything that
 * isn't a known fixed label falls back to the calendar icon.
 */
function planDetailIcon(label: string) {
  switch (label.toLowerCase()) {
    case "plan":
      return Layers;
    case "status":
      return Activity;
    case "billing":
      return CreditCard;
    default:
      return CalendarClock;
  }
}

export function CurrentPlanCardMeta({
  scheduledChange,
  accountCreditCents = 0,
  accountCreditCurrency,
  planDetails,
  planDetailsFootnote,
  statusNotice,
}: Pick<
  CurrentPlanCardProps,
  | "scheduledChange"
  | "accountCreditCents"
  | "accountCreditCurrency"
  | "planDetails"
  | "planDetailsFootnote"
  | "statusNotice"
>) {
  const clinicTimezone = getClinicTimezoneOrDefault(useOptionalClinic()?.clinic);
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
    <>
      {scheduledChange ? (
        <div className="flex flex-col gap-3 rounded-lg border border-info/40 bg-info/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <CalendarClock
              className="mt-0.5 h-4 w-4 shrink-0 text-info"
              aria-hidden
            />
            <div>
              <p className="font-medium text-foreground">
                Scheduled to switch to {scheduledChange.planName}
              </p>
              <p className="text-xs text-muted-foreground">
                Applies on{" "}
                {formatLocaleDateShortMonthYear(
                  scheduledChange.effectiveAt,
                  clinicTimezone,
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
            {formatCurrency(accountCreditCents / 100, {
              currency: accountCreditCurrency,
              fractionDigits: 2,
            })}
          </span>
        </div>
      ) : null}

      {planDetails && planDetails.length > 0 ? (
        <dl className="divide-y divide-border/60 rounded-lg border border-border/70 bg-background/70">
          {planDetails.map((detail) => {
            const DetailIcon = planDetailIcon(detail.label);
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
      ) : null}

      {planDetailsFootnote ? (
        <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
          {planDetailsFootnote}
        </p>
      ) : null}

      <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
        {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
      </p>

      {statusNotice ? (
        <div className={cn("rounded-lg border p-3", statusNoticeClassName)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {statusNotice.variant === "destructive" ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : null}
                <p className="text-sm font-semibold">{statusNotice.title}</p>
                {statusNotice.badgeLabel ? (
                  <Badge variant="outline" className="text-[var(--fs-2xs)]">
                    {statusNotice.badgeLabel}
                  </Badge>
                ) : null}
              </div>
              <p className={cn("text-sm", statusDescriptionClassName)}>
                {statusNotice.description}
              </p>
            </div>
            {statusNotice.actionLabel && statusNotice.onAction ? (
              <Button
                size="sm"
                variant="outline"
                onClick={statusNotice.onAction}
                className="self-start sm:self-auto"
              >
                {statusNotice.actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

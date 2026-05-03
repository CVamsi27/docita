"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useCurrentUsage } from "@/hooks/api/use-pricing";
import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
  type SupportedCurrency,
} from "@workspace/types";
import { formatAmountLocale, formatCountLocale } from "@workspace/utils";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import {
  formatLocaleDateShortMonth,
  formatLocaleDateShortMonthYear,
} from "@/lib/formatters";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  formatUsageMeterCaption,
  usageMeterHasNoIncludedQuota,
  usageProgressPercentForBar,
} from "@/features/subscription/lib/usage-meter-display";

interface UsageMeterProps {
  label: string;
  current: number;
  included: number;
  overage: number;
  unit: string;
  overageRate?: number;
  currencySymbol?: string;
  amountLocale: string;
  amountFractionDigits: number;
}

function UsageMeter({
  label,
  current,
  included,
  overage,
  unit,
  overageRate,
  currencySymbol = "",
  amountLocale,
  amountFractionDigits,
}: UsageMeterProps) {
  const noIncludedQuota = usageMeterHasNoIncludedQuota(included);
  const pct = usageProgressPercentForBar(current, included);
  const isOver = overage > 0;
  const isWarning =
    included > 0 && pct >= 80 && !isOver;
  const caption = formatUsageMeterCaption(current, included, unit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {isOver && (
            <Badge variant="destructive" className="text-xs h-5">
              +{formatCountLocale(overage)} over
            </Badge>
          )}
          {isWarning && (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          )}
          <span className={cn("text-muted-foreground", isOver && "text-destructive")}>
            {caption}
          </span>
        </div>
      </div>
      <Progress
        value={pct}
        className={cn(
          "h-2",
          isOver && "[&>div]:bg-destructive",
          isWarning && "[&>div]:bg-warning",
          noIncludedQuota &&
            !isOver &&
            !isWarning &&
            "[&>div]:bg-primary/35",
        )}
      />
      {isOver && overageRate !== undefined && (
        <p className="text-xs text-destructive">
          {currencySymbol}
          {formatAmountLocale(overage * overageRate, amountLocale, {
            minimumFractionDigits: amountFractionDigits,
            maximumFractionDigits: amountFractionDigits,
          })}{" "}
          overage this period ({formatCountLocale(overage)} × {currencySymbol}
          {formatAmountLocale(overageRate, amountLocale, {
            minimumFractionDigits: amountFractionDigits,
            maximumFractionDigits: amountFractionDigits,
          })}
          /{unit})
        </p>
      )}
    </div>
  );
}

export function UsageDashboard() {
  const { usage, isLoading } = useCurrentUsage();
  const { currency, locale } = useClinicCurrency();
  const currencyCfg = PRICING_CURRENCY_CONFIG[currency as SupportedCurrency];
  const amountFractionDigits = currencyCfg?.decimalPlaces ?? 2;
  const amountLocale = currencyCfg?.locale ?? locale;
  const symbol =
    PRICING_CURRENCY_SYMBOLS[
      currency as keyof typeof PRICING_CURRENCY_SYMBOLS
    ] ?? currency;

  if (isLoading) {
    return (
      <div
        className="flex justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading usage"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  if (!usage) return null;

  const totalOverageCost = usage.total;
  const warningEntries = Object.entries(usage.warnings).filter(
    ([, warning]) => warning.threshold !== null,
  );

  const periodStart = formatLocaleDateShortMonth(usage.period.start);
  const periodEnd = formatLocaleDateShortMonthYear(usage.period.end);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              This Period&apos;s Usage
            </CardTitle>
            <CardDescription>{periodStart} – {periodEnd}</CardDescription>
          </div>
          {totalOverageCost > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Estimated overage</p>
              <p className="text-sm font-semibold text-destructive">
                {symbol}
                {formatAmountLocale(totalOverageCost, amountLocale, {
                  minimumFractionDigits: amountFractionDigits,
                  maximumFractionDigits: amountFractionDigits,
                })}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {warningEntries.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            {warningEntries.some(([, warning]) => warning.threshold === 100)
              ? "You have reached 100% of one or more limits. You can continue using the app; overage will be billed at cycle close."
              : "You are above 80% of one or more limits. Consider upgrading to avoid overage charges this cycle."}
          </div>
        )}
        <UsageMeter
          label="Consultations"
          current={usage.meters.consultations.current}
          included={usage.meters.consultations.included}
          overage={usage.meters.consultations.overage}
          unit="consults"
          overageRate={usage.rates.consultations}
          currencySymbol={symbol}
          amountLocale={amountLocale}
          amountFractionDigits={amountFractionDigits}
        />
        <UsageMeter
          label="Team Members"
          current={usage.meters.users.current}
          included={usage.meters.users.included}
          overage={usage.meters.users.overage}
          unit="users"
          overageRate={usage.rates.users}
          currencySymbol={symbol}
          amountLocale={amountLocale}
          amountFractionDigits={amountFractionDigits}
        />
        <UsageMeter
          label="WhatsApp Messages"
          current={usage.meters.whatsappMessages.current}
          included={usage.meters.whatsappMessages.included}
          overage={usage.meters.whatsappMessages.overage}
          unit="msgs"
          overageRate={usage.rates.whatsappMessages}
          currencySymbol={symbol}
          amountLocale={amountLocale}
          amountFractionDigits={amountFractionDigits}
        />
        {totalOverageCost === 0 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            All usage within included quota — no overage charges.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

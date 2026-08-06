"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { formatCountLocale, formatAmountLocale } from "@workspace/utils";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { formatUsageMeterCaption, usageMeterHasNoIncludedQuota, usageProgressPercentForBar } from "@/features/subscription/lib/usage-meter-display";

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
  const isWarning = included > 0 && pct >= 80 && !isOver;
  const caption = formatUsageMeterCaption(current, included, unit, formatCountLocale);
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
          {isWarning && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
          <span
            className={cn(
              "text-muted-foreground",
              isOver && "text-destructive",
            )}
          >
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
          noIncludedQuota && !isOver && !isWarning && "[&>div]:bg-primary/35",
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
export function UsageDashboardLoading() {
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

interface UsageDashboardWarningProps {
  hasThresholdWarning: boolean;
}

function UsageDashboardWarning({
  hasThresholdWarning,
}: UsageDashboardWarningProps) {
  return (
    <div className="surface-warning rounded-md px-3 py-2 text-xs">
      {hasThresholdWarning
        ? "You have reached 100% of one or more limits. You can continue using the app; overage will be billed at cycle close."
        : "You are above 80% of one or more limits. Consider upgrading to avoid overage charges this cycle."}
    </div>
  );
}

interface UsageDashboardMetersPanelProps {
  periodStart: string;
  periodEnd: string;
  totalOverageCost: number;
  symbol: string;
  amountLocale: string;
  amountFractionDigits: number;
  meters: {
    consultations: { current: number; included: number; overage: number };
    users: { current: number; included: number; overage: number };
    aiCredits: { current: number; included: number; overage: number };
    whatsappMessages: { current: number; included: number; overage: number };
  };
  rates: {
    consultations: number;
    users: number;
    aiCredits: number;
    whatsappMessages: number;
  };
  showWhatsAppMeter: boolean;
  warningEntries: Array<[string, { threshold: number | null }]>;
}

export function UsageDashboardMetersPanel({
  periodStart,
  periodEnd,
  totalOverageCost,
  symbol,
  amountLocale,
  amountFractionDigits,
  meters,
  rates,
  showWhatsAppMeter,
  warningEntries,
}: UsageDashboardMetersPanelProps) {
  const base = {
    currencySymbol: symbol,
    amountLocale,
    amountFractionDigits,
  } as const;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              This Period&apos;s Usage
            </CardTitle>
            <CardDescription>
              {periodStart} – {periodEnd}
            </CardDescription>
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
          <UsageDashboardWarning
            hasThresholdWarning={warningEntries.some(
              ([, warning]) => warning.threshold === 100,
            )}
          />
        )}
        <UsageMeter
          label="Consultations"
          current={meters.consultations.current}
          included={meters.consultations.included}
          overage={meters.consultations.overage}
          unit="consults"
          overageRate={rates.consultations}
          {...base}
        />
        <UsageMeter
          label="Team members"
          current={meters.users.current}
          included={meters.users.included}
          overage={meters.users.overage}
          unit="users"
          overageRate={rates.users}
          {...base}
        />
        {meters.aiCredits.included > 0 ? (
          <UsageMeter
            label="AI credits"
            current={meters.aiCredits.current}
            included={meters.aiCredits.included}
            overage={meters.aiCredits.overage}
            unit="credits"
            overageRate={rates.aiCredits}
            {...base}
          />
        ) : null}
        {showWhatsAppMeter ? (
          <UsageMeter
            label="WhatsApp Messages"
            current={meters.whatsappMessages.current}
            included={meters.whatsappMessages.included}
            overage={meters.whatsappMessages.overage}
            unit="msgs"
            overageRate={rates.whatsappMessages}
            {...base}
          />
        ) : (
          <p className="text-[var(--fs-xs)] text-muted-foreground">
            Patient WhatsApp messaging is not included on Starter. Upgrade to
            Essential or higher to enable sends and message metering.
          </p>
        )}
        {totalOverageCost === 0 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            All usage within included quota — no overage charges.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

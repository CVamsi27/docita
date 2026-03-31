"use client";

import { useCurrentUsage } from "@/hooks/api/use-pricing";
import { PRICING_CURRENCY_SYMBOLS } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface UsageMeterProps {
  label: string;
  current: number;
  included: number;
  overage: number;
  unit: string;
  overageRate?: number;
  currencySymbol?: string;
}

function UsageMeter({
  label,
  current,
  included,
  overage,
  unit,
  overageRate,
  currencySymbol = "₹",
}: UsageMeterProps) {
  const pct = included > 0 ? Math.min(100, (current / included) * 100) : 0;
  const isOver = overage > 0;
  const isWarning = pct >= 80 && !isOver;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {isOver && (
            <Badge variant="destructive" className="text-xs h-5">
              +{overage} over
            </Badge>
          )}
          {isWarning && (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          )}
          <span className={cn("text-muted-foreground", isOver && "text-destructive")}>
            {current.toLocaleString()} / {included.toLocaleString()} {unit}
          </span>
        </div>
      </div>
      <Progress
        value={pct}
        className={cn(
          "h-2",
          isOver && "[&>div]:bg-destructive",
          isWarning && "[&>div]:bg-warning",
        )}
      />
      {isOver && overageRate !== undefined && (
        <p className="text-xs text-destructive">
          {currencySymbol}{(overage * overageRate).toLocaleString()} overage this period ({overage} × {currencySymbol}{overageRate}/{unit})
        </p>
      )}
    </div>
  );
}

export function UsageDashboard() {
  const { usage, isLoading } = useCurrentUsage();
  const { currency } = useLocaleCurrency();
  const symbol =
    PRICING_CURRENCY_SYMBOLS[
      currency as keyof typeof PRICING_CURRENCY_SYMBOLS
    ] ?? "₹";

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usage) return null;

  const totalOverageCost = usage.total;
  const warningEntries = Object.entries(usage.warnings).filter(
    ([, warning]) => warning.threshold !== null,
  );

  const periodStart = new Date(usage.period.start).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const periodEnd = new Date(usage.period.end).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
                {symbol}{totalOverageCost.toLocaleString()}
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
        />
        <UsageMeter
          label="Team Members"
          current={usage.meters.users.current}
          included={usage.meters.users.included}
          overage={usage.meters.users.overage}
          unit="users"
          overageRate={usage.rates.users}
          currencySymbol={symbol}
        />
        <UsageMeter
          label="WhatsApp Messages"
          current={usage.meters.whatsappMessages.current}
          included={usage.meters.whatsappMessages.included}
          overage={usage.meters.whatsappMessages.overage}
          unit="msgs"
          overageRate={usage.rates.whatsappMessages}
          currencySymbol={symbol}
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

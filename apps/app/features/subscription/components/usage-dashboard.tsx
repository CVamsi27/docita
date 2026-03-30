"use client";

import { useCurrentUsage } from "@/hooks/api/use-pricing";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  TIER_OVERAGE_RATES_BY_CURRENCY,
  PRICING_CURRENCY_SYMBOLS,
} from "@workspace/types";
import type { SupportedCurrency } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { getTierName } from "@workspace/types";
import type { TierName } from "@workspace/types";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

const WHATSAPP_OVERAGE_RATES: Record<
  SupportedCurrency,
  Record<TierName, number>
> = {
  INR: {
    STARTER: 0,
    ESSENTIAL: 0.75,
    PROFESSIONAL: 0.5,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  USD: {
    STARTER: 0,
    ESSENTIAL: 0.02,
    PROFESSIONAL: 0.01,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  EUR: {
    STARTER: 0,
    ESSENTIAL: 0.02,
    PROFESSIONAL: 0.01,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  GBP: {
    STARTER: 0,
    ESSENTIAL: 0.015,
    PROFESSIONAL: 0.008,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  AUD: {
    STARTER: 0,
    ESSENTIAL: 0.03,
    PROFESSIONAL: 0.015,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  CAD: {
    STARTER: 0,
    ESSENTIAL: 0.025,
    PROFESSIONAL: 0.013,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  SGD: {
    STARTER: 0,
    ESSENTIAL: 0.025,
    PROFESSIONAL: 0.013,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  AED: {
    STARTER: 0,
    ESSENTIAL: 0.07,
    PROFESSIONAL: 0.04,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
  ZAR: {
    STARTER: 0,
    ESSENTIAL: 0.35,
    PROFESSIONAL: 0.2,
    ENTERPRISE: 0,
    INTELLIGENCE: 0,
  },
};

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
  const { currentTier } = usePermissionStore();
  const { currency } = useLocaleCurrency();

  const tierName = getTierName(currentTier) as TierName;
  const rates =
    TIER_OVERAGE_RATES_BY_CURRENCY[
      currency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY
    ]?.[tierName] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
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

  const {
    activePatients,
    appointments,
    users,
    prescriptions,
    invoices,
    whatsappMessages,
  } = usage.usage;

  const totalOverageCost =
    activePatients.overage * (rates?.patientRate ?? 0) +
    appointments.overage * (rates?.appointmentRate ?? 0) +
    users.overage * (rates?.userRate ?? 0) +
    prescriptions.overage * (rates?.prescriptionRate ?? 0) +
    invoices.overage * (rates?.invoiceRate ?? 0) +
    whatsappMessages.overage *
      (WHATSAPP_OVERAGE_RATES[currency as SupportedCurrency]?.[tierName] ??
        WHATSAPP_OVERAGE_RATES.INR[tierName]);

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
        <UsageMeter
          label="Active Patients"
          current={activePatients.current}
          included={activePatients.included}
          overage={activePatients.overage}
          unit="patients"
          overageRate={rates?.patientRate}
          currencySymbol={symbol}
        />
        <UsageMeter
          label="Consultations"
          current={appointments.current}
          included={appointments.included}
          overage={appointments.overage}
          unit="consults"
          overageRate={rates?.appointmentRate}
          currencySymbol={symbol}
        />
        <UsageMeter
          label="Prescriptions"
          current={prescriptions.current}
          included={prescriptions.included}
          overage={prescriptions.overage}
          unit="scripts"
          currencySymbol={symbol}
        />
        <UsageMeter
          label="Invoices"
          current={invoices.current}
          included={invoices.included}
          overage={invoices.overage}
          unit="invoices"
          currencySymbol={symbol}
        />
        <UsageMeter
          label="Team Members"
          current={users.current}
          included={users.included}
          overage={users.overage}
          unit="users"
          overageRate={rates?.userRate}
          currencySymbol={symbol}
        />
        {whatsappMessages.addOnActive && (
            <UsageMeter
              label="WhatsApp Messages"
              current={whatsappMessages.current}
              included={whatsappMessages.included}
              overage={whatsappMessages.overage}
              unit="msgs"
              overageRate={
                WHATSAPP_OVERAGE_RATES[currency as SupportedCurrency]?.[tierName] ??
                WHATSAPP_OVERAGE_RATES.INR[tierName]
              }
              currencySymbol={symbol}
            />
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

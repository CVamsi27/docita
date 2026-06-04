"use client";

import { useCurrentUsage } from "@/features/subscription/hooks/use-pricing";
import {
  PRICING_CURRENCY_CONFIG,
  PRICING_CURRENCY_SYMBOLS,
} from "@workspace/types";
import { parseSupportedCurrency } from "@workspace/utils";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  formatLocaleDateShortMonth,
  formatLocaleDateShortMonthYear,
} from "@/lib/formatters";
import {
  UsageDashboardLoading,
  UsageDashboardMetersPanel,
} from "./usage-dashboard-sections";

export function UsageDashboard() {
  const { usage, isLoading } = useCurrentUsage();
  const { currency, locale } = useClinicCurrency();
  const canAccess = usePermissionStore((state) => state.canAccess);
  const showWhatsAppMeter = canAccess("WHATSAPP_MESSAGING");
  const resolvedCurrency = parseSupportedCurrency(currency);
  const currencyCfg = PRICING_CURRENCY_CONFIG[resolvedCurrency];
  const amountFractionDigits = currencyCfg?.decimalPlaces ?? 2;
  const amountLocale = currencyCfg?.locale ?? locale;
  const symbol = PRICING_CURRENCY_SYMBOLS[resolvedCurrency] ?? resolvedCurrency;

  if (isLoading) return <UsageDashboardLoading />;
  if (!usage) return null;

  const totalOverageCost = usage.total;
  const warningEntries = Object.entries(usage.warnings).filter(
    ([, warning]) => warning.threshold !== null,
  );
  const periodStart = formatLocaleDateShortMonth(usage.period.start);
  const periodEnd = formatLocaleDateShortMonthYear(usage.period.end);

  return (
    <UsageDashboardMetersPanel
      periodStart={periodStart}
      periodEnd={periodEnd}
      totalOverageCost={totalOverageCost}
      symbol={symbol}
      amountLocale={amountLocale}
      amountFractionDigits={amountFractionDigits}
      meters={usage.meters}
      rates={usage.rates}
      showWhatsAppMeter={showWhatsAppMeter}
      warningEntries={warningEntries}
    />
  );
}

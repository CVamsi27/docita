"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/indicators/card";
import { PRICING_CURRENCY_CONFIG, PRICING_CURRENCY_SYMBOLS, type SupportedCurrency } from "@workspace/types";
import { formatAmountLocale } from "@workspace/utils";
import { Calculator } from "lucide-react";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { UsageSliders, BillBreakdownCard, UpgradeSuggestion } from "./usage-pricing-calculator-sections";
import { type UsageInput, DEFAULT_USAGE, calculateBill, exceedsProLimits } from "./usage-pricing-calculator-helpers";

interface UsagePricingCalculatorProps {
  currency?: SupportedCurrency;
}

export function UsagePricingCalculator({
  currency,
}: UsagePricingCalculatorProps) {
  const [usage, setUsage] = useState<UsageInput>(DEFAULT_USAGE);
  const { currency: detectedCurrency } = useLocaleCurrency();
  const resolvedCurrency = currency ?? detectedCurrency;
  const symbol = PRICING_CURRENCY_SYMBOLS[resolvedCurrency] ?? resolvedCurrency;
  const currencyFmt = PRICING_CURRENCY_CONFIG[resolvedCurrency];
  const fmtMoney = (value: number) =>
    formatAmountLocale(value, currencyFmt.locale, {
      minimumFractionDigits: currencyFmt.decimalPlaces,
      maximumFractionDigits: currencyFmt.decimalPlaces,
    });
  const proBill = calculateBill(usage, "ESSENTIAL", resolvedCurrency);
  const clinicBill = calculateBill(usage, "PROFESSIONAL", resolvedCurrency);
  const showClinicSuggestion = exceedsProLimits(usage, resolvedCurrency);

  const setField = (key: keyof UsageInput, value: number) =>
    setUsage((prev) => ({ ...prev, [key]: value }));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Estimate Your Monthly Bill
        </CardTitle>
        <CardDescription>
          Adjust the sliders to match your facility&apos;s usage. You only pay
          for what you use beyond the included quota.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <UsageSliders usage={usage} onChange={setField} />

          <div className="space-y-4">
            {showClinicSuggestion ? (
              <UpgradeSuggestion
                proBill={proBill}
                clinicBill={clinicBill}
                symbol={symbol}
                fmtMoney={fmtMoney}
              />
            ) : (
              <BillBreakdownCard
                bill={proBill}
                tierLabel="Essential"
                symbol={symbol}
                fmtMoney={fmtMoney}
                highlight={false}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

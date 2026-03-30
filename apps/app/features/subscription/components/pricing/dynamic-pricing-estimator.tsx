"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { useDebounce } from "@workspace/hooks";
import type { SupportedCurrency, TierName } from "@workspace/types";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@workspace/utils";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  DEFAULT_PRICING_USAGE_INPUTS,
  PRICING_ESTIMATE_DEBOUNCE_MS,
  PRICING_ESTIMATOR_TIERS,
} from "@/features/subscription/config/pricing-config";
import {
  type EstimateUsageInputs,
  useEstimate,
  usePricingConfig,
} from "@/hooks/api/use-pricing";

function EstimateRow({
  label,
  value,
  indent,
  sublabel,
}: {
  label: string;
  value: string;
  indent?: boolean;
  sublabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-2.5 text-sm",
        indent && "pl-9 text-muted-foreground",
        sublabel && "text-muted-foreground font-medium",
      )}
    >
      <span>{label}</span>
      <span className={cn(!indent && !sublabel && "font-medium")}>{value}</span>
    </div>
  );
}

interface DynamicPricingEstimatorProps {
  defaultTier?: TierName;
  currency?: SupportedCurrency;
  billingCycle?: "monthly" | "yearly";
  showCurrencySelector?: boolean;
  showBillingSelector?: boolean;
  onUsageChange?: (usage: EstimateUsageInputs) => void;
}

export function DynamicPricingEstimator({
  defaultTier = "ESSENTIAL",
  currency,
  billingCycle: controlledBillingCycle,
  showCurrencySelector = true,
  showBillingSelector = true,
  onUsageChange,
}: DynamicPricingEstimatorProps) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [tier, setTier] = useState(defaultTier);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>(currency ?? detectedCurrency);
  const [localBillingCycle, setLocalBillingCycle] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [patients, setPatients] = useState(DEFAULT_PRICING_USAGE_INPUTS.patients);
  const [appointments, setAppointments] = useState(DEFAULT_PRICING_USAGE_INPUTS.appointments);
  const [users, setUsers] = useState(DEFAULT_PRICING_USAGE_INPUTS.users);

  const { pricingConfig } = usePricingConfig(selectedCurrency);

  useEffect(() => {
    setTier(defaultTier);
  }, [defaultTier]);

  useEffect(() => {
    setSelectedCurrency(currency ?? detectedCurrency);
  }, [currency, detectedCurrency]);

  useEffect(() => {
    if (controlledBillingCycle) {
      setLocalBillingCycle(controlledBillingCycle);
    }
  }, [controlledBillingCycle]);

  const effectiveBillingCycle = controlledBillingCycle ?? localBillingCycle;

  useEffect(() => {
    onUsageChange?.({
      patients,
      appointments,
      users,
      whatsapp: false,
      whatsappMessages: 0,
      intelligence: false,
      aiCredits: 0,
    });
  }, [patients, appointments, users, onUsageChange]);

  const estimateParams = useMemo(
    () => ({
      tier,
      currency: selectedCurrency,
      billingCycle: effectiveBillingCycle,
      patients,
      appointments,
      users,
      whatsapp: false,
      whatsappMessages: 0,
      intelligence: false,
      aiCredits: 0,
    }),
    [tier, selectedCurrency, effectiveBillingCycle, patients, appointments, users],
  );

  const debouncedEstimateParams = useDebounce(
    estimateParams,
    PRICING_ESTIMATE_DEBOUNCE_MS,
  );

  const { estimate, isLoading } = useEstimate(debouncedEstimateParams);

  const tiers = (pricingConfig?.tiers || [])
    .map((tierInfo) => tierInfo.id)
    .filter((tierInfo) =>
      PRICING_ESTIMATOR_TIERS.includes(tierInfo as TierName),
    );

  const hasDetailedEstimate =
    !!estimate &&
    typeof estimate.totalMonthly === "number" &&
    typeof estimate.totalYearly === "number" &&
    !!estimate.breakdown;

  const shownTotal =
    hasDetailedEstimate && estimate
      ? effectiveBillingCycle === "yearly"
        ? estimate.totalYearly
        : estimate.totalMonthly
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate My Cost</CardTitle>
        <CardDescription>
          Your base plan price is fixed. This estimator calculates any additional charges
          if your usage exceeds the plan limits. All prices include 18% GST.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={tier} onValueChange={(value) => setTier(value as TierName)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tierName) => (
                  <SelectItem key={tierName} value={tierName}>
                    {tierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showBillingSelector && (
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                value={effectiveBillingCycle}
                onValueChange={(value) =>
                  setLocalBillingCycle(value as "monthly" | "yearly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (2 months free)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showCurrencySelector && (
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value) =>
                  setSelectedCurrency(value as SupportedCurrency)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pricingConfig?.supportedCurrencies || [
                    {
                      code: DEFAULT_CURRENCY,
                      symbol:
                        CURRENCY_OPTIONS.find(
                          (option) => option.value === DEFAULT_CURRENCY,
                        )?.symbol ?? DEFAULT_CURRENCY,
                      name:
                        CURRENCY_OPTIONS.find(
                          (option) => option.value === DEFAULT_CURRENCY,
                        )?.label ?? DEFAULT_CURRENCY,
                    },
                  ]).map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.symbol} {item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Expected Patients</Label>
            <Input
              type="number"
              min={0}
              value={patients}
              onChange={(e) => setPatients(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Consultations / Month</Label>
            <Input
              type="number"
              min={0}
              value={appointments}
              onChange={(e) => setAppointments(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Team Members</Label>
            <Input
              type="number"
              min={1}
              value={users}
              onChange={(e) => setUsers(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          WhatsApp and AI are now included in the plan experience. This
          estimator focuses on tier price plus usage overage for patients,
          appointments, and team size.
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your Estimate
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {effectiveBillingCycle === "yearly" ? "Billed annually" : "Billed monthly"}
              </p>
            </div>
            {isLoading ? (
              <Badge variant="outline" className="animate-pulse">
                Calculating...
              </Badge>
            ) : shownTotal !== null && estimate ? (
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">
                  {estimate.currency.symbol}
                  {shownTotal.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  /{effectiveBillingCycle === "yearly" ? "yr" : "mo"}
                </span>
              </div>
            ) : (
              <Badge variant="outline">Contact sales</Badge>
            )}
          </div>

          {!isLoading && hasDetailedEstimate && estimate && (
            <div className="divide-y bg-muted/10">
              <EstimateRow
                label="Base plan"
                value={`${estimate.currency.symbol}${estimate.breakdown.basePrice.toLocaleString()}`}
              />
              {estimate.breakdown.overageTotal > 0 && (
                <EstimateRow
                  label="Usage overage"
                  value={`${estimate.currency.symbol}${estimate.breakdown.overageTotal.toLocaleString()}`}
                  sublabel
                />
              )}
              {estimate.breakdown.overages.patients.charge > 0 && (
                <EstimateRow
                  label="Patients overage"
                  value={`${estimate.currency.symbol}${estimate.breakdown.overages.patients.charge.toLocaleString()}`}
                  indent
                />
              )}
              {estimate.breakdown.overages.appointments.charge > 0 && (
                <EstimateRow
                  label="Consultations overage"
                  value={`${estimate.currency.symbol}${estimate.breakdown.overages.appointments.charge.toLocaleString()}`}
                  indent
                />
              )}
              {estimate.breakdown.overages.users.charge > 0 && (
                <EstimateRow
                  label="Team overage"
                  value={`${estimate.currency.symbol}${estimate.breakdown.overages.users.charge.toLocaleString()}`}
                  indent
                />
              )}
              <div className="px-5 py-3 bg-card">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly total</span>
                  <span className="font-semibold">
                    {estimate.currency.symbol}
                    {estimate.totalMonthly.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1.5">
                  <span className="text-muted-foreground">Yearly total (2 months free)</span>
                  <span className="font-semibold">
                    {estimate.currency.symbol}
                    {estimate.totalYearly.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !hasDetailedEstimate && estimate && (
            <div className="px-5 py-4 text-sm text-muted-foreground bg-muted/10">
              Enterprise pricing is custom. Contact sales for commercial terms.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import {
  TIER_PRICING_BY_CURRENCY,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  PRICING_CURRENCY_SYMBOLS,
  TIER_LIMITS,
} from "@workspace/types";
import type { SupportedCurrency } from "@workspace/types";
import { Calculator, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";

interface UsagePricingCalculatorProps {
  currency?: SupportedCurrency;
}

interface UsageInput {
  patients: number;
  appointments: number;
  users: number;
  invoices: number;
  prescriptions: number;
  whatsappMessages: number;
}

const DEFAULT_USAGE: UsageInput = {
  patients: 500,
  appointments: 800,
  users: 2,
  invoices: 100,
  prescriptions: 200,
  whatsappMessages: 200,
};

const SLIDERS = [
  { key: "patients" as const, label: "Active Patients", min: 0, max: 10000, step: 100, unit: "patients" },
  { key: "appointments" as const, label: "Appointments / month", min: 0, max: 20000, step: 100, unit: "appts" },
  { key: "users" as const, label: "Team Members", min: 1, max: 50, step: 1, unit: "users" },
  { key: "invoices" as const, label: "Invoices / month", min: 0, max: 5000, step: 50, unit: "invoices" },
  { key: "prescriptions" as const, label: "Prescriptions / month", min: 0, max: 10000, step: 50, unit: "scripts" },
  { key: "whatsappMessages" as const, label: "WhatsApp Messages / month", min: 0, max: 10000, step: 100, unit: "msgs" },
];

interface BillResult {
  base: number;
  overageBreakdown: { label: string; units: number; rate: number; cost: number }[];
  overageTotal: number;
  total: number;
  whatsappIncluded: number;
  whatsappOverageRate: number;
}

function calculateBill(
  usage: UsageInput,
  tierKey: "ESSENTIAL" | "PROFESSIONAL",
  currency: SupportedCurrency,
): BillResult {
  const base = (TIER_PRICING_BY_CURRENCY[currency]?.[tierKey]?.monthly as number) ?? 0;
  const rates = TIER_OVERAGE_RATES_BY_CURRENCY[currency]?.[tierKey] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierKey];
  const limits = TIER_LIMITS[tierKey];
  const whatsappIncluded = tierKey === "PROFESSIONAL" ? 2000 : 500;
  const whatsappOverageRate = tierKey === "PROFESSIONAL" ? 0.3 : 0.5;

  const overageBreakdown: { label: string; units: number; rate: number; cost: number }[] = [];

  const addOverage = (label: string, current: number, included: number, rate: number) => {
    const units = Math.max(0, current - included);
    if (units > 0) overageBreakdown.push({ label, units, rate, cost: units * rate });
  };

  addOverage("Patients", usage.patients, limits.patients, rates.patientRate);
  addOverage("Appointments", usage.appointments, limits.appointments ?? 2000, rates.appointmentRate);
  addOverage("Users", usage.users, limits.users ?? 5, rates.userRate);
  addOverage("Invoices", usage.invoices, limits.invoices ?? 500, rates.invoiceRate);
  addOverage("Prescriptions", usage.prescriptions, limits.prescriptions ?? 1000, rates.prescriptionRate);
  addOverage("WhatsApp", usage.whatsappMessages, whatsappIncluded, whatsappOverageRate);

  const overageTotal = overageBreakdown.reduce((sum, o) => sum + o.cost, 0);
  return { base, overageBreakdown, overageTotal, total: base + overageTotal, whatsappIncluded, whatsappOverageRate };
}

function exceedsProLimits(usage: UsageInput): boolean {
  const limits = TIER_LIMITS.ESSENTIAL;
  return (
    usage.patients > limits.patients ||
    usage.appointments > (limits.appointments ?? 2000) ||
    usage.users > (limits.users ?? 5) ||
    usage.whatsappMessages > 500
  );
}

export function UsagePricingCalculator({ currency }: UsagePricingCalculatorProps) {
  const [usage, setUsage] = useState<UsageInput>(DEFAULT_USAGE);
  const router = useRouter();
  const { currency: detectedCurrency } = useLocaleCurrency();
  const resolvedCurrency = currency ?? detectedCurrency;
  const symbol = PRICING_CURRENCY_SYMBOLS[resolvedCurrency] ?? "₹";
  const proBill = calculateBill(usage, "ESSENTIAL", resolvedCurrency);
  const clinicBill = calculateBill(usage, "PROFESSIONAL", resolvedCurrency);
  const showClinicSuggestion = exceedsProLimits(usage);

  const setField = (key: keyof UsageInput, value: number) =>
    setUsage((prev) => ({ ...prev, [key]: value }));

  const renderBreakdown = (bill: BillResult, tierLabel: string, highlight: boolean) => (
    <div className={`flex flex-col gap-3 rounded-xl p-4 border ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tierLabel}</span>
        {highlight && <Badge variant="default" className="text-xs">Recommended</Badge>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Base plan</span>
        <span className="text-sm font-medium">{symbol}{bill.base.toLocaleString()}/mo</span>
      </div>

      {bill.overageBreakdown.length > 0 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usage overage</p>
          {bill.overageBreakdown.map((o) => (
            <div key={o.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {o.label} ({o.units.toLocaleString()} × {symbol}{o.rate})
              </span>
              <span className="font-medium text-warning">
                +{symbol}{Math.round(o.cost).toLocaleString()}
              </span>
            </div>
          ))}
        </>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Estimated total</span>
        <div className="text-right">
          <span className="text-xl font-bold">{symbol}{Math.round(bill.total).toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      </div>

      {bill.overageTotal === 0 ? (
        <Badge variant="secondary" className="self-start text-xs">All within included quota</Badge>
      ) : (
        <p className="text-xs text-muted-foreground">Overage billed at month-end based on actual usage.</p>
      )}
    </div>
  );

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          Estimate Your Monthly Bill
        </CardTitle>
        <CardDescription>
          Adjust the sliders to match your clinic&apos;s usage. You only pay for what you use beyond the included quota.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sliders */}
          <div className="space-y-5">
            {SLIDERS.map(({ key, label, min, max, step, unit }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {usage[key].toLocaleString()} {unit}
                  </span>
                </div>
                <Slider
                  min={min}
                  max={max}
                  step={step}
                  value={[usage[key]]}
                  onValueChange={([v]) => setField(key, v)}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Bill breakdown(s) */}
          <div className="space-y-4">
            {showClinicSuggestion ? (
              <>
                {renderBreakdown(proBill, "Docita Pro", false)}
                {renderBreakdown(clinicBill, "Docita Clinic", true)}
                <p className="text-xs text-muted-foreground text-center">
                  Docita Clinic has higher quotas and lower per-unit overage rates — saving you{" "}
                  <span className="font-medium text-foreground">
                    {symbol}{Math.max(0, Math.round(proBill.total - clinicBill.total)).toLocaleString()}/mo
                  </span>{" "}
                  at this usage level.
                </p>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => router.push("/upgrade?tier=PROFESSIONAL")}
                >
                  Upgrade to Clinic <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              renderBreakdown(proBill, "Docita Pro", false)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

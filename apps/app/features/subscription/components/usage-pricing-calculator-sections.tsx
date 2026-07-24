"use client";

import { Badge, Button, Label, Separator, Slider } from "@workspace/ui/components";
import { formatCountLocale } from "@workspace/utils";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { subscriptionSettingsHref } from "@/lib/subscription/subscription-settings-path";
import type { BillResult, UsageInput } from "./usage-pricing-calculator-helpers";
import { SLIDERS } from "./usage-pricing-calculator-helpers";

// ---------------------------------------------------------------------------
// UsageSliders
// ---------------------------------------------------------------------------

interface UsageSlidersProps {
  usage: UsageInput;
  onChange: (key: keyof UsageInput, value: number) => void;
}

export function UsageSliders({ usage, onChange }: UsageSlidersProps) {
  return (
    <div className="space-y-5">
      {SLIDERS.map(({ key, label, min, max, step, unit }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{label}</Label>
            <span className="text-sm font-medium tabular-nums">
              {formatCountLocale(usage[key])} {unit}
            </span>
          </div>
          <Slider
            min={min}
            max={max}
            step={step}
            value={[usage[key]]}
            onValueChange={([v]) => onChange(key, v)}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BillBreakdownCard
// ---------------------------------------------------------------------------

interface BillBreakdownCardProps {
  bill: BillResult;
  tierLabel: string;
  symbol: string;
  fmtMoney: (value: number) => string;
  highlight: boolean;
}

export function BillBreakdownCard({
  bill,
  tierLabel,
  symbol,
  fmtMoney,
  highlight,
}: BillBreakdownCardProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg p-4 border ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tierLabel}
        </span>
        {highlight && (
          <Badge variant="default" className="text-xs">
            Recommended
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Base plan</span>
        <span className="text-sm font-medium">
          {symbol}
          {fmtMoney(bill.base)}/mo
        </span>
      </div>

      {bill.overageBreakdown.length > 0 && (
        <>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Usage overage
          </p>
          {bill.overageBreakdown.map((o) => (
            <div
              key={o.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {o.label} ({formatCountLocale(o.units)} × {symbol}
                {fmtMoney(o.rate)})
              </span>
              <span className="font-medium text-warning">
                +{symbol}
                {fmtMoney(Math.round(o.cost))}
              </span>
            </div>
          ))}
        </>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Estimated total</span>
        <div className="text-right">
          <span className="text-xl font-bold">
            {symbol}
            {fmtMoney(Math.round(bill.total))}
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      </div>

      {bill.overageTotal === 0 ? (
        <Badge variant="secondary" className="self-start text-xs">
          All within included quota
        </Badge>
      ) : (
        <p className="text-xs text-muted-foreground">
          Overage billed at month-end based on actual usage
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UpgradeSuggestion
// ---------------------------------------------------------------------------

interface UpgradeSuggestionProps {
  proBill: BillResult;
  clinicBill: BillResult;
  symbol: string;
  fmtMoney: (value: number) => string;
}

export function UpgradeSuggestion({
  proBill,
  clinicBill,
  symbol,
  fmtMoney,
}: UpgradeSuggestionProps) {
  const router = useRouter();
  const savings = Math.max(
    0,
    Math.round(proBill.total - clinicBill.total),
  );

  return (
    <>
      <BillBreakdownCard
        bill={proBill}
        tierLabel="Essential"
        symbol={symbol}
        fmtMoney={fmtMoney}
        highlight={false}
      />
      <BillBreakdownCard
        bill={clinicBill}
        tierLabel="Professional"
        symbol={symbol}
        fmtMoney={fmtMoney}
        highlight={true}
      />
      <p className="text-xs text-muted-foreground text-center">
        Professional has higher quotas and lower per-unit overage rates -
        saving you{" "}
        <span className="font-medium text-foreground">
          {symbol}
          {fmtMoney(savings)}
          /mo
        </span>{" "}
        at this usage level.
      </p>
      <Button
        size="sm"
        className="w-full gap-2"
        onClick={() =>
          router.push(subscriptionSettingsHref({ tier: "PROFESSIONAL" }))
        }
      >
        Upgrade to Professional <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

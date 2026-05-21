"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { useEstimate } from "@/features/subscription/hooks/use-pricing";

type PricingEstimate = NonNullable<ReturnType<typeof useEstimate>["estimate"]>;

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

interface DynamicPricingEstimatorBreakdownProps {
  effectiveBillingCycle: "monthly" | "yearly";
  isLoading: boolean;
  estimate: PricingEstimate | null | undefined;
  fmtMoney: (value: number) => string;
}

export function DynamicPricingEstimatorBreakdown({
  effectiveBillingCycle,
  isLoading,
  estimate,
  fmtMoney,
}: DynamicPricingEstimatorBreakdownProps) {
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
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your Estimate
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {effectiveBillingCycle === "yearly"
              ? "Billed annually"
              : "Billed monthly"}
          </p>
        </div>
        {isLoading ? (
          <Badge variant="outline">Calculating…</Badge>
        ) : shownTotal !== null && estimate ? (
          <div className="text-right">
            <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-foreground">
              {estimate.currency.symbol}
              {fmtMoney(shownTotal)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              /{effectiveBillingCycle === "yearly" ? "yr" : "mo"}
            </span>
          </div>
        ) : (
          <Badge variant="outline">Contact sales</Badge>
        )}
      </div>

      {!isLoading && hasDetailedEstimate && estimate ? (
        <div className="divide-y bg-muted/10">
          <EstimateRow
            label="Base plan"
            value={`${estimate.currency.symbol}${fmtMoney(estimate.breakdown.basePrice)}`}
          />
          {estimate.breakdown.overageTotal > 0 ? (
            <EstimateRow
              label="Usage overage"
              value={`${estimate.currency.symbol}${fmtMoney(estimate.breakdown.overageTotal)}`}
              sublabel
            />
          ) : null}
          {estimate.breakdown.overages.consultations.charge > 0 ? (
            <EstimateRow
              label="Consultations overage"
              value={`${estimate.currency.symbol}${fmtMoney(estimate.breakdown.overages.consultations.charge)}`}
              indent
            />
          ) : null}
          {estimate.breakdown.overages.users.charge > 0 ? (
            <EstimateRow
              label="Team overage"
              value={`${estimate.currency.symbol}${fmtMoney(estimate.breakdown.overages.users.charge)}`}
              indent
            />
          ) : null}
          {estimate.breakdown.overages.whatsappMessages.charge > 0 ? (
            <EstimateRow
              label="WhatsApp overage"
              value={`${estimate.currency.symbol}${fmtMoney(estimate.breakdown.overages.whatsappMessages.charge)}`}
              indent
            />
          ) : null}
          <div className="px-5 py-3 bg-card">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly total</span>
              <span className="font-semibold">
                {estimate.currency.symbol}
                {fmtMoney(estimate.totalMonthly)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-muted-foreground">
                Yearly total (2 months free)
              </span>
              <span className="font-semibold">
                {estimate.currency.symbol}
                {fmtMoney(estimate.totalYearly)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && !hasDetailedEstimate && estimate ? (
        <div className="px-5 py-4 text-sm text-muted-foreground bg-muted/10">
          Enterprise pricing is custom. Contact sales for commercial terms.
        </div>
      ) : null}
    </div>
  );
}

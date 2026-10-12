"use client";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/form/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import { PLAN_MODE_INFO, PLAN_MODES, type PlanMode } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

interface PricingModeToggleProps {
  selectedMode: PlanMode;
  billingPeriod: "monthly" | "yearly";
  onModeChange: (mode: PlanMode) => void;
  onBillingChange: (period: "monthly" | "yearly") => void;
}

const BILLING_PERIODS = ["monthly", "yearly"] as const;

export function PricingModeToggle({
  selectedMode,
  billingPeriod,
  onModeChange,
  onBillingChange,
}: PricingModeToggleProps) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <ToggleGroup
        type="single"
        role="group"
        aria-label="Plan mode"
        value={selectedMode}
        onValueChange={(value) => {
          const mode = parseStringEnumMember(PLAN_MODES, String(value));
          if (mode) onModeChange(mode);
        }}
        className="items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
      >
        {PLAN_MODES.map((mode) => {
          const info = PLAN_MODE_INFO[mode];
          const active = selectedMode === mode;
          return (
            <ToggleGroupItem
              key={mode}
              value={mode}
              aria-label={`${info.name}: ${info.helpText}`}
              className={cn(
                "rounded-lg border-0 px-3.5 py-1.5 text-xs font-medium shadow-none",
                active
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5">
                {info.shortLabel}
                {mode !== "FULL" ? (
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      active
                        ? "bg-primary-foreground/60"
                        : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                ) : null}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
      <ToggleGroup
        type="single"
        role="group"
        aria-label="Billing period"
        value={billingPeriod}
        onValueChange={(value) => {
          const period = parseStringEnumMember(BILLING_PERIODS, String(value));
          if (period) onBillingChange(period);
        }}
        className="items-center gap-0.5 rounded-lg border border-border/40 bg-background p-0.5"
      >
        {BILLING_PERIODS.map((period) => {
          const active = billingPeriod === period;
          return (
            <ToggleGroupItem
              key={period}
              value={period}
              className={cn(
                "rounded-md border-0 px-3 py-1 text-xs font-medium shadow-none",
                active
                  ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                  : "bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {period === "monthly" ? "Monthly" : "Yearly"}
                {period === "yearly" ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[var(--fs-2xs)] font-semibold leading-none",
                      active
                        ? "bg-background/15 text-background"
                        : "bg-success/10 text-success",
                    )}
                  >
                    2 months free
                  </span>
                ) : null}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

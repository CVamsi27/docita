"use client";

import { cn } from "@workspace/ui/lib/utils";
import { PLAN_MODE_INFO, PLAN_MODES, type PlanMode } from "@workspace/types";

interface PricingModeToggleProps {
  selectedMode: PlanMode;
  billingPeriod: "monthly" | "yearly";
  onModeChange: (mode: PlanMode) => void;
  onBillingChange: (period: "monthly" | "yearly") => void;
}

export function PricingModeToggle({ selectedMode, billingPeriod, onModeChange, onBillingChange }: PricingModeToggleProps) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1" role="tablist" aria-label="Plan mode">
        {PLAN_MODES.map((mode) => {
          const info = PLAN_MODE_INFO[mode];
          const active = selectedMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              aria-pressed={active}
              title={info.helpText}
              className={cn("rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span className="flex items-center gap-1.5">
                {info.shortLabel}
                {mode !== "FULL" ? (
                  <span className={cn("inline-block h-1.5 w-1.5 rounded-full",
                    active ? "bg-primary-foreground/60" : "bg-muted-foreground/40"
                  )} aria-hidden />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/40 bg-background p-0.5" role="tablist" aria-label="Billing period">
        {(["monthly", "yearly"] as const).map((period) => {
          const active = billingPeriod === period;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onBillingChange(period)}
              aria-pressed={active}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-all duration-200",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {period === "monthly" ? "Monthly" : "Yearly"}
                {period === "yearly" ? (
                  <span className={cn("rounded px-1.5 py-0.5 text-[var(--fs-2xs)] font-semibold leading-none",
                    active ? "bg-background/15 text-background" : "bg-success/10 text-success"
                  )}>
                    2 months free
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

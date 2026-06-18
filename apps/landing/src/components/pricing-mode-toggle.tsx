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
    <div className="flex shrink-0 items-center gap-4 self-start sm:items-end">
      <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1" role="tablist" aria-label="Plan mode">
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
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition",
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {info.shortLabel}
            </button>
          );
        })}
      </div>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
      <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1" role="tablist" aria-label="Billing period">
        {(["monthly", "yearly"] as const).map((period) => {
          const active = billingPeriod === period;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onBillingChange(period)}
              aria-pressed={active}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition",
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {period === "monthly" ? "Monthly" : "Yearly"}
                {period === "yearly" ? (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[var(--fs-2xs)] font-semibold leading-none",
                    active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-success/10 text-success"
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

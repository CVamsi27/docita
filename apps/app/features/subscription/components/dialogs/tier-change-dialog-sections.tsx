"use client";

import { CalendarClock, Check, Minus } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { formatCurrency } from "@workspace/utils";
import type { SupportedCurrency } from "@workspace/types";
import type { PRICING_CURRENCY_CONFIG } from "@workspace/types";

interface FeatureDelta {
  feature: string;
  name: string;
}

interface FeatureDeltaGridProps {
  gained: FeatureDelta[];
  lost: FeatureDelta[];
}

export function FeatureDeltaGrid({ gained, lost }: FeatureDeltaGridProps) {
  if (gained.length === 0 && lost.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {gained.length > 0 ? (
        <div className="rounded-lg border border-success/40 bg-success/5 p-3">
          <p className="mb-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-success">
            You&apos;ll gain
          </p>
          <ul className="space-y-1 text-sm">
            {gained.slice(0, 6).map((f) => (
              <li key={f.feature} className="flex items-start gap-2 leading-snug">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                <span>{f.name}</span>
              </li>
            ))}
            {gained.length > 6 ? (
              <li className="pl-5 text-xs text-muted-foreground">
                + {gained.length - 6} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {lost.length > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
          <p className="mb-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-warning">
            You&apos;ll lose
          </p>
          <ul className="space-y-1 text-sm">
            {lost.slice(0, 6).map((f) => (
              <li key={f.feature} className="flex items-start gap-2 leading-snug">
                <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                <span>{f.name}</span>
              </li>
            ))}
            {lost.length > 6 ? (
              <li className="pl-5 text-xs text-muted-foreground">
                + {lost.length - 6} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface DowngradeTimingChooserProps {
  timing: "now" | "at-renewal";
  onTimingChange: (t: "now" | "at-renewal") => void;
  currentPlanName: string;
  formattedRenewalDate: string | null;
}

export function DowngradeTimingChooser({
  timing,
  onTimingChange,
  currentPlanName,
  formattedRenewalDate,
}: DowngradeTimingChooserProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
        When should this take effect?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onTimingChange("at-renewal")}
          className={cn(
            "flex flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
            timing === "at-renewal"
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:bg-muted/40",
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
            At next renewal{formattedRenewalDate ? ` (${formattedRenewalDate})` : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            Keep {currentPlanName} features for the rest of the paid period. No charge today.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTimingChange("now")}
          className={cn(
            "flex flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
            timing === "now"
              ? "border-warning bg-warning/5 ring-1 ring-warning/30"
              : "border-border hover:bg-muted/40",
          )}
        >
          <span className="font-medium">Apply immediately</span>
          <span className="text-xs text-muted-foreground">
            Lose higher-tier features now. Unused time becomes account credit toward your next invoice.
          </span>
        </button>
      </div>
    </div>
  );
}

interface ProrationPreviewProps {
  prorationLoading: boolean;
  prorationPreview: { creditCents: number; finalAmountCents: number } | null | undefined;
  currency: SupportedCurrency;
  currencyConfig: (typeof PRICING_CURRENCY_CONFIG)[SupportedCurrency];
}

export function ProrationPreview({
  prorationLoading,
  prorationPreview,
  currency,
  currencyConfig,
}: ProrationPreviewProps) {
  if (!prorationLoading && !prorationPreview) return null;
  return (
    <div className="rounded-lg border bg-muted/25 p-3 text-sm space-y-2">
      {prorationLoading ? (
        <p className="text-muted-foreground">Calculating checkout amount…</p>
      ) : prorationPreview ? (
        <>
          {prorationPreview.creditCents > 0 ? (
            <p className="text-muted-foreground">
              Credit from unused period:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(prorationPreview.creditCents / 100, {
                  currency,
                  locale: currencyConfig.locale,
                  fractionDigits: currencyConfig.decimalPlaces,
                })}
              </span>
            </p>
          ) : null}
          <p className="font-semibold">
            Due today:{" "}
            {formatCurrency(prorationPreview.finalAmountCents / 100, {
              currency,
              locale: currencyConfig.locale,
              fractionDigits: currencyConfig.decimalPlaces,
            })}
          </p>
        </>
      ) : null}
    </div>
  );
}

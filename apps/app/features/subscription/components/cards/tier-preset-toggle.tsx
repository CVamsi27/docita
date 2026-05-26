"use client";

import { useMemo } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import type { SupportedCurrency, TierName } from "@workspace/types";
import {
  type PackagePreset,
  type PackagePresetId,
  getPackagePresetsForTier,
  getPresetMonthlyDiscount,
  PACKAGE_PRESET_DISPLAY,
} from "@/features/subscription/config/pricing-config";

interface TierPresetToggleProps {
  tier: TierName;
  currency: SupportedCurrency;
  currencySymbol: string;
  selectedPresetId: PackagePresetId | null;
  onChange: (preset: PackagePreset | null) => void;
  className?: string;
}

/**
 * Compact row of "without WhatsApp / without AI / core only" chips rendered
 * inside a tier card. Selecting a chip swaps the customer onto the preset's
 * override bundle and applies the per-currency discount; clicking the active
 * chip clears the selection.
 *
 * Pure UI — actual checkout / persistence is owned by the parent (upgrade
 * dialog → subscription API → Clinic.features write).
 */
export function TierPresetToggle({
  tier,
  currency,
  currencySymbol,
  selectedPresetId,
  onChange,
  className,
}: TierPresetToggleProps) {
  const presets = useMemo(() => getPackagePresetsForTier(tier), [tier]);
  if (presets.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Custom package
      </span>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const display = PACKAGE_PRESET_DISPLAY[preset.id];
          const discount = getPresetMonthlyDiscount(preset, currency);
          const isActive = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(isActive ? null : preset)}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                "hover:border-primary/60",
                isActive
                  ? "border-primary bg-primary/10 text-primary-foreground"
                  : "border-border bg-background text-foreground",
              )}
              title={display.helpText}
              aria-pressed={isActive}
            >
              <span className="font-medium">{display.shortLabel}</span>
              {discount > 0 ? (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  −{currencySymbol}
                  {discount.toLocaleString()}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { Check, Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { usePricingConfig } from "@/hooks/api/use-pricing";

interface IntelligenceAddonCardProps {
  currency?: string;
  isYearly?: boolean;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

const INTELLIGENCE_FEATURES = [
  "AI Prescription Assistant",
  "Smart Diagnosis Hints",
  "Predictive No-Show Detection",
  "Patient Segmentation",
  "Anomaly Detection",
  "Smart Task Engine",
];

export function IntelligenceAddonCard({
  currency = "INR",
  isYearly = false,
  enabled,
  onToggle,
  className,
}: IntelligenceAddonCardProps) {
  const { pricingConfig, isLoading } = usePricingConfig(currency);

  const intelligenceAddon = pricingConfig?.addOns?.find(
    (addon) =>
      addon.id === "INTELLIGENCE" ||
      addon.name?.toLowerCase().includes("intelligence"),
  );

  const price = intelligenceAddon?.pricing
    ? isYearly
      ? intelligenceAddon.pricing.yearly
      : intelligenceAddon.pricing.monthly
    : currency === "INR"
      ? 1999
      : 29; 

  const currencySymbol = currency === "INR" ? "₹" : "$";

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed p-4 animate-pulse",
          className,
        )}
      >
        <div className="h-6 bg-muted rounded w-1/3 mb-2" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-5 transition-all",
        enabled
          ? "border-primary/50 bg-primary shadow-md"
          : "border-muted hover:border-muted-foreground/30",
        className,
      )}
    >
      {}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Intelligence (AI)</h3>
            <Badge variant="outline" className="mt-1">
              Add-on
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="intelligence-toggle" className="sr-only">
            Enable Intelligence
          </Label>
          <Switch
            id="intelligence-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      {}
      <div className="mb-4">
        <span className="text-2xl font-bold">
          {currencySymbol}
          {typeof price === "number" ? price.toLocaleString() : price}
        </span>
        <span className="text-muted-foreground text-sm">
          /{isYearly ? "year" : "month"}
        </span>
      </div>

      {}
      <ul className="space-y-2">
        {INTELLIGENCE_FEATURES.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

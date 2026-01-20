"use client";

import { Check, MessageCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { usePricingConfig } from "@/hooks/api/use-pricing";

interface WhatsAppAddonCardProps {
  currency?: string;
  isYearly?: boolean;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

const WHATSAPP_FEATURES = [
  "Appointment schedule reminders",
  "30-minute advance reminders",
  "Patient confirmation & delay alerts",
  "Doctor notified on cancellation/delay",
  "Prescription sharing via WhatsApp",
  "Invoice sharing via WhatsApp",
  "Two-way patient messaging",
  "Delivery & read receipts",
];

export function WhatsAppAddonCard({
  currency = "INR",
  isYearly = false,
  enabled,
  onToggle,
  className,
}: WhatsAppAddonCardProps) {
  const { pricingConfig, isLoading } = usePricingConfig(currency);

  // Find WhatsApp add-on from backend pricing
  const whatsappAddon = pricingConfig?.addOns?.find(
    (addon) =>
      addon.id === "WHATSAPP" || addon.name?.toLowerCase().includes("whatsapp"),
  );

  const price = whatsappAddon?.pricing
    ? isYearly
      ? whatsappAddon.pricing.yearly
      : whatsappAddon.pricing.monthly
    : currency === "INR"
      ? 799
      : 19; // Fallback

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
          ? "border-emerald-500/50 bg-emerald-500/5 shadow-md"
          : "border-muted hover:border-muted-foreground/30",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">WhatsApp Integration</h3>
            <Badge variant="outline" className="mt-1">
              Add-on
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="whatsapp-toggle" className="sr-only">
            Enable WhatsApp
          </Label>
          <Switch
            id="whatsapp-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-4">
        <span className="text-2xl font-bold">
          {currencySymbol}
          {typeof price === "number" ? price.toLocaleString() : price}
        </span>
        <span className="text-muted-foreground text-sm">
          /{isYearly ? "year" : "month"}
        </span>
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {WHATSAPP_FEATURES.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

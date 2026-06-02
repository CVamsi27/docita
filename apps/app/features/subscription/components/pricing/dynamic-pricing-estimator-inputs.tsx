"use client";

import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  parseSupportedCurrency,
} from "@workspace/utils";
import {
  tierSchema,
  type SupportedCurrency,
  type TierName,
} from "@workspace/types";
import type { PricingConfig } from "@/features/subscription/hooks/use-pricing";

export interface PricingEstimatorUsage {
  consultations: number;
  users: number;
  whatsappMessages: number;
}

interface DynamicPricingEstimatorInputsProps {
  tier: TierName;
  tiers: string[];
  onTierChange: (tier: TierName) => void;
  effectiveBillingCycle: "monthly" | "yearly";
  onBillingCycleChange: (cycle: "monthly" | "yearly") => void;
  showBillingSelector: boolean;
  selectedCurrency: SupportedCurrency;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  showCurrencySelector: boolean;
  pricingConfig: PricingConfig | null | undefined;
  usage: PricingEstimatorUsage;
  onUsageChange: (usage: PricingEstimatorUsage) => void;
}

export function DynamicPricingEstimatorInputs({
  tier,
  tiers,
  onTierChange,
  effectiveBillingCycle,
  onBillingCycleChange,
  showBillingSelector,
  selectedCurrency,
  onCurrencyChange,
  showCurrencySelector,
  pricingConfig,
  usage,
  onUsageChange,
}: DynamicPricingEstimatorInputsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Plan</Label>
          <Select
            value={tier}
            onValueChange={(value) => {
              const parsed = tierSchema.safeParse(value);
              if (parsed.success) {
                onTierChange(parsed.data);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((tierName) => (
                <SelectItem key={tierName} value={tierName}>
                  {tierName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showBillingSelector ? (
          <div className="space-y-2">
            <Label>Billing cycle</Label>
            <Select
              value={effectiveBillingCycle}
              onValueChange={(value) => {
                if (value === "monthly" || value === "yearly") {
                  onBillingCycleChange(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly (2 months free)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {showCurrencySelector ? (
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={selectedCurrency}
              onValueChange={(value) => {
                onCurrencyChange(parseSupportedCurrency(value));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  pricingConfig?.supportedCurrencies || [
                    {
                      code: DEFAULT_CURRENCY,
                      symbol:
                        CURRENCY_OPTIONS.find(
                          (option) => option.value === DEFAULT_CURRENCY,
                        )?.symbol ?? DEFAULT_CURRENCY,
                      name:
                        CURRENCY_OPTIONS.find(
                          (option) => option.value === DEFAULT_CURRENCY,
                        )?.label ?? DEFAULT_CURRENCY,
                    },
                  ]
                ).map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.symbol} {item.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Consultations / Month</Label>
          <Input
            type="number"
            min={0}
            value={usage.consultations}
            onChange={(e) =>
              onUsageChange({
                ...usage,
                consultations: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Team Members</Label>
          <Input
            type="number"
            min={1}
            value={usage.users}
            onChange={(e) =>
              onUsageChange({
                ...usage,
                users: Number(e.target.value) || 1,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp Messages / Month</Label>
          <Input
            type="number"
            min={0}
            value={usage.whatsappMessages}
            onChange={(e) =>
              onUsageChange({
                ...usage,
                whatsappMessages: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        This estimator uses only billable meters from the live contract:
        consultations, team users, and WhatsApp messages.
      </div>
    </>
  );
}

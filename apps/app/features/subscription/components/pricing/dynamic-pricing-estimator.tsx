"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import { useDebounce } from "@workspace/hooks";
import type { SupportedCurrency, TierName } from "@workspace/types";
import {
  DEFAULT_PRICING_SCALE_PRESET,
  PRICING_ESTIMATE_DEBOUNCE_MS,
  PRICING_ESTIMATOR_TIERS,
  PRICING_SCALE_PRESETS,
  type PricingScalePresetKey,
} from "@/features/subscription/config/pricing-config";
import {
  type EstimateUsageInputs,
  useEstimate,
  usePricingConfig,
} from "@/hooks/api/use-pricing";

interface DynamicPricingEstimatorProps {
  defaultTier?: TierName;
  currency?: SupportedCurrency;
  billingCycle?: "monthly" | "yearly";
  showCurrencySelector?: boolean;
  showBillingSelector?: boolean;
  onUsageChange?: (usage: EstimateUsageInputs) => void;
}

export function DynamicPricingEstimator({
  defaultTier = "CORE",
  currency = "INR",
  billingCycle: controlledBillingCycle,
  showCurrencySelector = true,
  showBillingSelector = true,
  onUsageChange,
}: DynamicPricingEstimatorProps) {
  const [tier, setTier] = useState(defaultTier);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>(currency);
  const [localBillingCycle, setLocalBillingCycle] = useState<
    "monthly" | "yearly"
  >(
    "monthly",
  );
  const [scalePreset, setScalePreset] =
    useState<PricingScalePresetKey>(DEFAULT_PRICING_SCALE_PRESET);
  const [patients, setPatients] =
    useState(PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].patients);
  const [appointments, setAppointments] = useState(
    PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].appointments,
  );
  const [users, setUsers] = useState(
    PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].users,
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappMessages, setWhatsappMessages] = useState(
    PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].whatsappMessages,
  );
  const [intelligence, setIntelligence] = useState(false);
  const [aiCredits, setAiCredits] = useState(
    PRICING_SCALE_PRESETS[DEFAULT_PRICING_SCALE_PRESET].aiCredits,
  );

  const { pricingConfig } = usePricingConfig(selectedCurrency);

  useEffect(() => {
    const preset = PRICING_SCALE_PRESETS[scalePreset];
    setPatients(preset.patients);
    setAppointments(preset.appointments);
    setUsers(preset.users);
    setWhatsappMessages(preset.whatsappMessages);
    setAiCredits(preset.aiCredits);
  }, [scalePreset]);

  useEffect(() => {
    setTier(defaultTier);
  }, [defaultTier]);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  useEffect(() => {
    if (controlledBillingCycle) {
      setLocalBillingCycle(controlledBillingCycle);
    }
  }, [controlledBillingCycle]);

  const effectiveBillingCycle = controlledBillingCycle ?? localBillingCycle;

  useEffect(() => {
    onUsageChange?.({
      patients,
      appointments,
      users,
      whatsapp: whatsappEnabled,
      whatsappMessages,
      intelligence,
      aiCredits,
    });
  }, [
    patients,
    appointments,
    users,
    whatsappEnabled,
    whatsappMessages,
    intelligence,
    aiCredits,
    onUsageChange,
  ]);

  const estimateParams = useMemo(
    () => ({
      tier,
      currency: selectedCurrency,
      billingCycle: effectiveBillingCycle,
      patients,
      appointments,
      users,
      whatsapp: whatsappEnabled,
      whatsappMessages: whatsappEnabled ? whatsappMessages : 0,
      intelligence,
      aiCredits: intelligence ? aiCredits : 0,
    }),
    [
      tier,
      selectedCurrency,
      effectiveBillingCycle,
      patients,
      appointments,
      users,
      whatsappEnabled,
      whatsappMessages,
      intelligence,
      aiCredits,
    ],
  );

  const debouncedEstimateParams = useDebounce(
    estimateParams,
    PRICING_ESTIMATE_DEBOUNCE_MS,
  );

  const { estimate, isLoading } = useEstimate(debouncedEstimateParams);

  const tiers = (pricingConfig?.tiers || [])
    .map((tierInfo) => tierInfo.id)
    .filter((tierInfo) =>
      PRICING_ESTIMATOR_TIERS.includes(tierInfo as TierName),
    );

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

  const whatsappOverage =
    hasDetailedEstimate && estimate
      ? (estimate.breakdown.addOns.whatsapp?.overage ?? 0)
      : 0;

  const intelligenceOverage =
    hasDetailedEstimate && estimate
      ? (estimate.breakdown.addOns.intelligence?.overage ?? 0)
      : 0;

  const intelligenceBase =
    hasDetailedEstimate && estimate
      ? (estimate.breakdown.addOns.intelligence?.base ?? 0)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynamic Price Estimator</CardTitle>
        <CardDescription>
          Base plan + usage overage by patients, appointments, team size,
          WhatsApp volume, and AI credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={tier} onValueChange={(value) => setTier(value as TierName)}>
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
          {showBillingSelector && (
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                value={effectiveBillingCycle}
                onValueChange={(value) =>
                  setLocalBillingCycle(value as "monthly" | "yearly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showCurrencySelector && (
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value) =>
                  setSelectedCurrency(value as SupportedCurrency)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pricingConfig?.supportedCurrencies || [
                    { code: "INR", symbol: "₹", name: "Indian Rupee" },
                  ]).map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.symbol} {item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Scale preset</Label>
            <Select
              value={scalePreset}
              onValueChange={(value) =>
                setScalePreset(value as PricingScalePresetKey)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRICING_SCALE_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Expected Patients</Label>
            <Input
              type="number"
              min={0}
              value={patients}
              onChange={(e) => setPatients(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Appointments / Month</Label>
            <Input
              type="number"
              min={0}
              value={appointments}
              onChange={(e) => setAppointments(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Team Members</Label>
            <Input
              type="number"
              min={1}
              value={users}
              onChange={(e) => setUsers(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">WhatsApp usage</p>
              <p className="text-xs text-muted-foreground">
                Estimate overage for outbound messages at your expected scale
              </p>
            </div>
            <Switch
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
            />
          </div>
          {whatsappEnabled && (
            <div className="space-y-2">
              <Label>Projected WhatsApp messages / Month</Label>
              <Input
                type="number"
                min={0}
                value={whatsappMessages}
                onChange={(e) => setWhatsappMessages(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Include Docita Intelligence</p>
              <p className="text-xs text-muted-foreground">
                Optional AI credits for coding and automation
              </p>
            </div>
            <Switch checked={intelligence} onCheckedChange={setIntelligence} />
          </div>
          {intelligence && (
            <div className="space-y-2">
              <Label>Projected AI Credits / Month</Label>
              <Input
                type="number"
                min={0}
                value={aiCredits}
                onChange={(e) => setAiCredits(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your estimate</span>
            {isLoading ? (
              <Badge variant="outline">Calculating...</Badge>
            ) : shownTotal !== null && estimate ? (
              <Badge>
                {estimate.currency.symbol}
                {shownTotal.toLocaleString()}
                {effectiveBillingCycle === "yearly" ? "/yr" : "/mo"}
              </Badge>
            ) : (
              <Badge variant="outline">Contact Sales</Badge>
            )}
          </div>

          {!isLoading && hasDetailedEstimate && estimate && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Base: {estimate.currency.symbol}
                {estimate.breakdown.basePrice.toLocaleString()}
              </p>
              <p>
                Add-ons (base): {estimate.currency.symbol}
                {estimate.breakdown.addOnTotal.toLocaleString()}
              </p>
              {intelligenceBase > 0 && (
                <p>
                  Intelligence base: {estimate.currency.symbol}
                  {intelligenceBase.toLocaleString()}
                </p>
              )}
              <p>
                Usage overage: {estimate.currency.symbol}
                {estimate.breakdown.overageTotal.toLocaleString()}
              </p>
              {(estimate.breakdown.overages.patients.charge > 0 ||
                estimate.breakdown.overages.appointments.charge > 0 ||
                estimate.breakdown.overages.users.charge > 0 ||
                whatsappOverage > 0 ||
                intelligenceOverage > 0) && (
                <div className="pt-1 space-y-1">
                  {estimate.breakdown.overages.patients.charge > 0 && (
                    <p>
                      Patients overage: {estimate.currency.symbol}
                      {estimate.breakdown.overages.patients.charge.toLocaleString()}
                    </p>
                  )}
                  {estimate.breakdown.overages.appointments.charge > 0 && (
                    <p>
                      Appointments overage: {estimate.currency.symbol}
                      {estimate.breakdown.overages.appointments.charge.toLocaleString()}
                    </p>
                  )}
                  {estimate.breakdown.overages.users.charge > 0 && (
                    <p>
                      Team overage: {estimate.currency.symbol}
                      {estimate.breakdown.overages.users.charge.toLocaleString()}
                    </p>
                  )}
                  {whatsappOverage > 0 && (
                    <p>
                      WhatsApp overage: {estimate.currency.symbol}
                      {whatsappOverage.toLocaleString()}
                    </p>
                  )}
                  {intelligenceOverage > 0 && (
                    <p>
                      AI credit overage: {estimate.currency.symbol}
                      {intelligenceOverage.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <div className="pt-2 space-y-1 border-t">
                <p className="font-medium text-foreground">
                  Total (monthly): {estimate.currency.symbol}
                  {estimate.totalMonthly.toLocaleString()}
                </p>
                <p className="font-medium text-foreground">
                  Total (yearly): {estimate.currency.symbol}
                  {estimate.totalYearly.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !hasDetailedEstimate && estimate && (
            <p className="text-xs text-muted-foreground">
              Enterprise pricing is custom. Use this section to model usage and
              contact sales for final commercial terms.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

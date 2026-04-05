import { useEffect, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import {
  FALLBACK_PRICING_CONFIG,
  fetchPricingConfig,
  formatTierPrice,
  type PricingConfig,
} from "@/lib/landing-data";

interface PricingSectionProps {
  appUrl: string;
}

export function PricingSection({ appUrl }: PricingSectionProps) {
  const [currency, setCurrency] = useState("INR");
  const [pricing, setPricing] = useState<PricingConfig>(FALLBACK_PRICING_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const payload = await fetchPricingConfig(currency);

        if (!active) {
          return;
        }

        setPricing(payload);
      } catch {
        if (!active) {
          return;
        }

        setHasError(true);
        setPricing(FALLBACK_PRICING_CONFIG);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [currency]);

  const tiers = useMemo(
    () => pricing.tiers.filter((tier) => ["STARTER", "ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"].includes(tier.id)),
    [pricing],
  );

  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Simple Pricing, Clear Growth Path</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Start free, upgrade only when your operations need more automation and control.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <label htmlFor="currency" className="text-sm font-medium text-muted-foreground">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {pricing.supportedCurrencies.map((currencyOption) => (
              <option key={currencyOption.code} value={currencyOption.code}>
                {currencyOption.code} ({currencyOption.symbol})
              </option>
            ))}
          </select>
        </div>

        {hasError ? (
          <p className="mx-auto mt-4 max-w-3xl rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning-foreground">
            Live pricing is temporarily unavailable. Displaying fallback values.
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier) => {
            const monthly = formatTierPrice(tier.pricing.monthly, pricing.currency.symbol);
            const yearly = formatTierPrice(tier.pricing.yearly, pricing.currency.symbol);
            const isCustom = tier.pricing.monthly === "custom";

            return (
              <Card key={tier.id} className="h-full">
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-3xl font-semibold">{isLoading ? "..." : monthly}</p>
                    <p className="text-sm text-muted-foreground">
                      {isCustom ? "Custom annual contract" : `${yearly} billed yearly`}
                    </p>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>

                  {tier.id === "ENTERPRISE" ? (
                    <Button asChild className="w-full" variant="outline">
                      <a href="/contact">Talk to Sales</a>
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <a href={`${appUrl}/onboarding`}>Start Free Trial</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

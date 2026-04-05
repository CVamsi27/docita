import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";

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
  type PricingConfig,
  type TierConfig,
} from "@/lib/landing-data";

interface PricingSectionProps {
  appUrl: string;
}

const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR",
  GB: "GBP",
  AU: "AUD",
  NZ: "AUD",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
  US: "USD",
  CA: "USD",
  MX: "USD",
  SG: "SGD",
  AE: "AED",
  ZA: "ZAR",
};

const TIER_ORDER = ["STARTER", "ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"] as const;

const STARTER_FEATURES = [
  "Up to 50 patients",
  "Up to 50 consultations/month",
  "Digital prescriptions with PDF",
  "Patient profiles & visit history",
  "Paper record scanning & archival",
  "Excel import & CSV export",
  "Single doctor",
];

const ESSENTIAL_FEATURES = [
  "Unlimited patients",
  "500 consultations/month included",
  "1 doctor included",
  "WhatsApp messaging (500 msgs/mo)",
  "Lab tests & inventory",
  "Queue management",
  "Advanced analytics",
  "Audit logs & compliance",
  "Insurance billing",
  "Digital intake forms",
  "Prescription templates",
  "AI features — Coming Soon",
];

const PROFESSIONAL_FEATURES = [
  "Unlimited patients",
  "2,000 consultations/month included",
  "Up to 5 doctors",
  "WhatsApp messaging (2,000 msgs/mo)",
  "Broadcast campaigns",
  "Patient segmentation",
  "Full EHR (IPD, vitals, clinical notes)",
  "Custom branding on reports",
  "Multi-location analytics",
  "Bulk data import suite",
  "REST API access (10k calls/day)",
  "SSO (Google / Azure AD)",
  "Custom letterhead",
  "Priority support with SLA",
];

const ENTERPRISE_FEATURES = [
  "Unlimited patients, users & branches",
  "Everything in Professional",
  "Data warehouse export (BI tools)",
  "Custom contract & invoicing",
  "Dedicated account manager",
  "Custom SLA guarantee",
];

function getFeaturesForTier(id: string, fallback: string[]): string[] {
  if (id === "STARTER") return STARTER_FEATURES;
  if (id === "ESSENTIAL") return ESSENTIAL_FEATURES;
  if (id === "PROFESSIONAL") return PROFESSIONAL_FEATURES;
  if (id === "ENTERPRISE") return ENTERPRISE_FEATURES;
  return fallback;
}

function detectCurrencyFromTimezone(): string {
  if (typeof window === "undefined") return "INR";

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (timezone.startsWith("Asia/Kolkata") || timezone.startsWith("Asia/Calcutta")) return "INR";
    if (timezone.startsWith("Australia/") || timezone.startsWith("Pacific/Auckland")) return "AUD";
    if (timezone.startsWith("Asia/Singapore")) return "SGD";
    if (timezone.startsWith("Asia/Dubai")) return "AED";
    if (timezone.startsWith("Africa/Johannesburg")) return "ZAR";
    if (timezone.startsWith("Europe/London")) return "GBP";
    if (timezone.startsWith("Europe/")) return "EUR";
    if (timezone.startsWith("America/")) return "USD";
  } catch {
    return "INR";
  }

  return "INR";
}

function detectCurrencyFromBrowser(): string {
  if (typeof window === "undefined") return "INR";

  try {
    const locale = navigator.languages?.[0] || navigator.language || "";
    const parts = locale.split("-");
    const region = parts[parts.length - 1]?.toUpperCase();
    if (region && COUNTRY_CURRENCY[region]) {
      return COUNTRY_CURRENCY[region];
    }
  } catch {
    return detectCurrencyFromTimezone();
  }

  return detectCurrencyFromTimezone();
}

function formatPrice(value: number | "custom", symbol: string): string {
  if (value === "custom") {
    return "Custom";
  }
  return `${symbol}${value.toLocaleString("en-IN")}`;
}

export function PricingSection({ appUrl }: PricingSectionProps) {
  const [currency, setCurrency] = useState("INR");
  const [pricing, setPricing] = useState<PricingConfig>(FALLBACK_PRICING_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    setCurrency(detectCurrencyFromBrowser());
  }, []);

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

  const orderedTiers = useMemo(() => {
    const byId = new Map(pricing.tiers.map((tier) => [tier.id, tier]));
    return TIER_ORDER.map((id) => byId.get(id)).filter(Boolean) as TierConfig[];
  }, [pricing.tiers]);

  const regionPricingLabel =
    pricing.currency.code === "INR"
      ? "India-competitive pricing"
      : "Premium international pricing";

  return (
    <section className="px-6 py-24 relative overflow-hidden" id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing That Scales With Your Clinic
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, add capabilities as your team and patient volume grow.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {regionPricingLabel} shown in {pricing.currency.symbol} ({pricing.currency.code})
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-muted p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full font-semibold">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {hasError ? (
          <p className="mx-auto mb-6 mt-4 max-w-3xl rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning-foreground">
            Live pricing is temporarily unavailable. Displaying fallback values.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-4 items-start">
          {orderedTiers.map((tier) => {
            const monthly = tier.pricing.monthly;
            const yearly = tier.pricing.yearly;
            const isCustom = monthly === "custom";
            const displayPrice =
              isCustom || billingPeriod === "monthly"
                ? formatPrice(monthly, pricing.currency.symbol)
                : formatPrice(Math.round((yearly as number) / 12), pricing.currency.symbol);
            const yearlyLabel =
              isCustom || billingPeriod !== "annual"
                ? undefined
                : `Billed ${formatPrice(yearly, pricing.currency.symbol)}/year`;
            const features = getFeaturesForTier(tier.id, tier.features);
            const isPopular = tier.id === "ESSENTIAL";
            const cardClass = isPopular
              ? "border-primary shadow-lg scale-105 z-10 bg-background"
              : "border-muted hover:border-primary/50";

            return (
              <Card key={tier.id} className={`relative flex flex-col h-full transition-colors ${cardClass}`}>
                {isPopular ? (
                  <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                ) : null}

                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription className="text-xs">{tier.description}</CardDescription>
                  <div className="mt-3">
                    <p className="text-3xl font-bold">
                      {isLoading ? "..." : displayPrice}
                      {!isCustom && tier.id !== "STARTER" ? (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>
                      ) : null}
                    </p>
                    {yearlyLabel ? (
                      <p className="text-xs text-muted-foreground mt-1">{yearlyLabel}</p>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pt-4 space-y-4">
                  <ul className="space-y-2 text-sm">
                    {features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>

                  {tier.id === "ENTERPRISE" ? (
                    <Button asChild className="w-full" variant="outline" size="sm">
                      <a href="/contact">Contact Sales</a>
                    </Button>
                  ) : (
                    <Button asChild className="w-full" size="sm">
                      <a href={`${appUrl}/onboarding`}>Start trial</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-6 flex items-start gap-4">
            <div className="rounded-lg bg-success/10 p-2 mt-0.5">
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold">WhatsApp Messaging — Included</p>
              <p className="text-sm text-muted-foreground mt-1">
                500 msgs/mo on Essential, 2,000 msgs/mo on Professional.
                Additional messages billed per use.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">AI Features — Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI-assisted notes, smart prescriptions, voice dictation, and
                predictive analytics — bundled into Essential and above.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>All paid plans include a 14-day free trial. No credit card required.</p>
          <p>Annual billing gives you 2 months free. Loyalty discounts apply after 3 years.</p>
        </div>
      </div>
    </section>
  );
}

import { MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";

interface PricingSectionProps {
  appUrl: string;
}

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

export function PricingSection({ appUrl }: PricingSectionProps) {
  const orderedTiers = TIER_ORDER.map((id) =>
    FALLBACK_PRICING_CONFIG.tiers.find((tier) => tier.id === id),
  ).filter(Boolean);

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
            India-competitive pricing shown in {FALLBACK_PRICING_CONFIG.currency.symbol} (
            {FALLBACK_PRICING_CONFIG.currency.code})
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {orderedTiers.map((tier, index) => {
            if (!tier) {
              return null;
            }

            const isFeatured = index === 2;
            const features = getFeaturesForTier(tier.id, tier.features);

            return (
              <Card
                key={tier.id}
                className={`relative overflow-hidden ${
                  isFeatured
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
              >
                {isFeatured && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
                )}
                <CardHeader className="pb-4">
                  {isFeatured && (
                    <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most Popular
                    </div>
                  )}
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="min-h-[3rem] text-sm leading-6">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tight">
                      {formatTierPrice(tier.pricing.monthly, FALLBACK_PRICING_CONFIG.currency.symbol)}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">/ month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Billed monthly. Annual plans include 2 months free.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-medium text-muted-foreground">
                      Included features
                    </p>
                    <ul className="space-y-2 text-sm">
                      {features.slice(0, isFeatured ? 8 : 6).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    asChild
                    className="w-full gap-2"
                    variant={isFeatured ? "default" : "outline"}
                  >
                    <a href={`${appUrl}/onboarding`}>
                      <MessageSquare className="h-4 w-4" />
                      Start trial
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

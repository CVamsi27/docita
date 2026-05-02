"use client";

import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";
import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface PricingSectionProps {
  appUrl: string;
}

const TIER_ORDER = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
] as const;

const STARTER_FEATURES = [
  "Up to 50 patients",
  "Up to 50 consultations / month",
  "Digital prescriptions with PDF",
  "Patient profiles & visit history",
  "Excel import & CSV export",
  "Single doctor",
];

const ESSENTIAL_FEATURES = [
  "Unlimited patients",
  "500 consultations / month",
  "1 doctor included",
  "WhatsApp messaging (500 msgs)",
  "Lab tests & inventory",
  "Queue management",
  "Audit logs & compliance",
  "Insurance billing",
];

const PROFESSIONAL_FEATURES = [
  "Unlimited patients",
  "2,000 consultations / month",
  "Up to 5 doctors",
  "WhatsApp messaging (2,000 msgs)",
  "Multi-location analytics (planned)",
  "API access (planned)",
  "Custom letterhead (planned)",
  "Priority support with SLA",
];

const ENTERPRISE_FEATURES = [
  "Unlimited patients, users & branches",
  "Everything in Professional",
  "Data warehouse export (BI tools)",
  "Custom contract & invoicing",
  "Dedicated account manager",
  "Custom SLA",
];

function getFeaturesForTier(id: string, fallback: string[]): string[] {
  if (id === "STARTER") return STARTER_FEATURES;
  if (id === "ESSENTIAL") return ESSENTIAL_FEATURES;
  if (id === "PROFESSIONAL") return PROFESSIONAL_FEATURES;
  if (id === "ENTERPRISE") return ENTERPRISE_FEATURES;
  return fallback;
}

const setupStartPrice = formatTierPrice(
  4999,
  FALLBACK_PRICING_CONFIG.currency.symbol,
);

export function PricingSection({ appUrl }: PricingSectionProps) {
  const reduce = useReducedMotion();
  const cardVariant = landingFadeUpVariants(reduce ?? false);
  const gridVariants = landingStaggerContainer(reduce ?? false, 0.06, 0.04);

  const orderedTiers = TIER_ORDER.map((id) =>
    FALLBACK_PRICING_CONFIG.tiers.find((tier) => tier.id === id),
  ).filter((tier): tier is NonNullable<typeof tier> => Boolean(tier));

  return (
    <section
      id="pricing"
      className="r2-section r2-band-card"
      aria-labelledby="r2-pricing-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3 r2-section-marker">
          <span aria-hidden>R2 / 08</span>
          <span aria-hidden className="h-px w-10 bg-current opacity-40" />
          <span className="r2-eyebrow">Plans</span>
        </div>

        <div className="mt-4 grid items-end gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
          <h2
            id="r2-pricing-heading"
            className="max-w-2xl r2-display-sm text-foreground"
          >
            Pricing built for paid <em>clinic rollouts</em>&mdash;not free
            trials.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Software from {FALLBACK_PRICING_CONFIG.currency.symbol}499 / month.
            Guided setup is scoped separately and starts from {setupStartPrice}.
            Annual plans include 2 months free.
          </p>
        </div>

        <motion.div
          className="mt-10 r2-price-grid"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {orderedTiers.map((tier, index) => {
            const isFeatured = index === 2;
            const features = getFeaturesForTier(tier.id, tier.features);

            return (
              <motion.article
                key={tier.id}
                variants={cardVariant}
                className={cn(
                  "r2-price-card",
                  isFeatured && "r2-price-card--featured",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {tier.name}
                  </h3>
                  {isFeatured ? (
                    <span className="r2-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Most chosen
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground min-h-[3rem]">
                  {tier.description}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className="r2-price-amount text-foreground">
                    {formatTierPrice(
                      tier.pricing.monthly,
                      FALLBACK_PRICING_CONFIG.currency.symbol,
                    )}
                  </span>
                  <span className="r2-price-unit">/ month</span>
                </div>

                <ul className="space-y-1.5" role="list">
                  {features.slice(0, isFeatured ? 8 : 6).map((feature) => (
                    <li key={feature} className="r2-price-feature">
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className="mt-auto w-full gap-2"
                  variant={isFeatured ? "primary" : "outline"}
                >
                  <a href={`${appUrl}/onboarding`}>
                    Start setup
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 text-sm text-muted-foreground sm:px-6">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="min-w-0 flex-1">
            Features marked &ldquo;planned&rdquo; in higher tiers are part of
            the rollout roadmap, not promised as live functionality today.
            Overage usage is billed at a per-unit rate at the start of the next
            month.
          </p>
        </div>
      </div>
    </section>
  );
}

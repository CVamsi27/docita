"use client";

import { MessageSquare } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

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
  "Up to 50 consultations/month",
  "Digital prescriptions with PDF",
  "Patient profiles & visit history",
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
  "AI assistant flows (planned)",
];

const PROFESSIONAL_FEATURES = [
  "Unlimited patients",
  "2,000 consultations/month included",
  "Up to 5 doctors",
  "WhatsApp messaging (2,000 msgs/mo)",
  "Broadcast campaigns (planned)",
  "Patient segmentation (planned)",
  "Full EHR / IPD extensions (planned)",
  "Custom branding on reports (planned)",
  "Multi-location analytics (planned)",
  "Bulk data import suite (planned)",
  "API access (planned)",
  "SSO (planned)",
  "Custom letterhead (planned)",
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

const setupStartPrice = formatTierPrice(
  4999,
  FALLBACK_PRICING_CONFIG.currency.symbol,
);

export function PricingSection({ appUrl }: PricingSectionProps) {
  const reduce = useReducedMotion();
  const cardVariant = landingFadeUpVariants(reduce ?? false);
  const gridVariants = landingStaggerContainer(reduce ?? false, 0.07, 0.06);

  const orderedTiers = TIER_ORDER.map((id) =>
    FALLBACK_PRICING_CONFIG.tiers.find((tier) => tier.id === id),
  ).filter(Boolean);

  return (
    <section
      className="landing-pricing-shell landing-section relative overflow-hidden bg-muted/30 landing-section-divider-angle-top"
      id="pricing"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-primary/5 dark:bg-primary/[0.035]"
        aria-hidden
      />
      <div className="ui-page-shell relative z-10">
        <SectionHeading
          align="center"
          size="section"
          eyebrow="Plans"
          title="Pricing built for paid clinic rollouts"
          description="Start with a simple monthly plan, then add hands-on setup when the clinic needs import, templates, WhatsApp, and staff training."
          className="mb-4"
          descriptionClassName="mx-auto max-w-2xl"
        />
        <p className="mb-6 text-center ui-helper-text">
          India-competitive pricing shown in{" "}
          {FALLBACK_PRICING_CONFIG.currency.symbol} (
          {FALLBACK_PRICING_CONFIG.currency.code}). Guided setup starts from{" "}
          {setupStartPrice} and is scoped separately.
        </p>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Billed monthly. Annual plans include 2 months free.
        </p>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {orderedTiers.map((tier, index) => {
            if (!tier) {
              return null;
            }

            const isFeatured = index === 2;
            const features = getFeaturesForTier(tier.id, tier.features);

            return (
              <motion.div key={tier.id} variants={cardVariant}>
              <Card
                className={cn(
                  "relative h-full overflow-hidden border-border/70",
                  isFeatured
                    ? "landing-pricing-featured ring-1 ring-primary/25"
                    : "shadow-sm",
                )}
              >
                {isFeatured ? (
                  <div
                    className="h-[3px] w-full shrink-0 bg-gradient-to-r from-primary via-info to-success"
                    aria-hidden
                  />
                ) : null}
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <CardTitle className="ui-section-title text-[var(--fs-2xl)]">
                      {tier.name}
                    </CardTitle>
                    {isFeatured ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <CardDescription className="min-h-[3rem] text-sm leading-6">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4 flex min-h-[3.5rem] items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[var(--fs-5xl)] font-bold leading-none tracking-normal">
                      {formatTierPrice(
                        tier.pricing.monthly,
                        FALLBACK_PRICING_CONFIG.currency.symbol,
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / month
                    </span>
                  </div>
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
                  <p className="text-xs text-muted-foreground">
                    Features marked as planned are part of the rollout roadmap,
                    not promised as live functionality today.
                  </p>
                  <Button asChild className="w-full gap-2" variant="outline">
                    <a href={`${appUrl}/onboarding`}>
                      <MessageSquare className="h-4 w-4" />
                      Start setup
                    </a>
                  </Button>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

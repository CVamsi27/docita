"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";
import {
  getAvailableModesForTier,
  MODE_TIER_HIGHLIGHTS,
  PLAN_MODE_INFO,
  PLAN_MODES,
  type PlanMode,
  type TierName,
} from "@workspace/types";
import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface PricingSectionProps {
  appUrl: string;
}

const TIER_ORDER: readonly TierName[] = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
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

const ESSENTIAL_FULL_FEATURES = [
  "Unlimited patients",
  "500 consultations / month",
  "1 doctor included",
  "WhatsApp messaging (500 msgs)",
  "Lab tests & inventory",
  "Queue management",
  "Audit logs & compliance",
  "Insurance billing",
];

const PROFESSIONAL_FULL_FEATURES = [
  "Unlimited patients",
  "2,000 consultations / month",
  "Up to 5 doctors",
  "WhatsApp messaging (2,000 msgs)",
  "Multi-location analytics (planned)",
  "API access (planned)",
  "Custom letterhead (planned)",
  "Priority support with SLA",
];

const HOSPITAL_FULL_FEATURES = [
  "Everything in Professional",
  "Up to 25 doctors and 5 branches",
  "75 staff users included",
  "8,000 consultations / month",
  "WhatsApp messaging (6,000 msgs pooled)",
  "Multi-branch analytics dashboards",
  "Dedicated customer success manager",
  "Higher API throughput for integrations",
];

const ENTERPRISE_FULL_FEATURES = [
  "Unlimited patients, users & branches",
  "Everything in Hospital",
  "Data warehouse export (BI tools)",
  "Custom contract & invoicing",
  "Dedicated account manager",
  "Custom SLA",
];

const FULL_FEATURES_BY_TIER: Partial<Record<TierName, string[]>> = {
  STARTER: STARTER_FEATURES,
  ESSENTIAL: ESSENTIAL_FULL_FEATURES,
  PROFESSIONAL: PROFESSIONAL_FULL_FEATURES,
  HOSPITAL: HOSPITAL_FULL_FEATURES,
  ENTERPRISE: ENTERPRISE_FULL_FEATURES,
};

function getFeaturesForTier(id: TierName, mode: PlanMode, fallback: string[]): string[] {
  if (mode === "FULL") {
    return FULL_FEATURES_BY_TIER[id] ?? fallback;
  }
  return MODE_TIER_HIGHLIGHTS[mode]?.[id] ?? FULL_FEATURES_BY_TIER[id] ?? fallback;
}

function applyModeMultiplier(amount: number | "custom", mode: PlanMode): number | "custom" {
  if (amount === "custom") return amount;
  const multiplier = PLAN_MODE_INFO[mode].pricingMultiplier;
  return Math.round(amount * multiplier);
}

const setupStartPrice = formatTierPrice(
  4999,
  FALLBACK_PRICING_CONFIG.currency.symbol,
);

export function PricingSection({ appUrl }: PricingSectionProps) {
  const reduce = useReducedMotion();
  const cardVariant = landingFadeUpVariants(reduce ?? false);
  const gridVariants = landingStaggerContainer(reduce ?? false, 0.06, 0.04);

  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");

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
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Plans</span>
        </div>

        <h2
          id="r2-pricing-heading"
          className="mt-4 max-w-3xl r2-display-sm text-foreground"
        >
          Pricing built for paid <em>clinic rollouts</em>&mdash;not free
          trials.
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Software from {FALLBACK_PRICING_CONFIG.currency.symbol}499 / month.
          Guided setup is scoped separately and starts from {setupStartPrice}.
          Annual plans include 2 months free.
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Pick a <span className="font-medium text-foreground">plan mode</span>{" "}
            then the tier that matches your scale. {PLAN_MODE_INFO[selectedMode].helpText}
          </p>
          <div
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1"
            role="tablist"
            aria-label="Plan mode"
          >
            {PLAN_MODES.map((mode) => {
              const info = PLAN_MODE_INFO[mode];
              const active = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  aria-pressed={active}
                  title={info.helpText}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {info.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          className="mt-10 r2-price-grid"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {orderedTiers.map((tier) => {
            const tierId = tier.id as TierName;
            const supportedModes = getAvailableModesForTier(tierId);
            const effectiveMode: PlanMode = supportedModes.includes(selectedMode)
              ? selectedMode
              : "FULL";
            const isFeatured = tierId === "ESSENTIAL";
            const features = getFeaturesForTier(tierId, effectiveMode, tier.features);
            const adjustedMonthly = applyModeMultiplier(
              tier.pricing.monthly,
              effectiveMode,
            );
            const modeSuffix =
              effectiveMode === "FULL"
                ? null
                : ` · ${PLAN_MODE_INFO[effectiveMode].name}`;
            const modeMismatched =
              effectiveMode !== selectedMode && selectedMode !== "FULL";

            return (
              <motion.article
                key={tier.id}
                variants={cardVariant}
                className={cn(
                  "r2-price-card",
                  isFeatured && "r2-price-card--featured",
                  modeMismatched && "opacity-60",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {tier.name}
                    {modeSuffix ? (
                      <span className="text-muted-foreground">{modeSuffix}</span>
                    ) : null}
                  </h3>
                  {isFeatured ? (
                    <span className="r2-mono text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-primary">
                      Most chosen
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium text-pretty leading-snug text-muted-foreground">
                  {tier.tagline}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground min-h-[3rem]">
                  {tier.description}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className="r2-price-amount text-foreground">
                    {formatTierPrice(
                      adjustedMonthly,
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
                  disabled={modeMismatched}
                >
                  <a
                    href={`${appUrl}/onboarding?tier=${tier.id}&mode=${effectiveMode}`}
                  >
                    {modeMismatched ? "Only on Full" : "Start setup"}
                    {!modeMismatched ? <ArrowRight className="h-4 w-4" /> : null}
                  </a>
                </Button>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground sm:px-6">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="min-w-0 flex-1">
            Features marked &ldquo;planned&rdquo; in higher tiers are part of
            the rollout roadmap, not promised to be live functionality today.
            Overage usage is billed at a per-unit rate at the start of the next
            month.
          </p>
        </div>
      </div>
    </section>
  );
}

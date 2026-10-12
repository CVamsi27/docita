"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { type PlanMode, PUBLISHED_PLAN_LADDER } from "@workspace/types";
import { FALLBACK_PRICING_CONFIG } from "@/lib/landing-data";
import { landingInViewViewport, landingStaggerContainer } from "@/lib/motion-prefs";

import { SETUP_START_PRICE } from "./pricing-data";
import { PricingTierCard } from "./pricing-tier-card";
import { PricingModeToggle } from "./pricing-mode-toggle";
import { PlanPicker } from "./plan-picker";

interface PricingSectionProps {
  appUrl: string;
}

export function PricingSection({ appUrl }: PricingSectionProps) {
  const reduce = useReducedMotion();
  const gridVariants = landingStaggerContainer(reduce ?? false, 0.06, 0.04);

  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const isYearly = billingPeriod === "yearly";

  const orderedTiers = PUBLISHED_PLAN_LADDER
    .map((id) => FALLBACK_PRICING_CONFIG.tiers.find((tier) => tier.id === id))
    .filter((tier): tier is NonNullable<typeof tier> => Boolean(tier));

  return (
    <section id="pricing" className="r2-section r2-section-lead r2-band-card" aria-labelledby="r2-pricing-heading">
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Plans</span>
        </div>
        <h2 id="r2-pricing-heading" className="mt-4 max-w-3xl r2-display-md text-foreground">
          Plans for <em>every practice size</em>.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          From solo practitioners to multi-branch hospitals.
          Software from {FALLBACK_PRICING_CONFIG.currency.symbol}499 / month.
          Guided setup starts from {SETUP_START_PRICE}.
          Annual plans include 2 months free.
        </p>

        <PlanPicker appUrl={appUrl} />

        <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Or browse the full table below. Pick a <span className="font-medium text-foreground">workspace mode</span>{" "}
              then the tier that matches your scale. Pricing is per-facility.
            </p>
            <p className="text-xs text-muted-foreground/70">
              <span className="font-medium text-muted-foreground">Full</span> = complete clinical suite.{' '}
              <span className="font-medium text-muted-foreground">Front Desk</span> = reception & billing only.{' '}
              <span className="font-medium text-muted-foreground">Core</span> = core clinical without WhatsApp & AI.
            </p>
          </div>
          <PricingModeToggle
            selectedMode={selectedMode}
            billingPeriod={billingPeriod}
            onModeChange={setSelectedMode}
            onBillingChange={setBillingPeriod}
          />
        </div>

        <motion.div
          className="mt-10 r2-price-grid"
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {orderedTiers.map((tier) => (
            <PricingTierCard
              key={tier.id}
              tier={tier}
              selectedMode={selectedMode}
              isYearly={isYearly}
              appUrl={appUrl}
            />
          ))}
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 text-sm text-muted-foreground shadow-2xs sm:p-5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success shadow-2xs" aria-hidden>
            <Check className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 leading-relaxed">
            Tier feature lists describe what is available on the plan. Limits
            (consultations, WhatsApp messages, staff users) are tracked live
            in the workspace; overage is billed at the published per-unit
            rate at the start of the next billing month.
          </p>
        </div>
      </div>
    </section>
  );
}

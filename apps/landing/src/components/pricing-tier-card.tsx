"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";
import type { PlanMode } from "@workspace/types";
import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";
import { type PricingTierData, resolvePricingTierCardViewModel } from "./pricing-data";
import { landingFadeUpVariants } from "@/lib/motion-prefs";

interface PricingTierCardProps {
  tier: PricingTierData;
  selectedMode: PlanMode;
  isYearly: boolean;
  appUrl: string;
}

export function PricingTierCard({ tier, selectedMode, isYearly, appUrl }: PricingTierCardProps) {
  const reduce = useReducedMotion();
  const cardVariant = landingFadeUpVariants(reduce ?? false);
  const {
    isFeatured,
    features,
    adjustedPrice,
    listYearly,
    yearlySavings,
    modeSuffix,
    modeMismatched,
    effectiveMode,
  } = resolvePricingTierCardViewModel(tier, selectedMode, isYearly);

  return (
    <motion.article
      variants={cardVariant}
      className={cn("r2-price-card", isFeatured && "r2-price-card--featured", modeMismatched && "opacity-60")}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {tier.name}
          {modeSuffix ? <span className="text-muted-foreground">{modeSuffix}</span> : null}
        </h3>
        {isFeatured ? (
          <span className="r2-mono text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-primary">Most chosen</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-medium text-pretty leading-snug text-muted-foreground">{tier.tagline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground min-h-[3rem]">{tier.description}</p>

      <div className="space-y-1">
        {isYearly && listYearly !== null ? (
          <span className="block text-sm font-medium text-muted-foreground line-through">
            {formatTierPrice(listYearly, FALLBACK_PRICING_CONFIG.currency.symbol)}
          </span>
        ) : null}
        <div className="flex items-baseline gap-2">
          <span className="r2-price-amount text-foreground">
            {formatTierPrice(adjustedPrice, FALLBACK_PRICING_CONFIG.currency.symbol)}
          </span>
          <span className="r2-price-unit">
            {adjustedPrice === "custom" ? null : isYearly ? "/ year" : "/ month"}
          </span>
        </div>
        {yearlySavings !== null ? (
          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold text-success">
            Save {formatTierPrice(yearlySavings, FALLBACK_PRICING_CONFIG.currency.symbol)} a year
          </span>
        ) : isYearly ? (
          <span className="block h-[1.125rem]" aria-hidden />
        ) : null}
      </div>

      <ul className="space-y-1.5" role="list">
        {features.slice(0, isFeatured ? 8 : 6).map((feature) => (
          <li key={feature} className="r2-price-feature">
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-auto w-full gap-2" variant={isFeatured ? "primary" : "outline"} disabled={modeMismatched}>
        <a href={`${appUrl}/onboarding?tier=${tier.id}&mode=${effectiveMode}&billing=${isYearly ? "yearly" : "monthly"}`}>
          {modeMismatched ? "Only on Full" : "Start setup"}
          {!modeMismatched ? <ArrowRight className="h-4 w-4" /> : null}
        </a>
      </Button>
    </motion.article>
  );
}

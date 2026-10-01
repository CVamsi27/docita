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
    effectiveMode,
  } = resolvePricingTierCardViewModel(tier, selectedMode, isYearly);

  return (
    <motion.article
      variants={cardVariant}
      className={cn("r2-price-card", isFeatured && "r2-price-card--featured")}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {tier.name}
        </h3>
        <div className="flex items-center gap-2">
          {effectiveMode !== "FULL" ? (
            <span className="r2-mono rounded-md border border-border/60 bg-muted px-2 py-0.5 text-[var(--fs-2xs)] font-medium text-muted-foreground">
              {effectiveMode === "FRONT_DESK" ? "Front Desk" : "Core"}
            </span>
          ) : null}
          {isFeatured ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold uppercase tracking-wider text-primary">
              Popular
            </span>
          ) : null}
        </div>
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
          <span className="r2-price-save-badge inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold">
            Save {formatTierPrice(yearlySavings, FALLBACK_PRICING_CONFIG.currency.symbol)} a year
          </span>
        ) : isYearly ? (
          <span className="block h-[1.125rem]" aria-hidden />
        ) : null}
      </div>

      <ul className="space-y-1.5" role="list">
        {features.slice(0, isFeatured ? 7 : 5).map((feature) => (
          <li key={feature} className="r2-price-feature">
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-auto w-full gap-2 font-semibold shadow-xs" variant={isFeatured ? "primary" : "outline"}>
        <a href={`${appUrl}/onboarding?tier=${tier.id}&mode=${effectiveMode}&billing=${isYearly ? "yearly" : "monthly"}`}>
          {"Start setup"}
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    </motion.article>
  );
}

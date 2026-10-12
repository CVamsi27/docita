import { describe, expect, it } from "vitest";
import {
  MODE_TIER_HIGHLIGHTS,
  PUBLISHED_PLAN_LADDER,
  SUBSCRIPTION_TRIAL_DAYS,
  TIER_FEATURES,
  TIER_LIMITS,
  type TierName,
} from "@workspace/types";

import {
  type PricingTierData,
  resolvePricingTierCardViewModel,
} from "./pricing-data";

function fixtureTier(id: TierName): PricingTierData {
  return {
    id,
    name: id,
    tagline: "",
    description: "",
    features: ["fallback bullet"],
    pricing: { monthly: 1000, yearly: 10000 },
  };
}

function fullModeBullets(id: TierName): string[] {
  return resolvePricingTierCardViewModel(fixtureTier(id), "FULL", false)
    .features;
}

/** Compares "2,000" and "2000" as the same quantity. */
function numbersIn(text: string): string[] {
  return text
    .replace(/,/g, "")
    .match(/\d+/g)
    ?.map((value) => value.replace(/^0+(?=\d)/, "")) ?? [];
}

describe("landing pricing bullets", () => {
  it("never quotes a number the canonical plan does not sell", () => {
    for (const tierId of PUBLISHED_PLAN_LADDER) {
      const canonicalNumbers = new Set(
        TIER_FEATURES[tierId].flatMap((bullet) => numbersIn(bullet)),
      );
      // The trial length is canonical too, just not part of the tier bullets.
      canonicalNumbers.add(String(SUBSCRIPTION_TRIAL_DAYS));

      for (const bullet of fullModeBullets(tierId)) {
        for (const value of numbersIn(bullet)) {
          expect(
            canonicalNumbers.has(value),
            `${tierId} bullet "${bullet}" quotes ${value}, which the canonical plan does not offer`,
          ).toBe(true);
        }
      }
    }
  });

  it("reads patient, doctor, branch and usage numbers from the canonical limits", () => {
    expect(fullModeBullets("STARTER")).toContain("Up to 50 patients");
    expect(fullModeBullets("STARTER")).toContain(
      "Up to 50 consultations / month",
    );
    expect(fullModeBullets("ESSENTIAL")).toContain("Unlimited patients");
    expect(fullModeBullets("ESSENTIAL")).toContain("1 doctor included");
    expect(fullModeBullets("PROFESSIONAL")).toContain(
      "2,000 consultations / month",
    );
    expect(fullModeBullets("HOSPITAL")).toContain(
      "Up to 25 doctors and 5 branches",
    );
    expect(fullModeBullets("HOSPITAL")).toContain("75 staff users included");
    expect(fullModeBullets("ENTERPRISE")).toContain(
      "Unlimited patients, users & branches",
    );
  });

  it("tracks a limit change without touching the landing copy", () => {
    expect(fullModeBullets("STARTER")).toContain(
      `Up to ${TIER_LIMITS.STARTER.patients} patients`,
    );
  });

  it("uses the canonical mode highlights for non-FULL plans", () => {
    const bullets = resolvePricingTierCardViewModel(
      fixtureTier("ESSENTIAL"),
      "CORE",
      false,
    ).features;

    expect(bullets).toEqual(MODE_TIER_HIGHLIGHTS.CORE?.ESSENTIAL);
  });

  it("falls back to FULL bullets when a plan does not support the selected mode", () => {
    // Starter is FULL-only, so picking Front Desk must not blank the card.
    const model = resolvePricingTierCardViewModel(
      fixtureTier("STARTER"),
      "FRONT_DESK",
      false,
    );

    expect(model.effectiveMode).toBe("FULL");
    expect(model.features).toContain("Up to 50 patients");
  });
});

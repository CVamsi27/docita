import { describe, expect, it } from "vitest";
import { Feature, Tier } from "@workspace/types";
import {
  comparisonTiersForMode,
  isFeatureBlockedInMode,
  isLimitRowBlockedInMode,
} from "./comparison-table-helpers";

describe("comparisonTiersForMode", () => {
  it("shows all five clinical tiers in Full mode", () => {
    expect(comparisonTiersForMode("FULL")).toEqual([
      Tier.STARTER,
      Tier.ESSENTIAL,
      Tier.PROFESSIONAL,
      Tier.HOSPITAL,
      Tier.ENTERPRISE,
    ]);
  });

  it("drops Starter (Full-only) from Front Desk and Core modes", () => {
    const expected = [
      Tier.ESSENTIAL,
      Tier.PROFESSIONAL,
      Tier.HOSPITAL,
      Tier.ENTERPRISE,
    ];
    expect(comparisonTiersForMode("FRONT_DESK")).toEqual(expected);
    expect(comparisonTiersForMode("CORE")).toEqual(expected);
    expect(comparisonTiersForMode("FRONT_DESK")).not.toContain(Tier.STARTER);
  });
});

describe("isFeatureBlockedInMode", () => {
  it("blocks clinical features in Front Desk but not in Full/Core", () => {
    expect(
      isFeatureBlockedInMode(Feature.DIGITAL_PRESCRIPTIONS, "FRONT_DESK"),
    ).toBe(true);
    expect(isFeatureBlockedInMode(Feature.DIGITAL_PRESCRIPTIONS, "FULL")).toBe(
      false,
    );
    expect(isFeatureBlockedInMode(Feature.DIGITAL_PRESCRIPTIONS, "CORE")).toBe(
      false,
    );
  });

  it("blocks WhatsApp in Core but not in Front Desk", () => {
    expect(isFeatureBlockedInMode(Feature.WHATSAPP_MESSAGING, "CORE")).toBe(
      true,
    );
    expect(
      isFeatureBlockedInMode(Feature.WHATSAPP_MESSAGING, "FRONT_DESK"),
    ).toBe(false);
  });
});

describe("isLimitRowBlockedInMode", () => {
  it("blanks Prescriptions in Front Desk, keeps it in Core", () => {
    expect(isLimitRowBlockedInMode("Prescriptions", "FRONT_DESK")).toBe(true);
    expect(isLimitRowBlockedInMode("Prescriptions", "CORE")).toBe(false);
  });

  it("blanks WhatsApp messages in Core, keeps it in Front Desk", () => {
    expect(
      isLimitRowBlockedInMode("WhatsApp messages (incl. / mo)", "CORE"),
    ).toBe(true);
    expect(
      isLimitRowBlockedInMode("WhatsApp messages (incl. / mo)", "FRONT_DESK"),
    ).toBe(false);
  });

  it("never blanks tier-only limits like Patient Limit", () => {
    expect(isLimitRowBlockedInMode("Patient Limit", "FRONT_DESK")).toBe(false);
    expect(isLimitRowBlockedInMode("Patient Limit", "CORE")).toBe(false);
  });
});

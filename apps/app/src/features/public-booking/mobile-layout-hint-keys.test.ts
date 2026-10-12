import { describe, expect, it } from "vitest";
import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import { enMessages, hiMessages } from "@/messages";
import {
  contactContinueHintKey,
  stepDescriptionKey,
  stepHeadingKey,
  visitContinueHintKey,
} from "./public-booking-mobile-layout-helpers";

/** Resolve a dotted key inside the PublicBooking subtree, requiring a string leaf. */
function resolve(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

const STEPS: PublicBookingMobileStep[] = ["visit", "contact", "review"];

/**
 * The mobile-layout helpers are pure functions that return `PublicBooking` keys
 * rather than text. The namespace-registration test cannot follow them, so a
 * renamed catalog entry would surface as a raw `mobileLayout.*` string in the
 * booking funnel's step heading and continue-blocked hint. This covers the seam.
 */
describe("public-booking mobile layout hint keys", () => {
  const en = (enMessages as Record<string, unknown>).PublicBooking;
  const hi = (hiMessages as Record<string, unknown>).PublicBooking;

  function unresolved(key: string | null): string[] {
    if (key === null) return [];
    const problems: string[] = [];
    if (!resolve(en, key)) problems.push(`en missing ${key}`);
    if (!resolve(hi, key)) problems.push(`hi missing ${key}`);
    return problems;
  }

  it("every step heading and description key resolves in both locales", () => {
    const problems = STEPS.flatMap((step) => [
      ...unresolved(stepHeadingKey(step)),
      ...unresolved(stepDescriptionKey(step)),
    ]);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("gives each step a distinct heading and description", () => {
    const headings = STEPS.map((step) => stepHeadingKey(step));
    const descriptions = STEPS.map((step) => stepDescriptionKey(step));
    expect(new Set(headings).size).toBe(STEPS.length);
    expect(new Set(descriptions).size).toBe(STEPS.length);
  });

  it("carries each step id in its own key, so a new step cannot inherit copy", () => {
    for (const step of STEPS) {
      const heading = stepHeadingKey(step) ?? "";
      const description = stepDescriptionKey(step) ?? "";
      expect(heading.endsWith(`.${step}`), `${step} heading key`).toBe(true);
      expect(description.endsWith(`.${step}`), `${step} description key`).toBe(
        true,
      );
    }
  });

  it("reaches every visit-step blocked reason", () => {
    expect(
      unresolved(visitContinueHintKey(true, "site-key", null)),
    ).toEqual([]);
    expect(visitContinueHintKey(true, "site-key", null)).toBeNull();
    expect(unresolved(visitContinueHintKey(false, "site-key", null))).toEqual(
      [],
    );
    // No site key configured means no Turnstile gate, so there is no hint.
    expect(visitContinueHintKey(false, null, null)).toBeNull();
  });

  it("reaches every contact-step blocked reason", () => {
    type ContactArgs = Parameters<typeof contactContinueHintKey>;
    const complete: ContactArgs = [
      true,
      "Asha",
      "Rao",
      "9876543210",
      false,
      null,
    ];
    expect(contactContinueHintKey(...complete)).toBeNull();

    const blocked: ContactArgs[] = [
      [false, "Asha", "Rao", "9876543210", false, null],
      [false, " ", "Rao", "9876543210", false, null],
      [false, "Asha", "Rao", "", false, null],
      [false, "Asha", "Rao", "9876543210", true, null],
    ];
    const keys = blocked.map((args) => contactContinueHintKey(...args));
    expect(new Set(keys).size).toBe(blocked.length);
    const problems = keys.flatMap(unresolved);
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
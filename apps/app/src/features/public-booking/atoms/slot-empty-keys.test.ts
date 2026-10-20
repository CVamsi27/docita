import { describe, expect, it } from "vitest";
import { publicBookingSlotListEmptyReasonSchema } from "@workspace/types";
import { enMessages, hiMessages } from "@/messages";
import { publicBookingSlotEmptyKey } from "./booking-constants";

/** Resolve a dotted key inside the PublicBooking subtree, requiring a string leaf. */
function resolve(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * `publicBookingSlotEmptyKey` returns a key built at runtime, so the
 * namespace-registration test — which resolves literal `t("...")` call sites —
 * cannot see it. A renamed catalog entry or a new empty-reason enum member
 * would therefore ship a raw `slotEmpty.*` string to patients in the Hindi
 * booking funnel. This test covers the dynamic seam instead.
 *
 * The `endsWith(reason)` assertion is the load-bearing one: the `default`
 * branch currently absorbs `undefined` and any future enum member, so a new
 * reason that nobody added a catalog entry for would silently inherit the
 * no-weekly-hours copy. Requiring the key to carry its own reason name fails
 * that case.
 */
describe("publicBookingSlotEmptyKey", () => {
  const en = (enMessages as Record<string, unknown>).PublicBooking;
  const hi = (hiMessages as Record<string, unknown>).PublicBooking;

  it("resolves a catalog string in both locales for every empty reason", () => {
    const missing: string[] = [];
    for (const reason of publicBookingSlotListEmptyReasonSchema.options) {
      const key = publicBookingSlotEmptyKey(reason);
      if (!resolve(en, key)) missing.push(`en missing ${key} (${reason})`);
      if (!resolve(hi, key)) missing.push(`hi missing ${key} (${reason})`);
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("maps each reason to its own catalog key", () => {
    const keys = publicBookingSlotListEmptyReasonSchema.options.map(
      publicBookingSlotEmptyKey,
    );
    const suffixes = keys.map((key) => key.slice(key.lastIndexOf(".") + 1));
    expect(new Set(suffixes).size).toBe(suffixes.length);
    for (const [index, reason] of
      publicBookingSlotListEmptyReasonSchema.options.entries()) {
      expect(suffixes[index], `${reason} must own its catalog key`).toBe(reason);
    }
  });

  it("falls back to the no-weekly-hours copy when no reason is supplied", () => {
    const key = publicBookingSlotEmptyKey(undefined);
    expect(key).toBe(publicBookingSlotEmptyKey("NO_WEEKLY_HOURS"));
    expect(resolve(en, key)).toBeTruthy();
    expect(resolve(hi, key)).toBeTruthy();
  });
});
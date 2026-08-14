import { describe, expect, it } from "vitest";
import { normalizePhoneE164, phoneMatchCandidates } from "./phone-e164.js";

describe("normalizePhoneE164", () => {
  it("prefixes a bare 10-digit Indian number with +91", () => {
    expect(normalizePhoneE164("9812345678")).toBe("+919812345678");
  });

  it("strips punctuation from a 10-digit number before prefixing", () => {
    expect(normalizePhoneE164("(98123) 45678")).toBe("+919812345678");
  });

  it("adds a + to a 12-digit 91-prefixed number", () => {
    expect(normalizePhoneE164("919812345678")).toBe("+919812345678");
  });

  it("is idempotent on an already-normalized E.164 number", () => {
    expect(normalizePhoneE164("+919812345678")).toBe("+919812345678");
    expect(normalizePhoneE164(normalizePhoneE164("9812345678"))).toBe(
      "+919812345678",
    );
  });

  it("preserves an international number that already starts with +", () => {
    expect(normalizePhoneE164("+14155550123")).toBe("+14155550123");
  });

  it("returns empty string for null/empty input", () => {
    expect(normalizePhoneE164("")).toBe("");
    expect(normalizePhoneE164(null)).toBe("");
    expect(normalizePhoneE164(undefined)).toBe("");
    expect(normalizePhoneE164("   ")).toBe("");
  });

  it("falls back to +<digits> for unrecognized lengths without a leading +", () => {
    expect(normalizePhoneE164("12345")).toBe("+12345");
  });
});

describe("phoneMatchCandidates", () => {
  it("includes the input verbatim and every equivalent form for a +91 number", () => {
    const candidates = phoneMatchCandidates("+919812345678");
    expect(candidates).toEqual(
      expect.arrayContaining([
        "+919812345678",
        "919812345678",
        "9812345678",
      ]),
    );
  });

  it("expands a bare 10-digit number to all three representations", () => {
    const candidates = phoneMatchCandidates("9812345678");
    expect(candidates).toEqual(
      expect.arrayContaining(["9812345678", "919812345678", "+919812345678"]),
    );
  });

  it("expands a 91-prefixed number without +", () => {
    const candidates = phoneMatchCandidates("919812345678");
    expect(candidates).toEqual(
      expect.arrayContaining(["919812345678", "+919812345678", "9812345678"]),
    );
  });

  it("returns an empty list for null/empty input", () => {
    expect(phoneMatchCandidates("")).toEqual([]);
    expect(phoneMatchCandidates(null)).toEqual([]);
    expect(phoneMatchCandidates(undefined)).toEqual([]);
  });

  it("does not invent +91 candidates for a non-Indian number", () => {
    const candidates = phoneMatchCandidates("+14155550123");
    expect(candidates).toEqual(expect.arrayContaining(["+14155550123"]));
    // The contract: we only synthesize India-shaped equivalents (+91… / 91… /
    // bare 10-digit) when the input looks like an Indian number. A US number
    // must not get a fabricated +91 candidate.
    expect(candidates.some((c) => c.startsWith("+91"))).toBe(false);
    expect(candidates.some((c) => c.startsWith("91") && c.length === 12)).toBe(
      false,
    );
  });
});

import { describe, it, expect } from "vitest";
import { AddOnType } from "./interfaces";
import { normalizeAddOn, parseAddOnList } from "./repository-add-on-helpers";

describe("normalizeAddOn", () => {
  it("returns null for non-record input", () => {
    expect(normalizeAddOn(null)).toBeNull();
    expect(normalizeAddOn(undefined)).toBeNull();
    expect(normalizeAddOn("string")).toBeNull();
    expect(normalizeAddOn(42)).toBeNull();
  });

  it("returns null when type is missing", () => {
    expect(normalizeAddOn({ status: "active" })).toBeNull();
  });

  it("returns null when status is missing", () => {
    expect(normalizeAddOn({ type: "WHATSAPP" })).toBeNull();
  });

  it("returns null for invalid type", () => {
    expect(normalizeAddOn({ type: "INVALID", status: "active" })).toBeNull();
  });

  it("returns null for invalid status", () => {
    expect(normalizeAddOn({ type: "WHATSAPP", status: "invalid" })).toBeNull();
  });

  it("normalizes a valid WhatsApp add-on", () => {
    const result = normalizeAddOn({
      type: "WHATSAPP",
      status: "active",
      baseQuota: 1000,
      usedQuota: 500,
      overageRate: 0.5,
      billingCycle: "yearly",
    });
    expect(result).toEqual({
      type: AddOnType.WHATSAPP,
      status: "active",
      baseQuota: 1000,
      usedQuota: 500,
      overageRate: 0.5,
      billingCycle: "yearly",
      expiresAt: undefined,
    });
  });

  it("normalizes a valid Intelligence add-on", () => {
    const result = normalizeAddOn({
      type: "INTELLIGENCE",
      status: "inactive",
    });
    expect(result).toEqual({
      type: AddOnType.INTELLIGENCE,
      status: "inactive",
      baseQuota: 0,
      usedQuota: 0,
      overageRate: 0,
      billingCycle: "monthly",
      expiresAt: undefined,
    });
  });

  it("defaults billingCycle to monthly for non-yearly values", () => {
    const result = normalizeAddOn({
      type: "WHATSAPP",
      status: "active",
      billingCycle: "custom",
    });
    expect(result?.billingCycle).toBe("monthly");
  });

  it("parses expiresAt date", () => {
    const result = normalizeAddOn({
      type: "WHATSAPP",
      status: "active",
      expiresAt: "2026-12-31",
    });
    expect(result?.expiresAt).toBeInstanceOf(Date);
  });
});

describe("parseAddOnList", () => {
  it("returns empty array for non-array input", () => {
    expect(parseAddOnList(null)).toEqual([]);
    expect(parseAddOnList(undefined)).toEqual([]);
    expect(parseAddOnList("string")).toEqual([]);
  });

  it("parses valid add-ons", () => {
    const result = parseAddOnList([
      { type: "WHATSAPP", status: "active" },
      { type: "INTELLIGENCE", status: "inactive" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe(AddOnType.WHATSAPP);
    expect(result[1].type).toBe(AddOnType.INTELLIGENCE);
  });

  it("filters out invalid add-ons", () => {
    const result = parseAddOnList([
      { type: "WHATSAPP", status: "active" },
      { type: "INVALID" },
      null,
      { type: "INTELLIGENCE", status: "active" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty array", () => {
    expect(parseAddOnList([])).toEqual([]);
  });
});

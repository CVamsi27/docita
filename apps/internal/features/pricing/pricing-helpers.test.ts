import { describe, expect, it } from "vitest";
import {
  buildPageStatus,
  clinicToOption,
  DEFAULT_OFFER_FORM,
  findClinicName,
  OFFER_TEMPLATES,
  PRICING_LOAD_ERROR_FALLBACK,
} from "./pricing-helpers";

describe("DEFAULT_OFFER_FORM", () => {
  it("uses 100% discount and 3-month duration as the default", () => {
    expect(DEFAULT_OFFER_FORM).toEqual({
      clinicId: "",
      title: "",
      description: "",
      percentOff: 100,
      durationMonths: 3,
      validUntil: "",
      notes: "",
    });
  });
});

describe("OFFER_TEMPLATES", () => {
  it("contains the three launch templates in order", () => {
    expect(OFFER_TEMPLATES.map((t) => t.key)).toEqual([
      "three_months_free",
      "half_year_discount",
      "annual_soft_launch",
    ]);
  });

  it("has matching percentOff and durationMonths on every template", () => {
    for (const template of OFFER_TEMPLATES) {
      expect(template.percentOff).toBeGreaterThan(0);
      expect(template.percentOff).toBeLessThanOrEqual(100);
      expect(template.durationMonths).toBeGreaterThan(0);
      expect(template.title).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.notes).toBeTruthy();
    }
  });
});

describe("clinicToOption", () => {
  it("projects a clinic to { id, name }", () => {
    expect(
      clinicToOption({ id: "clinic_1", name: "Greenleaf Medical" }),
    ).toEqual({ id: "clinic_1", name: "Greenleaf Medical" });
  });
});

describe("findClinicName", () => {
  const options = [
    { id: "clinic_1", name: "Greenleaf" },
    { id: "clinic_2", name: "Bluebell" },
  ];

  it("returns the matching name when found", () => {
    expect(findClinicName("clinic_2", options)).toBe("Bluebell");
  });

  it("returns the id as a fallback when not found", () => {
    expect(findClinicName("clinic_unknown", options)).toBe("clinic_unknown");
  });

  it("returns the id as a fallback when options is empty", () => {
    expect(findClinicName("clinic_1", [])).toBe("clinic_1");
  });
});

describe("buildPageStatus", () => {
  it("returns 'loading' when loading is true (overrides error)", () => {
    expect(buildPageStatus(true, new Error("boom"))).toBe("loading");
  });

  it("returns 'error' when error is present and not loading", () => {
    expect(buildPageStatus(false, new Error("boom"))).toBe("error");
  });

  it("returns 'error' for any truthy non-loading error", () => {
    expect(buildPageStatus(false, "string-error")).toBe("error");
    expect(buildPageStatus(false, { message: "obj" })).toBe("error");
  });

  it("returns 'success' when not loading and no error", () => {
    expect(buildPageStatus(false, null)).toBe("success");
    expect(buildPageStatus(false, undefined)).toBe("success");
  });
});

describe("PRICING_LOAD_ERROR_FALLBACK", () => {
  it("is a non-empty human-readable string", () => {
    expect(typeof PRICING_LOAD_ERROR_FALLBACK).toBe("string");
    expect(PRICING_LOAD_ERROR_FALLBACK.length).toBeGreaterThan(0);
  });
});

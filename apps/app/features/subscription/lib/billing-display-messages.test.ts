import { describe, expect, it } from "vitest";

import { formatInvoiceDescriptionForDisplay } from "./billing-display-messages";

describe("formatInvoiceDescriptionForDisplay", () => {
  it("returns a default label for empty descriptions", () => {
    expect(formatInvoiceDescriptionForDisplay(null)).toEqual({
      label: "Subscription payment",
    });
    expect(formatInvoiceDescriptionForDisplay("   ")).toEqual({
      label: "Subscription payment",
    });
  });

  it("returns the raw string when there is no internal prefix", () => {
    expect(formatInvoiceDescriptionForDisplay("Annual renewal")).toEqual({
      label: "Annual renewal",
    });
  });

  it("maps COMMERCIAL_DISCOUNT internal category", () => {
    expect(
      formatInvoiceDescriptionForDisplay(
        "[INTERNAL:COMMERCIAL_DISCOUNT] Q1 promo",
      ),
    ).toEqual({
      label: "Commercial discount",
      detail: "Q1 promo",
    });
  });

  it("maps known INTERNAL categories to human labels and keeps detail", () => {
    expect(
      formatInvoiceDescriptionForDisplay(
        "[INTERNAL:GUIDED_SETUP] Clinic onboarding package",
      ),
    ).toEqual({
      label: "Guided setup",
      detail: "Clinic onboarding package",
    });
    expect(
      formatInvoiceDescriptionForDisplay("[INTERNAL:DATA_MIGRATION]"),
    ).toEqual({
      label: "Data migration",
    });
  });

  it("humanizes unknown internal category keys", () => {
    expect(
      formatInvoiceDescriptionForDisplay(
        "[INTERNAL:CUSTOM_WORK] Extra scope",
      ),
    ).toEqual({
      label: "Custom Work",
      detail: "Extra scope",
    });
  });
});

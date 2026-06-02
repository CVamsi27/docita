import { describe, expect, it } from "vitest";
import { getClinicGstin } from "./clinic-settings.js";

describe("getClinicGstin", () => {
  it("prefers the canonical settings GSTIN", () => {
    expect(
      getClinicGstin({
        gstin: " 29ABCDE1234F1Z5 ",
        taxSettings: { registrationId: "legacy-value" },
      }),
    ).toBe("29ABCDE1234F1Z5");
  });

  it("reads the legacy tax registration fallback", () => {
    expect(
      getClinicGstin({ taxSettings: { registrationId: " 27ABCDE1234F1Z6 " } }),
    ).toBe("27ABCDE1234F1Z6");
  });

  it("returns undefined for invalid settings", () => {
    expect(getClinicGstin(null)).toBeUndefined();
    expect(getClinicGstin({ gstin: " " })).toBeUndefined();
  });
});

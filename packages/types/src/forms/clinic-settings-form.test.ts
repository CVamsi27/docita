import { describe, expect, it } from "vitest";
import { clinicSettingsFormSchema } from "./clinic-settings-form";

const baseValid = {
  name: "Sunrise Clinic",
  address: "12 Main St",
  phone: "+919876543210",
};

describe("clinicSettingsFormSchema", () => {
  it("accepts the minimum required fields", () => {
    expect(clinicSettingsFormSchema.parse(baseValid)).toMatchObject(baseValid);
  });

  it("accepts an empty maps link (maps link is optional)", () => {
    const parsed = clinicSettingsFormSchema.parse({ ...baseValid, mapsLink: "" });
    expect(parsed.mapsLink).toBe("");
  });

  it("accepts a valid Google Maps URL", () => {
    const parsed = clinicSettingsFormSchema.parse({
      ...baseValid,
      mapsLink: "https://maps.google.com/?q=test",
    });
    expect(parsed.mapsLink).toBe("https://maps.google.com/?q=test");
  });

  it("rejects a non-URL maps link", () => {
    const result = clinicSettingsFormSchema.safeParse({
      ...baseValid,
      mapsLink: "not a url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("mapsLink")),
      ).toBe(true);
    }
  });

  it("rejects a phone that does not match the phone schema", () => {
    const result = clinicSettingsFormSchema.safeParse({
      ...baseValid,
      phone: "abc",
    });
    expect(result.success).toBe(false);
  });
});

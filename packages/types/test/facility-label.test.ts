import { describe, expect, it } from "vitest";
import { facilityTypeSchema, type FacilityTypeType } from "../src/shared/users/roles";
import { updateClinicSettingsRequestSchema } from "../src/contracts/clinics";
import { clinicResponseSchema } from "../src/contracts/clinics";
import { clinicSettingsFormSchema } from "../src/forms/clinic-settings-form";

/**
 * The facility-label field has the same meaning across three schemas but
 * uses two different field names:
 *   - updateClinicSettingsRequestSchema: `facilityLabel` (write side)
 *   - clinicResponseSchema:            `facilityType`  (read side)
 *   - clinicSettingsFormSchema:        `facilityLabel` (form side)
 *
 * The UI reads from the response and writes via the settings request, so
 * a name mismatch silently fails. These specs lock in the contract so
 * any future rename has to be done in three places and is caught here.
 */
describe("facilityLabel <-> facilityType contract", () => {
  const labelValues: FacilityTypeType[] = facilityTypeSchema.options;

  it("every value in the enum is accepted by both schemas", () => {
    for (const value of labelValues) {
      const write = updateClinicSettingsRequestSchema.safeParse({
        facilityLabel: value,
      });
      expect(write.success).toBe(true);

      const form = clinicSettingsFormSchema.safeParse({
        name: "Test",
        address: "1 Main",
        phone: "+919876543210",
        facilityLabel: value,
      });
      expect(form.success).toBe(true);

      const read = clinicResponseSchema.safeParse({
        id: "c-1",
        facilityType: value,
      });
      expect(read.success).toBe(true);
    }
  });

  it("rejects a label that is not in the enum on the write side", () => {
    const result = updateClinicSettingsRequestSchema.safeParse({
      facilityLabel: "LAB" as never,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a type that is not in the enum on the read side", () => {
    const result = clinicResponseSchema.safeParse({
      id: "c-1",
      facilityType: "LAB" as never,
    });
    expect(result.success).toBe(false);
  });

  it("both sides agree on the canonical values: CLINIC and HOSPITAL", () => {
    expect(facilityTypeSchema.options).toEqual(["CLINIC", "HOSPITAL"]);
  });
});

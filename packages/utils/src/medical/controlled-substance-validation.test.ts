import { describe, expect, it } from "vitest";
import {
  checkControlledSubstances,
  validateControlledSubstances,
} from "./controlled-substance-validation.js";

describe("checkControlledSubstances", () => {
  it("returns no matches for ordinary medications", () => {
    const result = checkControlledSubstances([
      { name: "Paracetamol" },
      { name: "Amoxicillin" },
    ]);
    expect(result.hasControlledSubstance).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags an NDPS narcotic and labels its schedule", () => {
    const result = checkControlledSubstances([{ name: "Tramadol 50mg" }]);
    expect(result.hasControlledSubstance).toBe(true);
    expect(result.matches[0]).toMatchObject({
      medication: "Tramadol 50mg",
      matchedTerm: "tramadol",
      schedule: "NDPS_NARCOTIC",
    });
    expect(result.warnings[0]).toContain("NDPS narcotic");
  });

  it("flags Schedule X and psychotropic drugs case-insensitively", () => {
    const result = checkControlledSubstances([
      { name: "PHENOBARBITAL" },
      { name: "alprazolam" },
    ]);
    expect(result.matches.map((m) => m.schedule)).toEqual([
      "SCHEDULE_X",
      "PSYCHOTROPIC",
    ]);
  });

  it("matches whole words only, not substrings of unrelated tokens", () => {
    // "codeinephobia" must not match "codeine"
    const result = checkControlledSubstances([{ name: "codeinephobia rub" }]);
    expect(result.hasControlledSubstance).toBe(false);
  });

  it("ignores medications without a name", () => {
    const result = checkControlledSubstances([
      { name: "" },
      { name: "Morphine" },
    ]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchedTerm).toBe("morphine");
  });
});

describe("validateControlledSubstances", () => {
  it("does not block in-person prescriptions even for controlled drugs", () => {
    const result = validateControlledSubstances([{ name: "Morphine" }], {
      isTeleconsultation: false,
    });
    expect(result.isBlocked).toBe(false);
    expect(result.check.hasControlledSubstance).toBe(true);
    expect(result.code).toBeUndefined();
  });

  it("blocks controlled drugs during a teleconsultation per NMC guidelines", () => {
    const result = validateControlledSubstances(
      [{ name: "Paracetamol" }, { name: "Fentanyl patch" }],
      { isTeleconsultation: true },
    );
    expect(result.isBlocked).toBe(true);
    expect(result.code).toBe("CONTROLLED_SUBSTANCE_TELEMEDICINE_BLOCKED");
    expect(result.message).toContain("Fentanyl patch");
  });

  it("allows ordinary teleconsultation prescriptions", () => {
    const result = validateControlledSubstances([{ name: "Cetirizine" }], {
      isTeleconsultation: true,
    });
    expect(result.isBlocked).toBe(false);
  });
});

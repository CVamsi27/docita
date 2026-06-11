import { describe, expect, it } from "vitest";
import {
  containsPatientIdentifier,
  redactPatientIdentifiers,
} from "./phi-redaction.js";

describe("redactPatientIdentifiers", () => {
  it("redacts emails", () => {
    expect(redactPatientIdentifiers("contact asha@example.com please")).toBe(
      "contact [EMAIL] please",
    );
  });

  it("redacts Indian mobile numbers with and without prefix", () => {
    expect(redactPatientIdentifiers("call 9876543210")).toContain("[PHONE]");
    expect(redactPatientIdentifiers("call +91 9876543210")).toContain(
      "[PHONE]",
    );
  });

  it("redacts Aadhaar and ABHA numbers", () => {
    expect(redactPatientIdentifiers("UID 1234 5678 9012")).toContain(
      "[AADHAAR]",
    );
    expect(redactPatientIdentifiers("ABHA 12-3456-7890-1234")).toContain(
      "[ABHA]",
    );
  });

  it("redacts ABHA addresses", () => {
    expect(redactPatientIdentifiers("phr asha.verma@abdm here")).toContain(
      "[ABHA_ADDRESS]",
    );
  });

  it("redacts long numeric IDs (MRN)", () => {
    expect(redactPatientIdentifiers("MRN 9000123 admitted")).toContain("[ID]");
  });

  it("keeps ordinary clinical text and short numbers intact", () => {
    const text = "BP 120/80, paracetamol 500mg twice daily for 5 days";
    expect(redactPatientIdentifiers(text)).toBe(text);
  });

  it("containsPatientIdentifier flags presence", () => {
    expect(containsPatientIdentifier("asha@example.com")).toBe(true);
    expect(containsPatientIdentifier("fever and cough")).toBe(false);
  });
});

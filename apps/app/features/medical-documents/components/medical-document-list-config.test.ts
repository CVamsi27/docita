import { describe, expect, it } from "vitest";
import {
  MEDICAL_DOCUMENT_TYPE_OPTIONS,
  medicalDocumentTypeLabel,
} from "./medical-document-list-config";

describe("medicalDocumentTypeLabel", () => {
  it("maps every known type to a human label", () => {
    expect(medicalDocumentTypeLabel("MEDICAL_CERTIFICATE")).toBe(
      "Medical Certificate",
    );
    expect(medicalDocumentTypeLabel("DISCHARGE_SUMMARY")).toBe(
      "Discharge Summary",
    );
  });

  it("covers all options without falling through", () => {
    for (const type of MEDICAL_DOCUMENT_TYPE_OPTIONS) {
      expect(medicalDocumentTypeLabel(type)).not.toBe(type);
    }
  });

  it("returns the raw value for an unknown type", () => {
    expect(medicalDocumentTypeLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
  });
});

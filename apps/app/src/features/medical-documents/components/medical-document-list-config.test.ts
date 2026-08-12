import { describe, expect, it } from "vitest";
import { MEDICAL_DOCUMENT_TYPE_OPTIONS } from "./medical-document-list-config";
import { medicalDocumentTypeLabel } from "@/features/medical-documents/lib/medical-document-type-label";
import { createEnMessageResolver } from "@/test-utils/en-message-resolver";

const t = createEnMessageResolver("MedicalDocuments");

describe("medicalDocumentTypeLabel", () => {
  it("maps every known type to a human label", () => {
    expect(medicalDocumentTypeLabel("MEDICAL_CERTIFICATE", t)).toBe(
      "Medical Certificate",
    );
    expect(medicalDocumentTypeLabel("DISCHARGE_SUMMARY", t)).toBe(
      "Discharge Summary",
    );
    expect(medicalDocumentTypeLabel("OTHER", t)).toBe("Others / custom");
  });

  it("covers all options without falling through", () => {
    for (const type of MEDICAL_DOCUMENT_TYPE_OPTIONS) {
      expect(medicalDocumentTypeLabel(type, t)).not.toBe(type);
    }
  });

  it("returns the raw value for an unknown type", () => {
    expect(medicalDocumentTypeLabel("SOMETHING_ELSE", t)).toBe("SOMETHING_ELSE");
  });
});
